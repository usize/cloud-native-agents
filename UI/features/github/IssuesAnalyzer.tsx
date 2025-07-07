/**
 * IssuesAnalyzer Component
 * 
 * Main component for the GitHub Issue Analyzer feature. Provides a comprehensive interface
 * for analyzing GitHub issues using AI agents with optional human-in-the-loop (HITL) approval.
 * 
 * Architecture:
 * This component orchestrates multiple sub-components and manages the overall workflow:
 * 
 * 1. IssueAnalyzerForm - Handles user input and mode selection
 * 2. useWebSocket Hook - Manages real-time agent communication
 * 3. AgentConversation - Displays real-time agent messages
 * 4. UserInputSection - Handles human approval workflow
 * 5. ConnectionStatus - Shows WebSocket connection state
 * 
 * Analysis Modes:
 * - Analysis Only: Analyzes issue without posting comments
 * - Auto-Comment: Analyzes and automatically posts comment to GitHub
 * - Human Approval (HITL): Analyzes, creates draft, waits for human approval, then posts
 * 
 * Agent Workflow (HITL Mode):
 * 1. issue_reader: Extracts structured information from the GitHub issue
 * 2. researcher: Finds related information and solutions
 * 3. reasoner: Analyzes the issue and creates a draft comment
 * 4. user_proxy: Requests human approval with the draft
 * 5. commenter: Posts the approved comment to GitHub
 * 
 * Features:
 * - Real-time agent conversation display
 * - WebSocket-based communication with backend
 * - Human-in-the-loop approval workflow
 * - Error handling and timeout management
 * - Loading states and progress indicators
 * - Responsive design with dark theme
 * - Markdown rendering for analysis results
 * 
 * State Management:
 * - Form state: issueLink, postComment, requireApproval
 * - UI state: isLoading, error, success, response
 * - HITL state: showUserInput, userInputPrompt, agentMessages, currentDraft, editedText
 * - WebSocket state: isConnected, wsLoading, wsError (managed by hook)
 * 
 * Usage:
 * ```typescript
 * <IssuesAnalyzer />
 * ```
 * 
 * Dependencies:
 * - React hooks for state management
 * - useWebSocket hook for real-time communication
 * - ReactMarkdown for rendering analysis results
 * - Tailwind CSS for styling
 * - Sub-components for modular functionality
 * 
 * @author Cloud Native Agents Team
 * @version 1.0.0
 */

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { API_BASE_URL } from '../../config/config';
import { useWebSocket, WebSocketMessage } from '../../hooks/useWebSocket';
import IssueAnalyzerForm from './components/IssueAnalyzerForm';
import AgentConversation, { AgentMessage } from './components/AgentConversation';
import UserInputSection from './components/UserInputSection';
import ConnectionStatus from './components/ConnectionStatus';

const IssuesAnalyzer: React.FC = () => {
  const [issueLink, setIssueLink] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Toggle states
  const [postComment, setPostComment] = useState(false);
  const [requireApproval, setRequireApproval] = useState(false);
  
  // HITL states
  const [showUserInput, setShowUserInput] = useState(false);
  const [userInputPrompt, setUserInputPrompt] = useState('');
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([]);
  const [currentDraft, setCurrentDraft] = useState('');
  const [editedText, setEditedText] = useState('');

  // Error boundary state
  const [hasError, setHasError] = useState(false);

  // WebSocket hook
  const {
    isConnected,
    wsLoading,
    wsError,
    connect,
    sendMessage,
    sendUserInput
  } = useWebSocket({
    endpoint: '/ws/issue_next_steps_with_hitl_comment',
    onMessage: (message: WebSocketMessage) => {
      // Display agent message
      const agentMessage: AgentMessage = {
        content: message.content || '',
        source: message.source || 'unknown',
        type: message.type
      };
      setAgentMessages(prev => [...prev, agentMessage]);
      
      // Capture draft from reasoner agent
      if (message.source === 'reasoner' && message.content) {
        setCurrentDraft(message.content);
        setEditedText(message.content);
      }
      
      // If this is a commenter message, it might be the final result
      if (message.source === 'commenter') {
        setShowUserInput(false);
        setSuccess('Comment posted successfully!');
      }
    },
    onUserInputRequested: (prompt: string) => {
      setShowUserInput(true);
      setUserInputPrompt(prompt);
    },
    onError: (errorMsg: string) => {
      setError(errorMsg);
      setShowUserInput(false);
    },
    onComplete: () => {
      console.log('WebSocket conversation completed');
      setIsLoading(false); // Clear loading state when conversation is complete
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueLink || !issueLink.includes('github.com') || !issueLink.includes('/issues/')) {
      setError('Please enter a valid GitHub issue URL.');
      return;
    }

    // For HITL mode, use WebSocket
    if (requireApproval) {
      setIsLoading(true);
      setError('');
      setResponse('');
      setSuccess('');
      setAgentMessages([]);
      setShowUserInput(false);
      setUserInputPrompt('');
      setCurrentDraft('');

      const ws = connect();
      
      if (ws) {
        // Wait for connection to open, then send the issue URL
        const originalOnOpen = ws.onopen;
        ws.onopen = () => {
          if (originalOnOpen) {
            originalOnOpen.call(ws);
          }
          // Send the issue URL to start the conversation after a short delay
          setTimeout(() => {
            console.log('Sending issue URL to WebSocket:', issueLink);
            sendMessage(issueLink, 'user');
          }, 100);
        };
      } else {
        setError('Failed to establish WebSocket connection');
      }
    } else {
      // Handle non-HITL modes 
      setIsLoading(true);
      setError('');
      setResponse('');
      setSuccess('');

      try {
        let endpoint = '/issue_next_steps_analysis'; // default just analysis
        let requestBody: { issue_link: string; user_input?: string } = { issue_link: issueLink };

        if (postComment) {
          endpoint = '/issue_next_steps_with_comment'; // if postComment is true, use the endpoint that posts a comment
        }

        const apiResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        if (!apiResponse.ok) {
          const errorData = await apiResponse.json();
          throw new Error(errorData.detail || `HTTP error! Status: ${apiResponse.status}`);
        }

        const result = await apiResponse.json();
        setResponse(result.response);
        
        if (postComment) {
          setSuccess('Analysis completed and comment posted to GitHub!');
        } else {
          setSuccess('Analysis completed successfully!');
        }
      } catch (err: any) {
        setError(err.message);
        console.error('API call failed:', err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Human in the loop (HITL) mode, let the user edit the git comment and submit it
  const handleUserInputSubmit = () => {
    if (!editedText.trim() && !currentDraft.trim()) {
      setError('Please edit the comment if needed and submit.');
      return;
    }

    // Use editedText if available, otherwise use currentDraft
    const textToSend = ("USER EDITED COMMENT: " + editedText.trim()) || currentDraft.trim();
    
    console.log('Sending user approved comment to backend:', textToSend);
    sendUserInput(textToSend);

    // Clear user input and hide the input section
    setShowUserInput(false);
    setUserInputPrompt('');
    setCurrentDraft('');
    setEditedText('');
  };

  // Error boundary
  if (hasError) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-red-400 mb-4">Something went wrong</h2>
        <p className="text-gray-300 mb-4">The component encountered an error. Please refresh the page.</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Refresh Page
        </button>
      </div>
    );
  }

  try {
    return (
      <div>
        <h1 className="text-3xl font-medium text-gray-100 mb-6 font-sans text-center">Issue analyzer</h1>
        
        <IssueAnalyzerForm
          issueLink={issueLink}
          postComment={postComment}
          requireApproval={requireApproval}
          isLoading={isLoading || wsLoading}
          error={error || wsError}
          onIssueLinkChange={setIssueLink}
          onPostCommentChange={setPostComment}
          onRequireApprovalChange={(value) => {
            setRequireApproval(value);
            if (value) {
              setPostComment(true); // HITL requires posting comments
            }
          }}
          onSubmit={handleSubmit}
        />

        {/* WebSocket Connection Status */}
        {requireApproval && (
          <ConnectionStatus isConnected={isConnected} isLoading={isLoading || wsLoading} />
        )}

        {/* Real-time Agent Messages */}
        {requireApproval && (
          <AgentConversation
            messages={agentMessages}
            isConnected={isConnected}
            isLoading={isLoading || wsLoading}
          />
        )}

        {/* User Input Section */}
        <UserInputSection
          showUserInput={showUserInput}
          userInputPrompt={userInputPrompt}
          editedText={editedText}
          currentDraft={currentDraft}
          onEditedTextChange={setEditedText}
          onSubmit={handleUserInputSubmit}
        />

        {/* Results and Status Messages */}
        <div className="mt-8">
          {(error || wsError) && (
            <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg" role="alert">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{error || wsError}</span>
            </div>
          )}
          {success && (
            <div className="bg-green-900 border border-green-700 text-green-200 px-4 py-3 rounded-lg" role="status">
              <strong className="font-bold">Success: </strong>
              <span className="block sm:inline">{success}</span>
            </div>
          )}
          {response && !requireApproval && (
            <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-4xl mx-auto">
              <h3 className="text-xl font-semibold mb-4 text-blue-200">Analysis Results</h3>
              <div className="prose prose-invert max-w-none text-gray-300">
                <ReactMarkdown
                  components={{
                    h1: ({ children }) => (
                      <h1 className="text-3xl font-bold text-blue-100 mt-8 mb-4">{children}</h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-2xl font-bold text-blue-200 mt-8 mb-4">{children}</h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-xl font-bold text-blue-300 mt-6 mb-3">{children}</h3>
                    ),
                    h4: ({ children }) => (
                      <h4 className="text-lg font-bold text-blue-400 mt-4 mb-2">{children}</h4>
                    ),
                    h5: ({ children }) => (
                      <h5 className="text-base font-bold text-blue-500 mt-3 mb-2">{children}</h5>
                    ),
                    h6: ({ children }) => (
                      <h6 className="text-sm font-bold text-blue-600 mt-2 mb-1">{children}</h6>
                    ),
                    p: ({ children }) => (
                      <p className="text-gray-300 mb-3 leading-relaxed">{children}</p>
                    ),
                    code: ({ children, className }) => {
                      const isInline = !className;
                      if (isInline) {
                        return (
                          <code className="bg-gray-700 text-green-400 px-1 py-0.5 rounded text-sm font-mono">
                            {children}
                          </code>
                        );
                      }
                      return (
                        <code className="text-green-400 font-mono text-sm">{children}</code>
                      );
                    },
                    pre: ({ children }) => (
                      <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto my-4">{children}</pre>
                    ),
                    a: ({ href, children }) => (
                      <a 
                        href={href} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 underline"
                      >
                        {children}
                      </a>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-bold text-white">{children}</strong>
                    ),
                    em: ({ children }) => (
                      <em className="italic text-gray-200">{children}</em>
                    ),
                    hr: () => (
                      <hr className="border-gray-600 my-6" />
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc list-inside text-gray-300 mb-3 space-y-1">{children}</ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal list-inside text-gray-300 mb-3 space-y-1">{children}</ol>
                    ),
                    li: ({ children }) => (
                      <li className="text-gray-300">{children}</li>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-300 my-4">
                        {children}
                      </blockquote>
                    ),
                    table: ({ children }) => (
                      <table className="w-full border-collapse border border-gray-600 my-4">{children}</table>
                    ),
                    thead: ({ children }) => (
                      <thead className="bg-gray-700">{children}</thead>
                    ),
                    tbody: ({ children }) => (
                      <tbody className="bg-gray-800">{children}</tbody>
                    ),
                    tr: ({ children }) => (
                      <tr className="border-b border-gray-600">{children}</tr>
                    ),
                    th: ({ children }) => (
                      <th className="border border-gray-600 px-4 py-2 text-left text-gray-200 font-bold">{children}</th>
                    ),
                    td: ({ children }) => (
                      <td className="border border-gray-600 px-4 py-2 text-gray-300">{children}</td>
                    ),
                  }}
                >
                  {response}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error rendering IssuesAnalyzer:', error);
    setHasError(true);
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-red-400 mb-4">Something went wrong</h2>
        <p className="text-gray-300 mb-4">The component encountered an error. Please refresh the page.</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Refresh Page
        </button>
      </div>
    );
  }
};

export default IssuesAnalyzer; 
