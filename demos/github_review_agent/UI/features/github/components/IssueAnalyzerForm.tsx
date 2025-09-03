/**
 * IssueAnalyzerForm Component
 * 
 * A form component for the GitHub Issue Analyzer that handles user input and mode selection.
 * Provides controls for entering GitHub issue URLs and selecting analysis modes.
 * 
 * Features:
 * - GitHub issue URL input with validation
 * - Toggle switches for different analysis modes:
 *   - Analysis only (no comment posting)
 *   - Auto-comment (automatic comment posting)
 *   - Human approval (HITL mode with manual review)
 * - Real-time mode explanation
 * - Loading state handling
 * - Error display
 * 
 * Usage:
 * ```typescript
 * <IssueAnalyzerForm
 *   issueLink={issueLink}
 *   postComment={postComment}
 *   requireApproval={requireApproval}
 *   isLoading={isLoading}
 *   error={error}
 *   onIssueLinkChange={setIssueLink}
 *   onPostCommentChange={setPostComment}
 *   onRequireApprovalChange={setRequireApproval}
 *   onSubmit={handleSubmit}
 * />
 * ```
 */

import React from 'react';
import Spinner from '../../../components/Spinner';

interface IssueAnalyzerFormProps {
  issueLink: string;
  postComment: boolean;
  requireApproval: boolean;
  isLoading: boolean;
  error: string;
  onIssueLinkChange: (value: string) => void;
  onPostCommentChange: (value: boolean) => void;
  onRequireApprovalChange: (value: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const IssueAnalyzerForm: React.FC<IssueAnalyzerFormProps> = ({
  issueLink,
  postComment,
  requireApproval,
  isLoading,
  error,
  onIssueLinkChange,
  onPostCommentChange,
  onRequireApprovalChange,
  onSubmit
}) => {
  return (
    <div className="bg-gray-800/90 max-w-lg mx-auto p-8 rounded-2xl shadow-2xl mt-12">
      <p className="text-gray-300 mb-6 font-sans text-center">
        Enter the URL of a GitHub issue to have the agent team analyze it. 
      </p>
      <form onSubmit={onSubmit} aria-label="GitHub Issue Analyzer Form" className="flex flex-col items-center">
        <div className="mb-4 w-full flex justify-center">
          <input
            type="text"
            id="issueLink"
            name="issueLink"
            value={issueLink}
            onChange={e => onIssueLinkChange(e.target.value)}
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
                onChange={(e) => onPostCommentChange(e.target.checked)}
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
                onChange={(e) => onRequireApprovalChange(e.target.checked)}
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
  );
};

export default IssueAnalyzerForm; 