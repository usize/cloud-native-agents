/**
 * UserInputSection Component
 * 
 * A component for handling human-in-the-loop (HITL) user input during agent conversations.
 * Displays when the user_proxy agent requests human approval for a draft comment.
 * 
 * Features:
 * - Conditional rendering (only shows when user input is requested)
 * - Draft comment display and editing
 * - Textarea for comment modification
 * - Submit button for approval and posting
 * - Styled with warning/approval colors (yellow theme)
 * - Responsive design
 * 
 * 
 * Usage:
 * ```typescript
 * <UserInputSection
 *   showUserInput={showUserInput}
 *   userInputPrompt={userInputPrompt}
 *   editedText={editedText}
 *   currentDraft={currentDraft}
 *   onEditedTextChange={setEditedText}
 *   onSubmit={handleUserInputSubmit}
 * />
 * ```
 */

import React from 'react';

interface UserInputSectionProps {
  showUserInput: boolean;
  userInputPrompt: string;
  editedText: string;
  currentDraft: string;
  onEditedTextChange: (value: string) => void;
  onSubmit: () => void;
}

const UserInputSection: React.FC<UserInputSectionProps> = ({
  showUserInput,
  userInputPrompt,
  editedText,
  currentDraft,
  onEditedTextChange,
  onSubmit
}) => {
  if (!showUserInput) return null;

  return (
    <div className="mt-8 bg-yellow-900/20 border border-yellow-600 p-6 rounded-lg shadow-xl max-w-2xl mx-auto">
      <h3 className="text-xl font-semibold mb-4 text-yellow-200">🤔 Human Approval Required</h3>
      <p className="text-yellow-100 mb-4">{userInputPrompt}</p>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-yellow-200 mb-2">
          Comment Draft:
        </label>
        <textarea
          value={editedText || currentDraft}
          onChange={(e) => onEditedTextChange(e.target.value)}
          className="w-full px-4 py-2 bg-gray-900 border border-yellow-600 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-300 font-sans text-gray-100 text-sm resize-vertical min-h-[120px]"
          placeholder="Edit the comment draft here..."
        />
      </div>
      
      <div className="flex gap-4 justify-center">
        <button
          onClick={onSubmit}
          className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          💬 Approve & Post Comment
        </button>
      </div>
    </div>
  );
};

export default UserInputSection; 