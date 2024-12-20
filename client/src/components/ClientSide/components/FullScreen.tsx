// FullScreen.tsx
import React, { useEffect, useState, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export const FullScreen: React.FC<Props> = ({ children }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const enterFullscreen = async () => {
    try {
      const element = document.documentElement;
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      }
      setIsFullscreen(true);
      console.log('Entered fullscreen mode');
    } catch (error) {
      console.error('Failed to enter fullscreen:', error);
    }
  };

  const exitFullscreen = async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
      setIsFullscreen(false);
      console.log('Exited fullscreen mode');
    } catch (error) {
      console.error('Failed to exit fullscreen:', error);
    }
  };

  useEffect(() => {
    // Enter fullscreen when component mounts
    enterFullscreen();

    // Handle fullscreen change events
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (isFullscreen) {
        exitFullscreen();
      }
    };
  }, []);

  return <>{children}</>;
};