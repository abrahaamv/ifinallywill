/**
 * Feedback Modal Component
 * In-widget post-conversation survey to avoid 40% of AI calls
 */

import { useState } from 'react';
import { Star, X } from 'lucide-react';

export interface FeedbackModalProps {
  sessionId: string;
  endUserId: string;
  onSubmit: (feedback: {
    rating: number;
    problemSolved: boolean;
    wouldRecommend?: boolean;
    feedbackText?: string;
  }) => Promise<void>;
  onLater: () => void;
  onClose?: () => void;
}

export function FeedbackModal({
  sessionId: _sessionId,
  endUserId: _endUserId,
  onSubmit,
  onLater,
  onClose,
}: FeedbackModalProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [problemSolved, setProblemSolved] = useState<boolean | null>(null);
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (rating === 0 || problemSolved === null) {
      setError('Please provide a rating and answer if your problem was solved');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        rating,
        problemSolved,
        wouldRecommend: wouldRecommend || undefined,
        feedbackText: feedbackText.trim() || undefined,
      });
    } catch (err) {
      setError('Failed to submit feedback. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleLater = () => {
    onLater();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full space-y-4 shadow-xl relative animate-fade-in">
        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        )}

        {/* Header */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            How was your experience?
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Your feedback helps us improve our service
          </p>
        </div>

        {/* 5-star rating */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Rate your experience</label>
          <div className="flex gap-2 justify-center">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="hover:scale-110 transition transform"
                aria-label={`Rate ${star} stars`}
              >
                <Star
                  className={
                    (hoverRating || rating) >= star
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }
                  size={32}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-xs text-center text-gray-600">
              {rating === 5 && '⭐ Excellent!'}
              {rating === 4 && '👍 Great!'}
              {rating === 3 && '😊 Good'}
              {rating === 2 && '😐 Fair'}
              {rating === 1 && '😞 Needs improvement'}
            </p>
          )}
        </div>

        {/* Problem solved? */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Was your problem solved?
          </label>
          <div className="flex gap-4">
            <button
              onClick={() => setProblemSolved(true)}
              className={`flex-1 py-2 rounded-md font-medium transition ${
                problemSolved === true
                  ? 'bg-green-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ✅ Yes
            </button>
            <button
              onClick={() => setProblemSolved(false)}
              className={`flex-1 py-2 rounded-md font-medium transition ${
                problemSolved === false
                  ? 'bg-red-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ❌ No
            </button>
          </div>
        </div>

        {/* Would recommend? (optional) */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Would you recommend us to a friend? (optional)
          </label>
          <div className="flex gap-4">
            <button
              onClick={() => setWouldRecommend(true)}
              className={`flex-1 py-2 rounded-md font-medium transition ${
                wouldRecommend === true
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              👍 Yes
            </button>
            <button
              onClick={() => setWouldRecommend(false)}
              className={`flex-1 py-2 rounded-md font-medium transition ${
                wouldRecommend === false
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              👎 No
            </button>
          </div>
        </div>

        {/* Additional feedback (optional) */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Any additional feedback? (optional)
          </label>
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="Tell us more about your experience..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={3}
            maxLength={500}
          />
          <p className="text-xs text-gray-500 text-right">
            {feedbackText.length}/500
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 pt-2">
          <button
            onClick={handleSubmit}
            disabled={rating === 0 || problemSolved === null || isSubmitting}
            className="flex-1 bg-blue-600 text-white py-2.5 rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
          <button
            onClick={handleLater}
            disabled={isSubmitting}
            className="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-md font-medium transition disabled:opacity-50"
          >
            Later
          </button>
        </div>

        {/* Info message */}
        <p className="text-xs text-gray-500 text-center pt-2 border-t border-gray-200">
          If you skip this, we'll follow up via phone or SMS for quick feedback
        </p>
      </div>
    </div>
  );
}
