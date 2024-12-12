const WebSocket = require('ws');
const https = require('https');
const fs = require('fs');
const express = require('express');
const crypto = require('crypto');
const path = require('path');

const app = express();
const server = https.createServer(
    {
        key: fs.readFileSync(path.join(__dirname, '../certs/cert.key')),
        cert: fs.readFileSync(path.join(__dirname, '../certs/cert.crt'))
    },
    app);
const wss = new WebSocket.Server({ 
    server,
    clientTracking: true
});

const devices = new Map();
let masterDevice = null;
let connectionCount = 0;
const pendingConnections = new Map();
let gameState = 'idle';
let gameSettings = null;
let activeDevice = null;

const generateDeviceId = () => crypto.randomBytes(4).toString('hex');

const getConnectedDevices = () => {
    const deviceList = [];
    devices.forEach((device, ws) => {
        if (ws.readyState === WebSocket.OPEN) {
            deviceList.push({
                id: device.id,
                role: device.role,
                username: device.username,
                name: device.name,
                status: 'connected'
            });
        }
    });
    return deviceList;
};

const updateMasterDeviceList = () => {
    if (masterDevice && masterDevice.readyState === WebSocket.OPEN) {
        masterDevice.send(JSON.stringify({
            type: 'deviceList',
            content: getConnectedDevices(),
            sender: 'System'
        }));
    }
};

const broadcastMessage = (message) => {
    devices.forEach((device, client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
};

const selectNextDevice = () => {
    const clientDevices = Array.from(devices.values()).filter(d => d.role === 'client');
    
    if (clientDevices.length === 0) return null;

    // If there's only one device, use it regardless of whether it was active
    if (clientDevices.length === 1) {
        const nextDevice = clientDevices[0];
        const nextColor = gameSettings.colors[Math.floor(Math.random() * gameSettings.colors.length)];
        activeDevice = nextDevice;
        return { device: nextDevice, color: nextColor };
    }

    // If multiple devices, try to pick a different one than the active one
    const availableDevices = clientDevices.filter(d => (!activeDevice || d.id !== activeDevice.id));
    if (availableDevices.length > 0) {
        const nextDevice = availableDevices[Math.floor(Math.random() * availableDevices.length)];
        const nextColor = gameSettings.colors[Math.floor(Math.random() * gameSettings.colors.length)];
        activeDevice = nextDevice;
        return { device: nextDevice, color: nextColor };
    }

    return null;
};

const activateDevice = (deviceId, color) => {
    devices.forEach((device, client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'command',
                content: {
                    action: 'color',
                    color: device.id === deviceId ? color : 'black'
                },
                sender: 'System'
            }));
        }
    });
};

let hitPatternTimeout = null;

const activateNextDeviceAfterDelay = (intervalSpeed) => {
    console.log('Scheduling next device activation...');
    
    // Clear any existing timeout
    if (hitPatternTimeout) {
        clearTimeout(hitPatternTimeout);
        hitPatternTimeout = null;
    }

    // Set timeout to activate next device after the interval
    hitPatternTimeout = setTimeout(() => {
        console.log('Timeout triggered, checking game state...');
        if (gameState === 'running' && gameSettings?.pattern === 'hit') {
            console.log('Game is running, selecting next device...');
            const next = selectNextDevice();
            if (next) {
                console.log(`Activating device ${next.device.id} with color ${next.color}`);
                activateDevice(next.device.id, next.color);
            } else {
                console.log('No next device available');
            }
        } else {
            console.log(`Game state: ${gameState}, pattern: ${gameSettings?.pattern}`);
        }
    }, intervalSpeed);

    console.log(`Next device will be activated in ${intervalSpeed}ms`);
};

const handleHit = (ws, data) => {
    const hitDevice = devices.get(ws);
    if (!hitDevice) {
        console.log('Unregistered device attempted to send hit');
        return;
    }

    console.log(`Hit detected from device ${hitDevice.id}`);

    if (gameState === 'running' && gameSettings?.pattern === 'hit') {
        // Turn current device black
        ws.send(JSON.stringify({
            type: 'command',
            content: {
                action: 'color',
                color: 'black'
            },
            sender: 'System'
        }));

        // Use the consistent activation delay function
        activateNextDeviceAfterDelay(gameSettings.intervalSpeed);

        // Notify master
        if (masterDevice && masterDevice.readyState === WebSocket.OPEN) {
            masterDevice.send(JSON.stringify({
                type: 'hit',
                content: {
                    deviceId: hitDevice.id,
                    timestamp: data.content.timestamp
                },
                sender: hitDevice.id
            }));
        }
    }
};

wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress;
    const connectionId = ++connectionCount;
    console.log(`New client attempting to connect #${connectionId} from ${clientIp}`);

    pendingConnections.set(ws, {
        id: connectionId,
        ip: clientIp,
        timestamp: Date.now()
    });

    const roleSelectionTimeout = setTimeout(() => {
        if (pendingConnections.has(ws)) {
            console.log(`Client #${connectionId} did not select a role. Closing connection.`);
            ws.close();
        }
    }, 10000);

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            if (data.role) {
                clearTimeout(roleSelectionTimeout);
                pendingConnections.delete(ws);

                if (data.role === 'master') {
                    if (masterDevice !== null && masterDevice !== ws) {
                        ws.send(JSON.stringify({
                            type: 'error',
                            content: 'A master device is already connected',
                            sender: 'System'
                        }));
                        ws.close();
                        return;
                    }
                    masterDevice = ws;
                }

                const deviceId = generateDeviceId();
                devices.set(ws, {
                    id: deviceId,
                    role: data.role,
                    username: data.sender,
                    status: 'connected',
                    ip: clientIp
                });

                console.log(`Client #${connectionId} registered as ${data.role}`);

                ws.send(JSON.stringify({
                    type: 'deviceUpdate',
                    content: { id: deviceId },
                    sender: 'System'
                }));

                broadcastMessage({
                    type: 'system',
                    content: `${data.sender} has joined as ${data.role}`,
                    sender: 'System'
                });

                updateMasterDeviceList();
            } 
            else if (data.type === 'command') {
                if (!devices.has(ws)) {
                    console.log(`Unregistered client #${connectionId} attempted to send command`);
                    return;
                }

                if (data.content.action === 'color') {
                    const { targetId, color } = data.content;
                    devices.forEach((device, client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            if (!targetId || device.id === targetId) {
                                client.send(JSON.stringify({
                                    type: 'command',
                                    content: {
                                        action: 'color',
                                        color: color
                                    },
                                    sender: 'System'
                                }));
                            }
                        }
                    });
                }
                else if (data.content.action === 'gameState') {
                    gameState = data.content.gameState;
                    if (data.content.settings) {
                        gameSettings = data.content.settings;
                    }
                    if (data.content.gameState !== 'running') {
                        if (hitPatternTimeout) {
                            clearTimeout(hitPatternTimeout);
                            hitPatternTimeout = null;
                        }
                    }
                    if (gameState === 'running' && gameSettings?.pattern === 'hit') {
                        const next = selectNextDevice();
                        if (next) {
                            activateDevice(next.device.id, next.color);
                        }
                    }

                    broadcastMessage({
                        type: 'command',
                        content: {
                            action: 'gameState',
                            gameState: gameState,
                            settings: gameSettings
                        },
                        sender: 'System'
                    });
                }
                else if (data.content.action === 'rename') {
                    const device = devices.get(ws);
                    if (device) {
                        device.name = data.content.name;
                        updateMasterDeviceList();
                    }
                }
            }
            else if (data.type === 'hit') {
                handleHit(ws, data);
            }
        } catch (error) {
            console.error(`Error processing message from client #${connectionId}:`, error);
        }
    });

    ws.on('close', () => {
        clearTimeout(roleSelectionTimeout);
        pendingConnections.delete(ws);
        
        const device = devices.get(ws);
        if (device) {
            console.log(`Client #${connectionId} (${device.username}) disconnected`);
            if (ws === masterDevice) {
                console.log('Master device disconnected');
                masterDevice = null;
            }
            broadcastMessage({
                type: 'system',
                content: `${device.username} (${device.role}) has disconnected`,
                sender: 'System'
            });
            devices.delete(ws);
            updateMasterDeviceList();
        } else {
            console.log(`Unregistered client #${connectionId} disconnected`);
        }
    });

    ws.on('error', (error) => {
        console.error(`Client #${connectionId} error:`, error);
        ws.terminate();
    });
});

setInterval(() => {
    const now = Date.now();
    pendingConnections.forEach((data, ws) => {
        if (now - data.timestamp > 10000) {
            console.log(`Cleaning up stale pending connection #${data.id}`);
            ws.close();
            pendingConnections.delete(ws);
        }
    });
}, 5000);

process.on('SIGTERM', () => {
    console.log('SIGTERM received. Closing server...');
    closeAllConnections();
    wss.close(() => {
        server.close(() => {
            process.exit(0);
        });
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received. Closing server...');
    closeAllConnections();
    wss.close(() => {
        server.close(() => {
            process.exit(0);
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    const addressInfo = server.address();
    console.log(`Server is running on ${addressInfo.address}:${addressInfo.port}`);
});