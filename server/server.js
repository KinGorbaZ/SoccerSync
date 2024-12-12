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

const closeAllConnections = () => {
    console.log('Closing all existing connections...');
    wss.clients.forEach((client) => {
        try {
            client.terminate();
        } catch (error) {
            console.error('Error while closing client connection:', error);
        }
    });
    devices.clear();
    pendingConnections.clear();
    masterDevice = null;
    connectionCount = 0;
    console.log('All connections closed.');
};

wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress;
    const connectionId = ++connectionCount;
    console.log(`New client attempting to connect #${connectionId} from ${clientIp}`);

    // Add to pending connections
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
                    broadcastMessage({
                        type: 'command',
                        content: {
                            action: 'gameState',
                            gameState: data.content.gameState,
                            settings: data.content.settings
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
    // Log the server's address info
    const addressInfo = server.address();
    console.log(`Server is running on ${addressInfo.address}:${addressInfo.port}`);
    closeAllConnections();
});