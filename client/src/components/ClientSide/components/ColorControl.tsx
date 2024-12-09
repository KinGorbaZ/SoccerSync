// src/components/ClientSide/components/ColorControls.tsx
import React from 'react';
import { Device } from '../../../types';

interface ColorControlsProps {
   devices: Device[];
   onSetColor: (deviceId: string | undefined, color: string | undefined) => void;
}

export const ColorControls: React.FC<ColorControlsProps> = ({
   devices,
   onSetColor
}) => {
   const clientDevices = devices.filter(d => d.role === 'client');

   return (
       <div className="mb-4 p-4 bg-gray-100 rounded">
           <h3 className="font-bold mb-2">Color Controls:</h3>
           <div className="space-y-2">
               <button
                   onClick={() => onSetColor(undefined, undefined)}
                   className="w-full bg-black text-white px-4 py-2 rounded mb-2"
               >
                   Set All Screens Black
               </button>
               {clientDevices.map((device) => (
                   <div key={device.id} className="flex items-center justify-between bg-white p-2 rounded shadow">
                       <span>{device.name || device.username}</span>
                       <div className="space-x-2">
                           <button
                               onClick={() => onSetColor(device.id, 'red')}
                               className="bg-red-500 text-white px-4 py-1 rounded hover:bg-red-600"
                           >
                               Red
                           </button>
                           <button
                               onClick={() => onSetColor(device.id, 'green')}
                               className="bg-green-500 text-white px-4 py-1 rounded hover:bg-green-600"
                           >
                               Green
                           </button>
                           <button
                               onClick={() => onSetColor(device.id, 'blue')}
                               className="bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600"
                           >
                               Blue
                           </button>
                           <button
                               onClick={() => onSetColor(device.id, undefined)}
                               className="bg-black text-white px-4 py-1 rounded hover:bg-gray-800"
                           >
                               Black
                           </button>
                       </div>
                   </div>
               ))}
               {clientDevices.length === 0 && (
                   <p className="text-gray-500 italic">No client devices connected</p>
               )}
           </div>
       </div>
   );
};