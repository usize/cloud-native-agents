import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import Spinner from '../../components/Spinner';
import { API_BASE_URL } from '../../config/config';

const IssuesAnalyzer: React.FC = () => {
  const [issueLink, setIssueLink] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueLink || !issueLink.includes('github.com') || !issueLink.includes('/issues/')) {
      setError('Please enter a valid GitHub issue URL.');
      return;
    }
    setIsLoading(true);
    setError('');
    setResponse('');
    setSuccess('');
    try {
      const apiResponse = await fetch(`${API_BASE_URL}/issue_next_steps_analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issue_link: issueLink }),
      });
      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        throw new Error(errorData.detail || `HTTP error! Status: ${apiResponse.status}`);
      }
      const result = await apiResponse.json();
      setResponse(result.response);
      setSuccess('Analysis completed successfully!');
    } catch (err: any) {
      setError(err.message);
      console.error('API call failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

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
        {response && (
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
};

export default IssuesAnalyzer; 
