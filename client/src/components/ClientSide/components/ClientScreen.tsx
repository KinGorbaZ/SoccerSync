import React, { useEffect, useState } from 'react';
import { useVibrationDetection } from '../hooks/useVibrationDetection';
import { MaxBrightness } from './MaxBrightness';
import { FullScreen } from './FullScreen';

interface ClientScreenProps {
    deviceId: string;
    screenColor: string | null;
    onHit?: (deviceId: string) => void;
    gamePattern?: string;
    enableBrightness?: boolean;
    enableFullscreen?: boolean;
}

export const ClientScreen: React.FC<ClientScreenProps> = ({
    deviceId,
    screenColor,
    onHit,
    gamePattern,
    enableBrightness = true,
    enableFullscreen = true,
}) => {
    const [motionEnabled, setMotionEnabled] = useState(false);

    const { requestMotionPermission } = useVibrationDetection({
        deviceId,
        // Change this to use gamePattern directly
        isActive: gamePattern === 'hit',
        currentColor: screenColor || 'black',
        onHit: (command) => {
            if (onHit && screenColor && screenColor !== 'black') {
                onHit(deviceId);
            }
        }
    });

    // Enable motion detection when pattern changes to 'hit'
    useEffect(() => {
        const enableMotion = async () => {
            if (gamePattern === 'hit') {
                const isSupported = await requestMotionPermission();
                setMotionEnabled(isSupported);
            }
        };

        enableMotion();
    }, [gamePattern, requestMotionPermission]);
    let content = <div 
            className="fixed inset-0 flex items-center justify-center"
            style={{ 
                backgroundColor: screenColor || 'black',
                transition: 'background-color 0.3s ease'
            }}
        >
            <div className="text-white text-center p-4">
                <h2 className="text-2xl mb-2">Device ID: {deviceId}</h2>
                <p>Current Color: {screenColor || 'black'}</p>
                <p>Game Pattern: {gamePattern}</p>
                <p>Motion Enabled: {motionEnabled ? 'Yes' : 'No'}</p>
                
                {gamePattern === 'hit' && motionEnabled && (
                    <div style={{ margin: '20px' }}>
                        <div style={{ color: 'green' }}>Motion Detection Active</div>
                        {screenColor && screenColor !== 'black' && (
                            <div style={{ color: 'yellow', marginTop: '10px' }}>
                                Hit the device when ready!
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>

    if(enableBrightness){
        content = <MaxBrightness>{content}</MaxBrightness>;
    }

    if(enableFullscreen){
        content = <FullScreen>{content}</FullScreen>;
    }
    return (<>{content}</>);
};