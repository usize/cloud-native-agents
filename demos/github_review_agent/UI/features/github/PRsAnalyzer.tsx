import React, { useState } from 'react';

const PRsAnalyzer: React.FC = () => {
  const [prLink, setPrLink] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div>
      <h1 className="text-3xl font-medium text-gray-100 mb-6 font-sans text-center">PR analyzer</h1>
      <div className="bg-gray-800/90 max-w-lg mx-auto p-8 rounded-2xl shadow-2xl mt-12">
        <p className="text-gray-300 mb-6 font-sans text-center">
          Enter the URL of a GitHub pull request to analyze it. (Feature coming soon)
        </p>
        <form className="flex flex-col items-center">
          <div className="mb-4 w-full flex justify-center">
            <input
              type="text"
              id="prLink"
              name="prLink"
              value={prLink}
              onChange={e => setPrLink(e.target.value)}
              className="w-80 max-w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300 font-sans text-gray-100 text-base text-center placeholder-gray-400"
              placeholder="https://github.com/owner/repo/pull/123"
              aria-required="true"
              aria-invalid={false}
              disabled={isLoading}
            />
          </div>
          <button
            type="button"
            disabled={isLoading}
            className="mt-2 px-8 py-2 rounded-full bg-blue-300 text-gray-900 font-sans font-medium text-base shadow-sm hover:bg-blue-200 transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none"
          >
            {isLoading ? '...' : 'Analyze PR'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PRsAnalyzer; 
