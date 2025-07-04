/**
 * AgentConversation Component
 * 
 * A real-time display component for showing agent conversation messages in the HITL workflow.
 * Displays messages from different agents with color-coded styling and agent identification.
 * 
 * Features:
 * - Real-time message display with scrolling
 * - Color-coded message bubbles for different agents:
 *   - User (blue): Human input and responses
 *   - Issue Reader (purple): Extracts issue information
 *   - Researcher (green): Finds related information
 *   - Reasoner (orange): Analyzes and creates draft comments
 *   - Human Approval (pink): Requests user input
 *   - Commenter (teal): Posts final comments
 * - Message count display
 * - Loading state indication
 * - Connection status awareness
 * 
 * Usage:
 * ```typescript
 * <AgentConversation
 *   messages={agentMessages}
 *   isConnected={isConnected}
 *   isLoading={isLoading}
 * />
 * ```
 */

import React from 'react';

export interface AgentMessage {
  content: string;
  source: string;
  type?: string;
  prompt?: string;
}

interface AgentConversationProps {
  messages: AgentMessage[];
  isConnected: boolean;
  isLoading: boolean;
}

const AgentConversation: React.FC<AgentConversationProps> = ({
  messages,
  isConnected,
  isLoading
}) => {
  const getAgentDisplayName = (source: string) => {
    switch (source) {
      case 'user': return '👤 You';
      case 'issue_reader': return '📖 Issue Reader';
      case 'researcher': return '🔍 Researcher';
      case 'reasoner': return '🧠 Reasoner';
      case 'user_proxy': return '👤 Human Approval';
      case 'commenter': return '💬 Commenter';
      default: return source;
    }
  };

  const getMessageStyle = (source: string) => {
    switch (source) {
      case 'user': return 'bg-blue-900 text-blue-100';
      case 'issue_reader': return 'bg-purple-900 text-purple-100';
      case 'researcher': return 'bg-green-900 text-green-100';
      case 'reasoner': return 'bg-orange-900 text-orange-100';
      case 'user_proxy': return 'bg-pink-900 text-pink-100';
      case 'commenter': return 'bg-teal-900 text-teal-100';
      default: return 'bg-gray-700 text-gray-100';
    }
  };

  return (
    <div className="mt-8 bg-gray-800 p-6 rounded-lg shadow-xl max-w-4xl mx-auto">
      <h3 className="text-xl font-semibold mb-4 text-blue-200">
        Agent Conversation ({messages.length} messages)
      </h3>
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="text-gray-400 text-center py-4">
            {isLoading ? 'Waiting for agent messages...' : 'No messages yet'}
          </div>
        ) : (
          messages.map((message, index) => (
            <div key={index} className={`p-3 rounded-lg ${getMessageStyle(message.source)}`}>
              <div className="font-semibold text-sm mb-1">
                {getAgentDisplayName(message.source)}
              </div>
              <div className="text-sm whitespace-pre-wrap">{message.content}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AgentConversation; 