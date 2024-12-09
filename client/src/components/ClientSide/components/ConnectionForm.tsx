import React, { useState } from 'react';
import { DeviceRole, ConnectionStatus } from '../../../types';

interface ConnectionFormProps {
   connectionStatus: ConnectionStatus;
   onJoin: (role: DeviceRole) => void;
}

export const ConnectionForm: React.FC<ConnectionFormProps> = ({
   connectionStatus,
   onJoin
}) => {
   const [hasAttemptedConnection, setHasAttemptedConnection] = useState(false);

   const handleRoleSelect = (role: DeviceRole) => {
       setHasAttemptedConnection(true);
       onJoin(role);
   };

   return (
       <div className="flex flex-col gap-4">
           <h2 className="text-xl font-bold text-center mb-4">Select Device Type</h2>
           
           {/* Only show status messages after attempting connection */}
           {hasAttemptedConnection && (
               <>
                   {connectionStatus === ConnectionStatus.CONNECTING && (
                       <p className="text-yellow-500 text-center">Connecting to server...</p>
                   )}
                   {connectionStatus === ConnectionStatus.DISCONNECTED && (
                       <p className="text-red-500 text-center">Disconnected from server</p>
                   )}
               </>
           )}

           {/* Device Selection Buttons */}
           <div className="flex gap-4">
               <button 
                   onClick={() => handleRoleSelect('master')}
                   className="flex-1 bg-blue-500 text-white px-6 py-3 rounded text-lg font-semibold hover:bg-blue-600 disabled:bg-gray-400"
                   disabled={connectionStatus === ConnectionStatus.CONNECTING}
               >
                   Master
               </button>
               <button 
                   onClick={() => handleRoleSelect('client')}
                   className="flex-1 bg-green-500 text-white px-6 py-3 rounded text-lg font-semibold hover:bg-green-600 disabled:bg-gray-400"
                   disabled={connectionStatus === ConnectionStatus.CONNECTING}
               >
                   Client
               </button>
           </div>

           {/* Help Text */}
           {hasAttemptedConnection && connectionStatus !== ConnectionStatus.CONNECTED && (
               <p className="text-sm text-gray-600 text-center mt-2">
                   Please wait for connection to server...
               </p>
           )}
           {!hasAttemptedConnection && (
               <p className="text-sm text-gray-600 text-center mt-2">
                   Select 'Master' to control or 'Client' to display
               </p>
           )}
       </div>
   );
};