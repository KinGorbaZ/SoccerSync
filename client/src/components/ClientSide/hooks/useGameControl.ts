import { useRef, useCallback, useEffect } from 'react';
import { 
    DeviceRole, 
    Device, 
    Message, 
    GameState, 
    GameSettings,
    GameStateCommand
} from '../../../types';
import { getRandomColor } from '../util/helpers';

interface UseGameControlProps {
    wsRef: React.RefObject<WebSocket | null>;
    deviceRole: DeviceRole;
    username: string;
    gameState: GameState;
    setGameState: (state: GameState) => void;
    gameSettings: GameSettings;
    handleSetColor: (deviceId: string | undefined, color: string | undefined) => void;
    connectedDevices: Device[];
}

export const useGameControl = ({
    wsRef,
    deviceRole,
    username,
    gameState,
    setGameState,
    gameSettings,
    handleSetColor,
    connectedDevices,
}: UseGameControlProps) => {
    const gameIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const lastIndexRef = useRef<number>(-1);

    const selectNextDevice = useCallback((clientDevices: Device[]) => {
        if (gameSettings.pattern === 'random') {
            return Math.floor(Math.random() * clientDevices.length);
        }
        return (lastIndexRef.current + 1) % clientDevices.length;
    }, [gameSettings.pattern]);

    const activateNextDevice = useCallback(() => {
        const clientDevices = connectedDevices.filter(d => d.role === 'client');
        if (clientDevices.length === 0) {
            console.log('No client devices available');
            return;
        }
    
        if (gameSettings.pattern === 'simultaneous') {
            // For simultaneous mode, all devices get the same new color
            const colorIndex = (lastIndexRef.current + 1) % gameSettings.colors.length;
            lastIndexRef.current = colorIndex;
            const color = gameSettings.colors[colorIndex];
            
            console.log(`Activating ALL devices with color ${color}`);
            // No need to set black first in simultaneous mode
            clientDevices.forEach(device => {
                handleSetColor(device.id, color);
            });
        } else {
            // Sequential or Random mode - activate single device
            // First, set all screens to black
            handleSetColor(undefined, undefined);
    
            const nextIndex = selectNextDevice(clientDevices);
            lastIndexRef.current = nextIndex;
            const targetDevice = clientDevices[nextIndex];
            const colorIndex = Math.floor(Math.random() * gameSettings.colors.length);
            const color = gameSettings.colors[colorIndex];
            
            console.log(`Activating device ${targetDevice.id} with color ${color}`);
            handleSetColor(targetDevice.id, color);
        }
    }, [connectedDevices, handleSetColor, selectNextDevice, gameSettings]);
    
    // Cleanup function to clear interval
    const cleanupInterval = useCallback(() => {
        if (gameIntervalRef.current) {
            console.log('Clearing game interval');
            clearInterval(gameIntervalRef.current);
            gameIntervalRef.current = null;
        }
    }, []);

    // Effect to handle interval based on game state
    useEffect(() => {
        if (gameState === 'running' && deviceRole === 'master') {
            console.log('Setting up game interval');
            
            // Clear any existing interval
            cleanupInterval();
            
            // Set up new interval
            gameIntervalRef.current = setInterval(() => {
                console.log('Interval tick - activating next device');
                activateNextDevice();
            }, gameSettings.intervalSpeed);

            // Initial activation
            activateNextDevice();
        } else {
            cleanupInterval();
        }

        // Cleanup on unmount or when dependencies change
        return cleanupInterval;
    }, [gameState, deviceRole, gameSettings.intervalSpeed, activateNextDevice, cleanupInterval]);

    const handleStartGame = useCallback(() => {
        if (wsRef.current && deviceRole === 'master') {
            console.log('Starting game...');
            
            const command: GameStateCommand = {
                action: 'gameState',
                gameState: 'running',
                settings: gameSettings,
                timestamp: Date.now()
            };
            
            const message: Message = {
                type: 'command',
                content: command,
                sender: username,
                timestamp: Date.now()
            };
            
            wsRef.current.send(JSON.stringify(message));
            setGameState('running');
        }
    }, [deviceRole, gameSettings, setGameState, username, wsRef]);

    const handlePauseGame = useCallback(() => {
        if (wsRef.current && deviceRole === 'master') {
            console.log('Pausing game...');
            
            const command: GameStateCommand = {
                action: 'gameState',
                gameState: 'paused',
                timestamp: Date.now()
            };
            
            const message: Message = {
                type: 'command',
                content: command,
                sender: username,
                timestamp: Date.now()
            };
            
            wsRef.current.send(JSON.stringify(message));
            setGameState('paused');
            
            handleSetColor(undefined, undefined);
            lastIndexRef.current = -1;
        }
    }, [deviceRole, handleSetColor, setGameState, username, wsRef]);

    // Cleanup on unmount
    useEffect(() => {
        return cleanupInterval;
    }, [cleanupInterval]);

    return {
        handleStartGame,
        handlePauseGame
    };
};

export default useGameControl;