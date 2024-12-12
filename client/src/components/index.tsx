// src/components/index.tsx
import React, { useCallback, useState } from 'react';
import { DeviceRole, GameState, GameSettings } from '../types';
// Fix these import paths
import { useWebSocket } from './ClientSide/hooks/useWebSocket';
import { useGameControl } from './ClientSide/hooks/useGameControl';
import { DeviceList } from './ClientSide/components/DeviceList';
import { ConnectionForm } from './ClientSide/components/ConnectionForm';
import { GameControls } from './ClientSide/components/GameControl';
import { ColorControls } from './ClientSide/components/ColorControl';
import { ClientScreen } from './ClientSide/components/ClientScreen';

const ClientSide = () => {
    const [username, setUsername] = useState('');
    const [deviceRole, setDeviceRole] = useState<DeviceRole>();
    const [deviceId, setDeviceId] = useState<string>('');
    const [screenColor, setScreenColor] = useState<string | null>(null);
    const [gameState, setGameState] = useState<GameState>('idle');
    const [gameSettings, setGameSettings] = useState<GameSettings>({
        intervalSpeed: 2000,
        pattern: 'random',
        colors: ['red', 'green', 'blue']
    });

    const {
        connectionStatus,
        hasJoined,
        connectedDevices,
        handleJoin,
        handleSetColor,
        handleRenameDevice,
        wsRef
    } = useWebSocket({
        username,
        setUsername,
        deviceRole,
        setDeviceRole,
        setDeviceId,
        setScreenColor,
        setGameState,
        setGameSettings  // Add this
    });

    const handleHit = useCallback((deviceId: string) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'hit',
                content: {
                    action: 'hit',
                    deviceId,
                    timestamp: Date.now()
                },
                sender: username
            }));
        }
    }, [wsRef, username]);

    const {
        handleStartGame,
        handlePauseGame
    } = useGameControl({
        wsRef,
        deviceRole,
        username,
        gameState,
        setGameState,
        gameSettings,
        handleSetColor,
        connectedDevices
    });

    if (!hasJoined) {
        return (
            <ConnectionForm 
                connectionStatus={connectionStatus}
                onJoin={handleJoin}
            />
        );
    }

    return (
        <div className="max-w-md mx-auto p-4">
            {deviceRole === 'client' && (
                <ClientScreen 
                    deviceId={deviceId}
                    screenColor={screenColor}
                    onHit={handleHit}
                    gamePattern={gameSettings.pattern}  // Pass the pattern here
                />
            )}
            
            <div className={`${deviceRole === 'client' ? 'opacity-0' : ''}`}>
                <div className="mb-4 flex justify-between items-center">
                    <p className="text-gray-600">
                        Logged in as: <span className="font-bold">{username}</span>
                    </p>
                    <p className="text-gray-600">
                        Role: <span className="font-bold">{deviceRole}</span>
                        {deviceRole === 'client' && (
                            <span className="ml-2 text-sm text-gray-500">ID: {deviceId}</span>
                        )}
                    </p>
                </div>
                
                {deviceRole === 'master' && (
                    <>
                        <DeviceList 
                            devices={connectedDevices}
                            onRename={handleRenameDevice}
                        />
                        <GameControls 
                            gameState={gameState}
                            gameSettings={gameSettings}
                            setGameSettings={setGameSettings}
                            onStart={handleStartGame}
                            onPause={handlePauseGame}
                            connectedDevices={connectedDevices}
                        />
                        <ColorControls 
                            devices={connectedDevices}
                            onSetColor={handleSetColor}
                        />
                    </>
                )}
            </div>
        </div>
    );
};

export default ClientSide;