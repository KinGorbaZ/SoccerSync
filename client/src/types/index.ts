// src/types/index.ts

export type DeviceRole = 'master' | 'client' | undefined;
export type GameState = 'idle' | 'running' | 'paused';

export enum ConnectionStatus {
    CONNECTING = 'connecting',
    CONNECTED = 'connected',
    DISCONNECTED = 'disconnected'
}

export interface Device {
    id: string;
    role: DeviceRole;
    username: string;
    name?: string;
    status: 'connected' | 'disconnected';
}

export interface GameSettings {
   intervalSpeed: number;
   pattern: 'random' | 'sequential' | 'simultaneous';
   colors: string[];  // Array of custom colors
}

// Command Interfaces
export interface BaseCommand {
    action: string;
    timestamp: number;
}

export interface ColorCommand extends BaseCommand {
   action: 'color';
    targetId?: string;
    color?: string;
    scheduledTime?: number;  // Add this line
    timestamp: number;
}

export interface GameStateCommand extends BaseCommand {
    action: 'gameState';
    gameState: GameState;
    settings?: GameSettings;
}

export interface RenameCommand extends BaseCommand {
    action: 'rename';
    deviceId: string;
    name: string;
}

export interface ActivateDeviceCommand extends BaseCommand {
    action: 'activateDevice';
    deviceId: string;
    color: string;
    activateAt: number;
}

export type Command = ColorCommand | GameStateCommand | RenameCommand | ActivateDeviceCommand;

export interface ScheduledEvent {
    id: string;
    type: string;
    scheduledTime: number;
    deviceId?: string;
    data: any;
    cleanupFn?: () => void;
}

export interface TimeSync {
   clientTime: number;
   serverTime: number;
}

export interface TimeSyncState {
   offset: number;
   lastSyncAt: number;
   roundTripTime: number;
}

export interface SyncMessage extends Message {
   type: 'sync';
   content: TimeSync;
}

export interface Message {
   type: 'message' | 'system' | 'command' | 'error' | 'deviceList' | 'deviceUpdate' | 'sync';
   content: string | Device[] | Command | { id: string } | TimeSync;
   sender: string;
   timestamp?: number;
}

export interface TimeHelperResult {
   offset: number;
   localTime: number;
   roundTripTime: number;
}