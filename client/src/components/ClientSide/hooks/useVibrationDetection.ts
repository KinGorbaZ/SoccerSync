// src/hooks/useVibrationDetection.ts
import { useEffect, useRef, useCallback } from 'react';
import { HitCommand } from '../../../types';

interface VibrationDetectionConfig {
    deviceId: string | undefined;
    isActive: boolean;
    currentColor: string;
    onHit: (command: HitCommand) => void;
    threshold?: number;
    minInterval?: number;
}

export const useVibrationDetection = ({
    deviceId,
    isActive,
    currentColor,
    onHit,
    minInterval = 100
}: VibrationDetectionConfig) => {
    const lastUpdate = useRef<number>(0);

    // src/hooks/useVibrationDetection.ts
    const handleMotion = useCallback((event: DeviceMotionEvent) => {
    if (!deviceId || !isActive || currentColor === 'black') return;

    const current = event.accelerationIncludingGravity; // Use accelerationIncludingGravity instead of acceleration
    const currentTime = Date.now();
    
    if ((currentTime - lastUpdate.current) > minInterval && current) {
        if (current.x !== null && current.y !== null && current.z !== null) {
            const speed = Math.abs(current.x) + Math.abs(current.y) + Math.abs(current.z);
            // Lower the threshold to 15 or adjust based on testing
            if (speed > 15) {
                onHit({
                    action: 'hit',
                    deviceId,
                    hitSpeed: speed,
                    timestamp: currentTime
                });
            }
        }
        lastUpdate.current = currentTime;
    }
}, [deviceId, isActive, currentColor, onHit]);

    const requestMotionPermission = useCallback(async () => {
        try {
            // For iOS devices
            if (typeof DeviceMotionEvent !== 'undefined' && 
                typeof (DeviceMotionEvent as any).requestPermission === 'function') {
                const permission = await (DeviceMotionEvent as any).requestPermission();
                return permission === 'granted';
            }
            // For Android and other devices
            if (typeof DeviceMotionEvent !== 'undefined') {
                // Add a test listener to check if events are actually firing
                const testPromise = new Promise<boolean>((resolve) => {
                    const testHandler = (event: DeviceMotionEvent) => {
                        window.removeEventListener('devicemotion', testHandler);
                        resolve(true);
                    };
                    window.addEventListener('devicemotion', testHandler);
                    // Timeout after 1 second if no event is received
                    setTimeout(() => {
                        window.removeEventListener('devicemotion', testHandler);
                        resolve(false);
                    }, 1000);
                });
    
                const result = await testPromise;
                return result;
            }
            return false;
        } catch (error) {
            console.error('Error requesting motion permission:', error);
            return false;
        }
    }, []);

    useEffect(() => {
        let mounted = true;

        const setupMotion = async () => {
            if (isActive) {
                const hasPermission = await requestMotionPermission();
                if (hasPermission && mounted) {
                    window.addEventListener('devicemotion', handleMotion);
                }
            }
        };

        setupMotion();
        
        return () => {
            mounted = false;
            window.removeEventListener('devicemotion', handleMotion);
        };
    }, [isActive, handleMotion, requestMotionPermission]);

    return {
        requestMotionPermission
    };
};