// MaxBrightness.tsx
import React, { useEffect, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export const MaxBrightness: React.FC<Props> = ({ children }) => {
  useEffect(() => {
    const setMaxBrightness = async () => {
      try {
        // Try using the modern Screen API
        // @ts-ignore - Screen Brightness API is experimental
        if ('screen' in window && 'getScreenDetails' in window.screen) {
          // @ts-ignore
          const screenDetails = await window.screen.getScreenDetails();
          if (screenDetails.screens?.[0]) {
            await screenDetails.screens[0].setBrightness(1);
            console.log('Brightness set to maximum');
          }
        } else {
          console.log('Screen Brightness API not supported');
        }
      } catch (error) {
        console.error('Failed to set brightness:', error);
      }
    };

    setMaxBrightness();
  }, []);

  return <>{children}</>;
};