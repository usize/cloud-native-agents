/**
 * ConnectionStatus Component
 * 
 * A visual indicator component for displaying WebSocket connection status.
 * Shows real-time connection state with color-coded status indicators.
 * 
 * Features:
 * - Visual status indicator with colored dot
 * - Three connection states:
 *   - Connected (green): WebSocket is active and ready
 *   - Connecting (yellow): WebSocket is attempting to connect
 *   - Disconnected (red): WebSocket is not connected
 * - Status text display
 * - Responsive design
 * - Accessible color coding
 * 
 * Usage:
 * ```typescript
 * <ConnectionStatus
 *   isConnected={isConnected}
 *   isLoading={isLoading}
 * />
 * ```
 */

import React from 'react';

interface ConnectionStatusProps {
  isConnected: boolean;
  isLoading: boolean;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
  isLoading
}) => {
  return (
    <div className="mt-4 text-center">
      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
        isConnected 
          ? 'bg-green-900 text-green-200' 
          : isLoading 
            ? 'bg-yellow-900 text-yellow-200' 
            : 'bg-red-900 text-red-200'
      }`}>
        <div className={`w-2 h-2 rounded-full mr-2 ${
          isConnected 
            ? 'bg-green-400' 
            : isLoading 
              ? 'bg-yellow-400' 
              : 'bg-red-400'
        }`}></div>
        {isConnected ? 'Connected' : isLoading ? 'Connecting...' : 'Disconnected'}
      </div>
    </div>
  );
};

export default ConnectionStatus; 