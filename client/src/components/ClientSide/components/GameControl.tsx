//src/components/ClientSide/components/GameControl.tsx
import React from 'react';
import { GameState, GameSettings, Device } from '../../../types';

interface GameControlsProps {
    gameState: GameState;
    gameSettings: GameSettings;
    setGameSettings: (settings: GameSettings) => void;
    onStart: () => void;
    onPause: () => void;
    connectedDevices: Device[];
}

export const GameControls: React.FC<GameControlsProps> = ({
    gameState,
    gameSettings,
    setGameSettings,
    onStart,
    onPause,
    connectedDevices
}) => {
    const clientCount = connectedDevices.filter(d => d.role === 'client').length;

    const handleAddColor = () => {
        const newColor = '#' + Math.floor(Math.random()*16777215).toString(16);
        setGameSettings({
            ...gameSettings,
            colors: [...(gameSettings.colors || []), newColor]
        });
    };

    const handleRemoveColor = (index: number) => {
        const newColors = [...gameSettings.colors];
        newColors.splice(index, 1);
        setGameSettings({
            ...gameSettings,
            colors: newColors
        });
    };

    const handleColorChange = (index: number, color: string) => {
        const newColors = [...gameSettings.colors];
        newColors[index] = color;
        setGameSettings({
            ...gameSettings,
            colors: newColors
        });
    };

    return (
        <div className="mb-4 p-4 bg-gray-100 rounded">
            <h3 className="font-bold mb-2">Game Controls:</h3>
            <div className="space-y-4">
                {/* Pattern Selection */}
                <div className="flex items-center space-x-4">
                    <label className="flex-1">
                        Pattern:
                        <select
                            value={gameSettings.pattern}
                            onChange={(e) => setGameSettings({
                                ...gameSettings,
                                pattern: e.target.value as 'random' | 'sequential' | 'simultaneous' | 'hit'
                            })}
                            className="w-full p-2 border rounded mt-1"
                            disabled={gameState === 'running'}
                        >
                            <option value="random">Random</option>
                            <option value="sequential">Sequential</option>
                            <option value="simultaneous">Simultaneous</option>
                            <option value="hit">Hit-Based</option>
                        </select>
                    </label>
                </div>

                {/* Interval Speed */}
                <div className="flex items-center space-x-4">
                    <label className="flex-1">
                        Interval Speed (ms):
                        <input 
                            type="number"
                            value={gameSettings.intervalSpeed}
                            onChange={(e) => setGameSettings({
                                ...gameSettings,
                                intervalSpeed: Math.max(500, parseInt(e.target.value) || 2000)
                            })}
                            className="w-full p-2 border rounded mt-1"
                            min="500"
                            step="100"
                            disabled={gameState === 'running'}
                        />
                    </label>
                </div>

                {/* Color Management */}
                <div className="space-y-2">
                    <label className="font-medium">Game Colors:</label>
                    <div className="flex flex-wrap gap-2">
                        {gameSettings.colors.map((color, index) => (
                            <div key={index} className="flex items-center space-x-2 bg-white p-2 rounded">
                                <input
                                    type="color"
                                    value={color}
                                    onChange={(e) => handleColorChange(index, e.target.value)}
                                    disabled={gameState === 'running'}
                                    className="w-8 h-8"
                                />
                                <button
                                    onClick={() => handleRemoveColor(index)}
                                    disabled={gameState === 'running'}
                                    className="text-red-500 hover:text-red-700"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={handleAddColor}
                            disabled={gameState === 'running'}
                            className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                        >
                            + Add Color
                        </button>
                    </div>
                </div>

                {/* Game Controls */}
                <div className="flex space-x-4">
                    {gameState === 'idle' && (
                        <button
                            onClick={onStart}
                            className="flex-1 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-400"
                            disabled={clientCount === 0 || gameSettings.colors.length === 0}
                            title={clientCount === 0 ? 'Need at least one client device' : 
                                  gameSettings.colors.length === 0 ? 'Add at least one color' : ''}
                        >
                            Start Game
                        </button>
                    )}
                    {gameState === 'running' && (
                        <button
                            onClick={onPause}
                            className="flex-1 bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
                        >
                            Pause Game
                        </button>
                    )}
                    {gameState === 'paused' && (
                        <button
                            onClick={onStart}
                            className="flex-1 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                        >
                            Resume Game
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};