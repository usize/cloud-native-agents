import React from 'react';
import { GridIcon, BellIcon, UserCircleIcon } from '../icons';

const Header: React.FC = () => (
    <header className="bg-[#1A1A1A] text-white flex items-center justify-between px-8 py-3 shadow z-20 border-b border-gray-800" role="banner">
        <div className="flex items-center gap-3">
            <img src="/redhat-logo.png" alt="Red Hat Logo" className="w-10 h-10 object-contain" />
            <span className="ml-2 text-xl font-bold tracking-tight">AgentHub</span>
        </div>
        <div className="flex items-center space-x-6">
            <button className="text-gray-400 hover:text-white" aria-label="Grid"><GridIcon /></button>
            <button className="text-gray-400 hover:text-white" aria-label="Notifications"><BellIcon /></button>
            <div className="flex items-center space-x-2 bg-gray-800 px-3 py-1 rounded-full">
                <UserCircleIcon />
                <span className="font-medium">Shreyanand</span>
            </div>
        </div>
    </header>
);

export default Header; 
