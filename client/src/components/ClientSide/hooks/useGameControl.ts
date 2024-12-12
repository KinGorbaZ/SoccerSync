import { useCallback, useRef, useEffect } from 'react';
import { GameState, GameSettings, Device } from '../../../types';

interface UseGameControlProps {
    wsRef: React.RefObject<WebSocket>;
    deviceRole: 'master' | 'client' | undefined;
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
    connectedDevices
}: UseGameControlProps) => {
    const gameLoopRef = useRef<NodeJS.Timeout | null>(null);

    const clearGameLoop = useCallback(() => {
        if (gameLoopRef.current) {
            clearInterval(gameLoopRef.current);
            gameLoopRef.current = null;
        }
    }, []);

    const startGameLoop = useCallback(() => {
        // Only start interval for non-hit patterns
        if (gameSettings.pattern !== 'hit') {
            clearGameLoop();
            
            if (gameSettings.pattern === 'simultaneous') {
                // Handle simultaneous pattern
                const clientDevices = connectedDevices.filter(d => d.role === 'client');
                clientDevices.forEach(device => {
                    const randomColor = gameSettings.colors[Math.floor(Math.random() * gameSettings.colors.length)];
                    handleSetColor(device.id, randomColor);
                });
            } else {
                // Handle random and sequential patterns
                gameLoopRef.current = setInterval(() => {
                    const clientDevices = connectedDevices.filter(d => d.role === 'client');
                    if (clientDevices.length === 0) return;

                    let nextDevice;
                    if (gameSettings.pattern === 'random') {
                        nextDevice = clientDevices[Math.floor(Math.random() * clientDevices.length)];
                    } else {
                        // Sequential pattern
                        const currentIndex = clientDevices.findIndex(d => d.currentColor !== 'black');
                        nextDevice = clientDevices[(currentIndex + 1) % clientDevices.length];
                    }

                    const randomColor = gameSettings.colors[Math.floor(Math.random() * gameSettings.colors.length)];
                    
                    // Turn all devices black first
                    handleSetColor(undefined, 'black');
                    // Then activate the selected device
                    handleSetColor(nextDevice.id, randomColor);
                }, gameSettings.intervalSpeed);
            }
        }
    }, [gameSettings, connectedDevices, handleSetColor, clearGameLoop]);

    const handleStartGame = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            const message = {
                type: 'command',
                content: {
                    action: 'gameState',
                    gameState: 'running',
                    settings: gameSettings,
                    timestamp: Date.now()
                },
                sender: username
            };
            wsRef.current.send(JSON.stringify(message));
        }
    }, [wsRef, gameSettings, username]);

    const handlePauseGame = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            const message = {
                type: 'command',
                content: {
                    action: 'gameState',
                    gameState: 'paused',
                    timestamp: Date.now()
                },
                sender: username
            };
            wsRef.current.send(JSON.stringify(message));
        }
    }, [wsRef, username]);

    useEffect(() => {
        if (gameState === 'running') {
            startGameLoop();
        } else {
            clearGameLoop();
            if (gameState === 'idle') {
                handleSetColor(undefined, 'black');
            }
        }
    }, [gameState, startGameLoop, clearGameLoop, handleSetColor]);

    useEffect(() => {
        return () => {
            clearGameLoop();
        };
    }, [clearGameLoop]);

    return {
        handleStartGame,
        handlePauseGame
    };
};