import { useState, useEffect, useRef, useCallback } from 'react';
import { 
    DeviceRole, 
    Device, 
    Message, 
    ConnectionStatus, 
    GameState
} from '../../../types';
import { generateUsername } from '../util/helpers';

interface UseWebSocketProps {
    username: string;
    setUsername: (username: string) => void;
    deviceRole: DeviceRole;
    setDeviceRole: (role: DeviceRole) => void;
    setDeviceId: (id: string) => void;
    setScreenColor: (color: string | null) => void;
    setGameState: (state: GameState) => void;  // Make sure this is included
}

export const useWebSocket = ({
    username,
    setUsername,
    deviceRole,
    setDeviceRole,
    setDeviceId,
    setScreenColor,
    setGameState
}: UseWebSocketProps) => {
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
    const [hasJoined, setHasJoined] = useState(false);
    const [connectedDevices, setConnectedDevices] = useState<Device[]>([]);
    
    const wsRef = useRef<WebSocket | null>(null);
    const cleanupRef = useRef<(() => void) | null>(null);

    const cleanup = useCallback(() => {
        if (cleanupRef.current) {
            cleanupRef.current();
        }
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        setConnectionStatus(ConnectionStatus.DISCONNECTED);
    }, []);

    const handleJoin = useCallback(async (selectedRole: DeviceRole) => {
        if (!selectedRole) return;

        cleanup();
        setConnectionStatus(ConnectionStatus.CONNECTING);

        const ws = new WebSocket('ws://localhost:3000');
        wsRef.current = ws;

        return new Promise<void>((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                cleanup();
                reject(new Error('Connection timeout'));
            }, 5000);

            ws.onopen = () => {
                clearTimeout(timeoutId);
                setConnectionStatus(ConnectionStatus.CONNECTED);
                
                // Generate username and send join message
                const autoUsername = generateUsername(selectedRole);
                setUsername(autoUsername);
                
                const joinMessage: Message = {
                    type: 'system',
                    content: `${autoUsername} has joined as ${selectedRole}`,
                    sender: autoUsername,
                    timestamp: Date.now()
                };

                ws.send(JSON.stringify({
                    ...joinMessage,
                    role: selectedRole
                }));

                setDeviceRole(selectedRole);
                setHasJoined(true);
                resolve();
            };

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data) as Message;
                
                if (data.type === 'error') {
                    cleanup();
                    alert(typeof data.content === 'string' ? data.content : 'An error occurred');
                    setHasJoined(false);
                    setDeviceRole(undefined);
                    return;
                }

                if (data.type === 'deviceUpdate' && 
                    typeof data.content === 'object' && 
                    'id' in data.content) {
                    setDeviceId(data.content.id);
                    return;
                }
                
                if (data.type === 'deviceList' && Array.isArray(data.content)) {
                    setConnectedDevices(data.content);
                    return;
                }

                if (data.type === 'command' && 
                    typeof data.content === 'object' && 
                    'action' in data.content) {
                    
                    switch (data.content.action) {
                        case 'color':
                            setScreenColor(data.content.color || null);
                            break;
                        case 'gameState':
                            if ('gameState' in data.content) {
                                setGameState(data.content.gameState);
                            }
                            break;
                    }
                }
            };

            ws.onclose = () => {
                cleanup();
                if (hasJoined) {
                    setHasJoined(false);
                    setDeviceRole(undefined);
                }
            };

            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                cleanup();
                reject(error);
            };

            // Store cleanup function
            cleanupRef.current = () => {
                clearTimeout(timeoutId);
                if (ws.readyState === WebSocket.OPEN) {
                    ws.close();
                }
            };
        });
    }, [cleanup, setUsername, setDeviceRole, setDeviceId, setScreenColor, setGameState, hasJoined]);

    const handleSetColor = useCallback((deviceId: string | undefined, color: string | undefined) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            const message: Message = {
                type: 'command',
                content: {
                    action: 'color',
                    targetId: deviceId,
                    color: color,
                    timestamp: Date.now()
                },
                sender: username,
                timestamp: Date.now()
            };
            wsRef.current.send(JSON.stringify(message));
        }
    }, [username]);

    const handleRenameDevice = useCallback((deviceId: string, newName: string) => {
        if (wsRef.current?.readyState === WebSocket.OPEN && newName.trim()) {
            const message: Message = {
                type: 'command',
                content: {
                    action: 'rename',
                    deviceId,
                    name: newName,
                    timestamp: Date.now()
                },
                sender: username,
                timestamp: Date.now()
            };
            wsRef.current.send(JSON.stringify(message));
        }
    }, [username]);

    // Cleanup on unmount
    useEffect(() => {
        return cleanup;
    }, [cleanup]);

    return {
        connectionStatus,
        hasJoined,
        connectedDevices,
        handleJoin,
        handleSetColor,
        handleRenameDevice,
        wsRef
    };
};