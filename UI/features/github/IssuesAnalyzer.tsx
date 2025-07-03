import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import Spinner from '../../components/Spinner';
import { API_BASE_URL } from '../../config/config';

interface AgentMessage {
  content: string;
  source: string;
  type?: string;
  prompt?: string;
}

interface WebSocketMessage {
  content: string;
  source: string;
  type?: string;
  prompt?: string;
}

const IssuesAnalyzer: React.FC = () => {
  const [issueLink, setIssueLink] = useState('');
  const [postComment, setPostComment] = useState(false);
  const [requireApproval, setRequireApproval] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // WebSocket and HITL states
  const [isConnected, setIsConnected] = useState(false);
  const [showUserInput, setShowUserInput] = useState(false);
  const [userInputPrompt, setUserInputPrompt] = useState('');
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([]);
  const [currentDraft, setCurrentDraft] = useState('');
  const [editedText, setEditedText] = useState('');
  const wsRef = useRef<WebSocket | null>(null);
  const timeoutRef = useRef<number | null>(null);

  // Error boundary state
  const [hasError, setHasError] = useState(false);

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const connectWebSocket = () => {
    try {
      const wsUrl = API_BASE_URL.replace('http', 'ws') + '/ws/issue_next_steps_with_hitl_comment';
      console.log('Connecting to WebSocket:', wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected successfully');
        setIsConnected(true);
        setError('');
      };

          ws.onmessage = (event) => {
      try {
        console.log('WebSocket message received:', event.data);
        
        // Handle non-JSON messages gracefully
        if (typeof event.data === 'string' && !event.data.trim().startsWith('{')) {
          console.log('Non-JSON message received:', event.data);
          return; // Ignore non-JSON messages
        }
        
        const message: WebSocketMessage = JSON.parse(event.data);
        console.log('Parsed WebSocket message:', message);
        
        if (message.type === 'user_input_requested') {
          console.log('User input requested:', message.prompt);
          // Show user input prompt when user_proxy agent is called
          setShowUserInput(true);
          setUserInputPrompt(message.prompt || 'Please review and approve the comment:');
          setIsLoading(false);
          
          // Set a timeout to detect if user input takes too long
          timeoutRef.current = setTimeout(() => {
            console.log('Frontend timeout detected - no response from user');
            setError('Timeout: No response received. Please try again.');
            setIsConnected(false);
            setShowUserInput(false);
            setIsLoading(false);
            if (wsRef.current) {
              wsRef.current.close();
            }
          }, 305000); // 305 seconds (slightly longer than backend's 300 seconds)
        } else if (message.type === 'error') {
          console.log('Error message received:', message.content);
          setError(message.content);
          setIsLoading(false);
          setShowUserInput(false);
          
          // If the error indicates connection is closed, update connection state
          if (message.content.includes('Connection closed') || message.content.includes('timeout')) {
            setIsConnected(false);
            if (wsRef.current) {
              wsRef.current.close();
            }
          }
        } else {
          console.log('Agent message received from:', message.source, 'Content:', message.content?.substring(0, 100));
          
          // Clear any previous errors since we're receiving valid messages
          if (error) {
            setError('');
          }
          
          // Display agent message
          const agentMessage: AgentMessage = {
            content: message.content || '',
            source: message.source || 'unknown',
            type: message.type
          };
          setAgentMessages(prev => {
            console.log('Adding agent message to conversation. Total messages:', prev.length + 1);
            return [...prev, agentMessage];
          });
          
          // Capture draft from reasoner agent
          if (message.source === 'reasoner' && message.content) {
            setCurrentDraft(message.content);
            setEditedText(message.content); // Initialize editedText with the draft
          }
          
          // If this is a commenter message, it might be the final result
          if (message.source === 'commenter') {
            setShowUserInput(false);
            setIsLoading(false);
            setSuccess('Comment posted successfully!');
          }
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error, 'Raw data:', event.data);
        // Don't show error to user for parsing issues, just log them
        console.warn('Skipping malformed message, continuing...');
      }
    };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('WebSocket connection error. Please try again.');
        setIsLoading(false);
        setIsConnected(false);
      };

          ws.onclose = () => {
      console.log('WebSocket connection closed');
      setIsConnected(false);
      setIsLoading(false);
      
      // Clear any timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

      return ws;
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setError('Failed to create WebSocket connection. Please try again.');
      setIsLoading(false);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueLink || !issueLink.includes('github.com') || !issueLink.includes('/issues/')) {
      setError('Please enter a valid GitHub issue URL.');
      return;
    }

    // For HITL mode, don't require upfront user input
    if (requireApproval) {
      // Start WebSocket connection and send issue URL
      setIsLoading(true);
      setError('');
      setResponse('');
      setSuccess('');
      setAgentMessages([]);
      setShowUserInput(false);
      setUserInputPrompt('');
      setCurrentDraft('');

      const ws = connectWebSocket();
      
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
            ws.send(JSON.stringify({ 
              content: issueLink, 
              source: 'user' 
            }));
          }, 100); // Small delay to ensure connection is fully established
        };
      } else {
        setError('Failed to establish WebSocket connection');
        setIsLoading(false);
      }
    } else {
      // Handle non-HITL modes (existing logic)
      setIsLoading(true);
      setError('');
      setResponse('');
      setSuccess('');

      try {
        let endpoint = '/issue_next_steps_analysis';
        let requestBody: { issue_link: string; user_input?: string } = { issue_link: issueLink };

        if (postComment) {
          endpoint = '/issue_next_steps_with_comment';
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

  const handleUserInputSubmit = () => {
    if (!wsRef.current || (!editedText.trim() && !currentDraft.trim())) {
      setError('Please edit the comment if needed and submit.');
      return;
    }

    // Clear the timeout since user is responding
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Use editedText if available, otherwise use currentDraft
    const textToSend = ("USER EDITED COMMENT: " + editedText.trim()) || currentDraft.trim();
    
    console.log('Sending user approved comment to backend:', textToSend);

    // Send user input to WebSocket
    wsRef.current.send(JSON.stringify({ 
      content: textToSend, 
      source: 'user' 
    }));

    // Clear user input and hide the input section
    setUserInput('');
    setShowUserInput(false);
    setUserInputPrompt('');
    setCurrentDraft('');
    setEditedText('');
    setIsLoading(true);
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
        <div className="bg-gray-800/90 max-w-lg mx-auto p-8 rounded-2xl shadow-2xl mt-12">
        <p className="text-gray-300 mb-6 font-sans text-center">
          Enter the URL of a GitHub issue to have the agent team analyze it. 
        </p>
        <form onSubmit={handleSubmit} aria-label="GitHub Issue Analyzer Form" className="flex flex-col items-center">
          <div className="mb-4 w-full flex justify-center">
            <input
              type="text"
              id="issueLink"
              name="issueLink"
              value={issueLink}
              onChange={e => setIssueLink(e.target.value)}
              className="w-80 max-w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300 font-sans text-gray-100 text-base text-center placeholder-gray-400"
              placeholder="https://github.com/owner/repo/issues/123"
              aria-required="true"
              aria-invalid={!!error}
              disabled={isLoading}
            />
          </div>

          {/* Toggle Switches */}
          <div className="mb-6 w-full space-y-4">
            <div className="flex items-center justify-between">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={postComment}
                  onChange={(e) => setPostComment(e.target.checked)}
                  disabled={isLoading || requireApproval}
                  className="sr-only"
                />
                <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  postComment ? 'bg-blue-600' : 'bg-gray-600'
                } ${requireApproval ? 'opacity-50' : ''}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    postComment ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </div>
                <span className={`ml-3 text-gray-300 font-medium ${requireApproval ? 'opacity-50' : ''}`}>Post comment to GitHub</span>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={requireApproval}
                  onChange={(e) => {
                    setRequireApproval(e.target.checked);
                    if (e.target.checked) {
                      setPostComment(true); // HITL requires posting comments
                    }
                  }}
                  disabled={isLoading}
                  className="sr-only"
                />
                <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  requireApproval ? 'bg-green-600' : 'bg-gray-600'
                }`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    requireApproval ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </div>
                <span className="ml-3 text-gray-300 font-medium">Require human approval</span>
              </label>
            </div>
          </div>

          {/* Mode Explanation */}
          <div className="mb-4 w-full text-center">
            <p className="text-sm text-gray-400">
              {!postComment && !requireApproval && "📊 Analysis only - results shown here"}
              {postComment && !requireApproval && "🤖 Auto-comment - analysis posted directly to GitHub"}
              {requireApproval && "👤 Human approval - review and edit before posting to GitHub"}
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 px-8 py-2 rounded-full bg-blue-300 text-gray-900 font-sans font-medium text-base shadow-sm hover:bg-blue-200 transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none"
            aria-busy={isLoading}
          >
            {isLoading ? <Spinner /> : 'Analyze Issue'}
          </button>
        </form>
      </div>

      {/* WebSocket Connection Status */}
      {requireApproval && (
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
      )}

      {/* Real-time Agent Messages */}
      {requireApproval && (
        <div className="mt-8 bg-gray-800 p-6 rounded-lg shadow-xl max-w-4xl mx-auto">
          <h3 className="text-xl font-semibold mb-4 text-blue-200">
            Agent Conversation ({agentMessages.length} messages)
          </h3>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {agentMessages.length === 0 ? (
              <div className="text-gray-400 text-center py-4">
                Waiting for user messages...
              </div>
            ) : (
              agentMessages.map((message, index) => (
                <div key={index} className={`p-3 rounded-lg ${
                  message.source === 'user' ? 'bg-blue-900 text-blue-100' :
                  message.source === 'issue_reader' ? 'bg-purple-900 text-purple-100' :
                  message.source === 'researcher' ? 'bg-green-900 text-green-100' :
                  message.source === 'reasoner' ? 'bg-orange-900 text-orange-100' :
                  message.source === 'user_proxy' ? 'bg-pink-900 text-pink-100' :
                  message.source === 'commenter' ? 'bg-teal-900 text-teal-100' :
                  'bg-gray-700 text-gray-100'
                }`}>
                  <div className="font-semibold text-sm mb-1">
                    {message.source === 'user' ? '👤 You' :
                     message.source === 'issue_reader' ? '📖 Issue Reader' :
                     message.source === 'researcher' ? '🔍 Researcher' :
                     message.source === 'reasoner' ? '🧠 Reasoner' :
                     message.source === 'user_proxy' ? '👤 Human Approval' :
                     message.source === 'commenter' ? '💬 Commenter' :
                     message.source}
                  </div>
                  <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* User Input Section (shown only when user_proxy agent requests input) */}
      {showUserInput && (
        <div className="mt-8 bg-yellow-900/20 border border-yellow-600 p-6 rounded-lg shadow-xl max-w-2xl mx-auto">
          <h3 className="text-xl font-semibold mb-4 text-yellow-200">🤔 Human Approval Required</h3>
          <p className="text-yellow-100 mb-4">{userInputPrompt}</p>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-yellow-200 mb-2">
              Comment Draft:
            </label>
            <textarea
              value={editedText || currentDraft}
              onChange={(e) => setEditedText(e.target.value)}
              className="w-full px-4 py-2 bg-gray-900 border border-yellow-600 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-300 font-sans text-gray-100 text-sm resize-vertical min-h-[120px]"
              placeholder="Edit the comment draft here..."
            />
          </div>
          
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleUserInputSubmit}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              💬 Approve & Post Comment
            </button>
          </div>
        </div>
      )}

      <div className="mt-8">
        {error && (
          <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
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
