// KeepAwakeScreen.tsx
import React, { useEffect, useState, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export const KeepAwakeScreen: React.FC<Props> = ({ children }) => {
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);

  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && navigator.wakeLock) {
          const lock = await navigator.wakeLock.request('screen');
          setWakeLock(lock);
          console.log('Wake Lock is active');
        }
      } catch (err: unknown) {
        const error = err as Error;
        console.error('Wake Lock request failed:', error.message);
      }
    };

    requestWakeLock();

    // Re-request wake lock if page becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !wakeLock) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock) {
        wakeLock.release()
          .then(() => console.log('Wake Lock released'))
          .catch((err: unknown) => {
            const error = err as Error;
            console.error('Failed to release Wake Lock:', error.message);
          });
      }
    };
  }, [wakeLock]);

  return <>{children}</>;
};
