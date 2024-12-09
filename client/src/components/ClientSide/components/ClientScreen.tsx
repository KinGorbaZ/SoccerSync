// src/components/ClientSide/components/ClientScreen.tsx
import React from 'react';

interface ClientScreenProps {
   deviceId: string;
   screenColor: string | null;
}

export const ClientScreen: React.FC<ClientScreenProps> = ({
   deviceId,
   screenColor
}) => {
   return (
       <div 
           className="fixed inset-0 flex items-center justify-center"
           style={{ 
               backgroundColor: screenColor || 'black',
               color: 'white',
               zIndex: 50 
           }}
       >
           <div className="text-center">
               <h2 className="text-2xl mb-2">Device ID: {deviceId}</h2>
               <p className="text-xl">Current Color: {screenColor || 'black'}</p>
           </div>
       </div>
   );
};