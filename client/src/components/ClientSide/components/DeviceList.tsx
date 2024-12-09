// src/components/ClientSide/components/DeviceList.tsx
import React, { useState } from 'react';
import { Device } from '../../../types';

interface DeviceListProps {
   devices: Device[];
   onRename: (deviceId: string, newName: string) => void;
}

export const DeviceList: React.FC<DeviceListProps> = ({ devices, onRename }) => {
   const [editingDevice, setEditingDevice] = useState<string>('');
   const [newDeviceName, setNewDeviceName] = useState('');

   const handleSaveRename = (deviceId: string) => {
       if (newDeviceName.trim()) {
           onRename(deviceId, newDeviceName);
           setEditingDevice('');
           setNewDeviceName('');
       }
   };

   return (
       <div className="mb-4">
           <h3 className="font-bold mb-2">Connected Devices:</h3>
           <div className="space-y-2">
               {devices.filter(d => d.role === 'client').map((device) => (
                   <div key={device.id} className="flex items-center justify-between bg-white p-2 rounded shadow">
                       <div>
                           <span className="font-medium">{device.name || device.username}</span>
                           <span className="text-sm text-gray-500 ml-2">({device.id})</span>
                       </div>
                       <div className="flex items-center">
                           {editingDevice === device.id ? (
                               <>
                                   <input
                                       type="text"
                                       value={newDeviceName}
                                       onChange={(e) => setNewDeviceName(e.target.value)}
                                       className="border rounded px-2 py-1 mr-2"
                                       placeholder="New name"
                                       autoFocus
                                   />
                                   <button
                                       onClick={() => handleSaveRename(device.id)}
                                       className="text-green-500 hover:text-green-700 mr-2"
                                   >
                                       Save
                                   </button>
                                   <button
                                       onClick={() => {
                                           setEditingDevice('');
                                           setNewDeviceName('');
                                       }}
                                       className="text-red-500 hover:text-red-700"
                                   >
                                       Cancel
                                   </button>
                               </>
                           ) : (
                               <button
                                   onClick={() => {
                                       setEditingDevice(device.id);
                                       setNewDeviceName(device.name || '');
                                   }}
                                   className="text-blue-500 hover:text-blue-700"
                               >
                                   Rename
                               </button>
                           )}
                       </div>
                   </div>
               ))}
               {devices.filter(d => d.role === 'client').length === 0 && (
                   <p className="text-gray-500 italic">No client devices connected</p>
               )}
           </div>
       </div>
   );
};