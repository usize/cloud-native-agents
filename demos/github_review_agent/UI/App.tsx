import React, { useState } from 'react';
import Header from './components/Header/Header';
import Sidebar from './components/Sidebar/Sidebar';
import IssuesAnalyzer from './features/github/IssuesAnalyzer';
import PRsAnalyzer from './features/github/PRsAnalyzer';
import CreateAgents from './features/agents/CreateAgents';

export default function App() {
    const [activeView, setActiveView] = useState('issue-analyzer');

    const renderContent = () => {
        switch(activeView) {
            case 'issue-analyzer':
                return <IssuesAnalyzer />;
            case 'pr-analyzer':
                return <PRsAnalyzer />;
            case 'create-agents':
                return <CreateAgents />;
            default:
                return <IssuesAnalyzer />;
        }
    };
    
    return (
        <div className="min-h-screen bg-gray-900 font-sans">
            <Header />
            <div className="flex">
                <Sidebar activeView={activeView} setActiveView={setActiveView} />
                <main className="flex-grow p-8 bg-gray-800/50">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
} 
