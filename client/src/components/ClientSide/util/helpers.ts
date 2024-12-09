// src/components/ClientSide/utils/helpers.ts

import { DeviceRole, TimeHelperResult } from '../../../types';

export const generateUsername = (role: DeviceRole): string => {
    const randomString = Math.random()
        .toString(36)
        .substring(2, 6);
    
    return `${role}-${randomString}`;
};

export const getRandomColor = (): string => {
    const colors = ['red', 'green', 'blue'];
    return colors[Math.floor(Math.random() * colors.length)];
};

export const isValidDeviceName = (name: string): boolean => {
    return name.trim().length >= 2 && name.trim().length <= 20;
};

export const localToServerTime = (localTime: number, offset: number): number => {
   return localTime + offset;
};

export const serverToLocalTime = (serverTime: number, offset: number): number => {
   return serverTime - offset;
};

export const calculateTimeOffset = (serverTime: number, clientTime: number): TimeHelperResult => {
   const now = Date.now();
   const roundTripTime = now - clientTime;
   const offset = serverTime + (roundTripTime / 2) - now;

   return {
       offset,
       localTime: now,
       roundTripTime
   };
};

export const scheduleAtServerTime = (
    scheduledTime: number,
    offset: number,
    callback: () => void
): () => void => {
    const now = Date.now();
    const targetLocalTime = scheduledTime - offset;
    const delay = Math.max(0, targetLocalTime - now);

    const timeoutId = setTimeout(callback, delay);
    return () => clearTimeout(timeoutId);
};

export const calculateNextActivationTime = (
    currentTime: number,
    intervalMs: number
): number => {
    return currentTime + intervalMs;
};

export const isTimingValid = (
    targetTime: number,
    currentTime: number,
    toleranceMs: number = 100
): boolean => {
    return Math.abs(currentTime - targetTime) <= toleranceMs;
};