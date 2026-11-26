import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, CheckCircle2, Sparkles, Send, Edit3, ChevronDown, ChevronUp, Heart, ThumbsUp, BarChart3, Download, Loader2, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useBrand } from '../config/BrandContext';
import {
  FeedbackSubmission,
  USER_FEEDBACK_KEY,
} from '../data/feedbackData';
import {
  submitEventFeedback,
  subscribeEventFeedback,
} from '../services/firestoreService';

export interface EventFeedbackData {
  docId?: string;
  overallRating: number;
  categoryRatings: {
    content: number;
    venue: number;
    organization: number;
  };
  selectedTags: string[];
  comment: string;
  name: string;
  company: string;
  isAnonymous: boolean;
  submittedAt: string;
}


const QUICK_TAGS = [
  'Inspiring Keynotes',
  'Actionable Insights',
  'Great Networking',
  'Smooth Logistics',
  'Superb Catering',
  'Clear Retail Strategy',
  'Helpful Q&A Sessions',
  'Valuable 1:1 Discussions',
];

const RATING_DESCRIPTIONS: Record<number, string> = {
  1: 'Needs Improvement',
  2: 'Fair Experience',
  3: 'Good & Valuable',
  4: 'Very Good Summit',
  5: 'Exceptional Experience',
};

// Seeded sample feedback from fellow brand attendees to make the section feel alive
const SAMPLE_COMMUNITY_FEEDBACK = [
  {
    rating: 5,
    tag: 'Inspiring Keynotes',
    text: 'Peter and the leadership team gave clear, transparent visibility into 2027 retail space priorities. Super energizing summit.',
    author: 'Commercial Partner',
    time: '20 mins ago',
  },
  {
    rating: 5,
    tag: 'Smooth Logistics',
    text: 'The Brewery venue is brilliant and the running order moved exactly to schedule. App made Q&A easy.',
    author: 'Health & Beauty Brand Director',
    time: '45 mins ago',
  },
  {
    rating: 4,
    tag: 'Actionable Insights',
    text: 'Great breakdown of high-street customer demographics and digital loyalty app trends.',
    author: 'Category Lead · FMCG',
    time: '1 hour ago',
  },
];

export const EventFeedback: React.FC = () => {
  const { config } = useBrand();

  const [feedback, setFeedback] = useState<EventFeedbackData | null>(() => {
    try {
      const saved = localStorage.getItem(USER_FEEDBACK_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [allSubmissions, setAllSubmissions] = useState<FeedbackSubmission[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Subscribe to real-time Firestore event_feedback for live community average
  useEffect(() => {
    const unsubscribe = subscribeEventFeedback(
      (items) => {
        setAllSubmissions(items);
      },
      () => {
        // Keep quiet fallback if Firestore rules restrict public list reads on event_feedback
      }
    );
    return () => unsubscribe();
  }, []);

  // Form states
  const [overallRating, setOverallRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [contentRating, setContentRating] = useState<number>(0);
  const [venueRating, setVenueRating] = useState<number>(0);
  const [organizationRating, setOrganizationRating] = useState<number>(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [showDetailedCategories, setShowDetailedCategories] = useState(false);
  const [showCommunityReviews, setShowCommunityReviews] = useState(false);

  // Load existing data if editing or saved
  useEffect(() => {
    if (feedback) {
      setOverallRating(feedback.overallRating);
      setContentRating(feedback.categoryRatings?.content || 0);
      setVenueRating(feedback.categoryRatings?.venue || 0);
      setOrganizationRating(feedback.categoryRatings?.organization || 0);
      setSelectedTags(feedback.selectedTags || []);
      setComment(feedback.comment || '');
      setName(feedback.name || '');
      setCompany(feedback.company || '');
      setIsAnonymous(feedback.isAnonymous ?? true);
    }
  }, [feedback]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleRatingClick = (rating: number) => {
    setOverallRating(rating);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (overallRating === 0 || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const formattedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const payload: Omit<FeedbackSubmission, 'id' | 'timestamp'> = {
      overallRating,
      categoryRatings: {
        content: contentRating || overallRating,
        venue: venueRating || overallRating,
        organization: organizationRating || overallRating,
      },
      selectedTags,
      comment: comment.trim(),
      name: isAnonymous ? 'Anonymous Delegate' : name.trim() || 'Brand Partner',
      company: isAnonymous ? '' : company.trim(),
      isAnonymous,
      submittedAt: formattedTime,
    };

    try {
      const docId = await submitEventFeedback(payload, feedback?.docId);
      const newFeedback: EventFeedbackData = {
        ...payload,
        docId,
      };

      try {
        localStorage.setItem(USER_FEEDBACK_KEY, JSON.stringify(newFeedback));
      } catch {
        // ignore
      }

      setFeedback(newFeedback);
      setIsEditing(false);

      // Trigger celebratory confetti
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
          colors: [config.colors.primaryAccent || '#E5007D', '#000000', '#FCD34D'],
        });
      } catch {
        // ignore
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unable to save feedback.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEditing = () => {
    setSubmitError(null);
    setIsEditing(true);
  };

  const activeDisplayRating = hoverRating || overallRating;
  const avgOverallRating =
    allSubmissions.length > 0
      ? (allSubmissions.reduce((acc, curr) => acc + curr.overallRating, 0) / allSubmissions.length).toFixed(1)
      : '—';

  return (
    <section className="bg-white border-2 border-neutral-200 rounded-3xl p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center">
            <Star className="w-4 h-4 text-brand fill-brand" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-black tracking-tight">Event Experience Feedback</h3>
            <p className="text-[11px] text-neutral-500">Rate your day &amp; share suggestions</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold tracking-wider uppercase text-neutral-400 bg-neutral-100 px-2.5 py-1 rounded-full">
            Live
          </span>
        </div>
      </div>

      {/* Submitted View */}
      {feedback && !isEditing ? (
        <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 space-y-3.5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-black">Feedback Recorded!</div>
                <div className="text-[11px] text-neutral-500">Submitted at {feedback.submittedAt}</div>
              </div>
            </div>

            <button
              onClick={handleStartEditing}
              className="flex items-center gap-1 text-xs font-semibold text-black hover:text-brand bg-white border border-neutral-200 hover:border-black rounded-lg px-2.5 py-1.5 transition-colors tap-highlight"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          </div>

          {/* User's Rating Summary */}
          <div className="bg-white rounded-xl p-3 border border-neutral-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-600 font-medium">Your Overall Rating:</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= feedback.overallRating
                        ? 'text-brand fill-brand'
                        : 'text-neutral-200'
                    }`}
                  />
                ))}
                <span className="text-xs font-bold ml-1.5 text-black">
                  {feedback.overallRating}/5
                </span>
              </div>
            </div>

            {feedback.selectedTags.length > 0 && (
              <div className="pt-1.5 border-t border-neutral-100 flex flex-wrap gap-1.5">
                {feedback.selectedTags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] font-semibold bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded-md"
                  >
                    ✓ {tag}
                  </span>
                ))}
              </div>
            )}

            {feedback.comment && (
              <div className="pt-2 border-t border-neutral-100">
                <p className="text-xs italic text-neutral-700">
                  &ldquo;{feedback.comment}&rdquo;
                </p>
                <div className="text-[10px] text-neutral-500 mt-1">
                  — {feedback.isAnonymous ? 'Anonymous Supplier' : `${feedback.name}${feedback.company ? ` · ${feedback.company}` : ''}`}
                </div>
              </div>
            )}
          </div>

          <p className="text-[11px] text-neutral-500 text-center">
            Thank you! Your ratings are compiled in real-time for the executive debrief.
          </p>
        </div>
      ) : (
        /* Feedback Entry Form */
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Main Star Rating Bar */}
          <div className="text-center py-2 bg-neutral-50 rounded-2xl border border-neutral-200/80 p-3">
            <label className="block text-xs font-bold text-neutral-800 mb-1.5">
              How has your summit experience been overall?
            </label>

            <div className="flex items-center justify-center gap-1.5 my-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = star <= activeDisplayRating;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleRatingClick(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    aria-label={`${star} star${star > 1 ? 's' : ''}`}
                    className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center transition-transform hover:scale-110 active:scale-95 focus:outline-none"
                  >
                    <Star
                      className={`w-7 h-7 transition-colors ${
                        isFilled
                          ? 'text-brand fill-brand drop-shadow-sm'
                          : 'text-neutral-300 hover:text-neutral-400'
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            {/* Rating Description Label */}
            <div className="h-4">
              <span className="text-xs font-semibold text-black tracking-wide">
                {activeDisplayRating > 0
                  ? RATING_DESCRIPTIONS[activeDisplayRating]
                  : 'Tap stars to rate'}
              </span>
            </div>
          </div>

          {/* Quick Highlight Tags */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-neutral-700">
              What stood out today? <span className="text-neutral-400 font-normal">(select all that apply)</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all min-h-[36px] flex items-center gap-1 ${
                      isSelected
                        ? 'bg-black text-white border-black font-semibold shadow-xs'
                        : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    {isSelected && <span className="text-brand">●</span>}
                    <span>{tag}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detailed Categories Collapsible */}
          <div className="border border-neutral-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowDetailedCategories(!showDetailedCategories)}
              className="w-full flex items-center justify-between p-3 bg-white text-left text-xs font-semibold text-neutral-800 hover:bg-neutral-50 transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand" />
                <span>Rate specific areas <span className="text-neutral-400 font-normal">(Content, Venue, Logistics)</span></span>
              </div>
              {showDetailedCategories ? (
                <ChevronUp className="w-4 h-4 text-neutral-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-neutral-500" />
              )}
            </button>

            {showDetailedCategories && (
              <div className="p-3 bg-neutral-50/70 border-t border-neutral-200 space-y-2.5">
                {/* Content */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-700 font-medium">Keynotes &amp; Stage Content</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setContentRating(s)}
                        className="p-1 min-w-[28px] min-h-[28px] flex items-center justify-center hover:scale-110 transition-transform"
                      >
                        <Star
                          className={`w-4 h-4 ${
                            s <= (contentRating || overallRating)
                              ? 'text-brand fill-brand'
                              : 'text-neutral-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Venue */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-700 font-medium">The Brewery Venue &amp; Catering</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setVenueRating(s)}
                        className="p-1 min-w-[28px] min-h-[28px] flex items-center justify-center hover:scale-110 transition-transform"
                      >
                        <Star
                          className={`w-4 h-4 ${
                            s <= (venueRating || overallRating)
                              ? 'text-brand fill-brand'
                              : 'text-neutral-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Organization */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-700 font-medium">Schedule &amp; Event App</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setOrganizationRating(s)}
                        className="p-1 min-w-[28px] min-h-[28px] flex items-center justify-center hover:scale-110 transition-transform"
                      >
                        <Star
                          className={`w-4 h-4 ${
                            s <= (organizationRating || overallRating)
                              ? 'text-brand fill-brand'
                              : 'text-neutral-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Text Comments */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-neutral-700">
              Comments or Suggestions <span className="text-neutral-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share thoughts on the presentations, retail strategy, or ideas for next year's summit..."
              rows={3}
              className="w-full text-xs p-3 border border-neutral-300 rounded-xl focus:border-black focus:ring-1 focus:ring-black outline-none placeholder:text-neutral-400 resize-none transition-colors"
            />
          </div>

          {/* Attribution & Privacy */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setIsAnonymous(!isAnonymous)}
              className="flex items-center gap-2 text-xs text-neutral-600 hover:text-black min-h-[44px]"
            >
              <div
                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                  isAnonymous ? 'bg-black border-black text-white' : 'border-neutral-300 bg-white'
                }`}
              >
                {isAnonymous && <span className="text-[10px] leading-none">✓</span>}
              </div>
              <span className="select-none">Submit anonymously</span>
            </button>

            {!isAnonymous && (
              <span className="text-[11px] text-neutral-500">
                Visible to conference leadership
              </span>
            )}
          </div>

          {!isAnonymous && (
            <div className="grid grid-cols-2 gap-2 pt-1 animate-fadeIn">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="text-xs p-2.5 border border-neutral-300 rounded-xl focus:border-black outline-none"
              />
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Brand / Company"
                className="text-xs p-2.5 border border-neutral-300 rounded-xl focus:border-black outline-none"
              />
            </div>
          )}

          {submitError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Submit Action */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={overallRating === 0 || isSubmitting}
              className={`flex-1 py-3 px-4 rounded-full font-bold text-xs flex items-center justify-center gap-2 transition-all tap-highlight min-h-[44px] ${
                overallRating > 0 && !isSubmitting
                  ? 'bg-black text-white hover:bg-neutral-800 active:scale-98 shadow-sm cursor-pointer'
                  : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving to Cloud...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>{overallRating > 0 ? 'Submit Event Feedback' : 'Select a Star Rating to Submit'}</span>
                </>
              )}
            </button>

            {isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="border border-neutral-300 text-neutral-700 hover:border-black py-3 px-4 rounded-full text-xs font-semibold min-h-[44px]"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      {/* Community Delegate Pulse Strip */}
      <div className="pt-2 border-t border-neutral-100 space-y-2">
        <button
          type="button"
          onClick={() => setShowCommunityReviews(!showCommunityReviews)}
          className="w-full flex items-center justify-between text-[11px] text-neutral-500 hover:text-black py-1 font-medium transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
            <span className="tabular-nums">
              {allSubmissions.length > 0
                ? `${avgOverallRating} / 5.0 Average Rating · ${allSubmissions.length} Live ${allSubmissions.length === 1 ? 'Response' : 'Responses'}`
                : 'Synced live with conference leadership'}
            </span>
          </span>
          <span className="text-brand font-semibold flex items-center gap-0.5">
            {showCommunityReviews ? 'Hide' : 'Highlights'}
            {showCommunityReviews ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </span>
        </button>

        {showCommunityReviews && (
          <div className="mt-2.5 space-y-2 pt-1 border-t border-neutral-100">
            {(allSubmissions.filter((s) => s.comment).length > 0
              ? allSubmissions
                  .filter((s) => s.comment)
                  .slice(0, 3)
                  .map((item) => ({
                    rating: item.overallRating,
                    author: item.isAnonymous ? 'Anonymous Delegate' : item.name,
                    time: item.submittedAt,
                    text: item.comment,
                  }))
              : SAMPLE_COMMUNITY_FEEDBACK
            ).map((sample, idx) => (
              <div key={idx} className="bg-neutral-50 rounded-xl p-2.5 text-xs space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1 text-brand font-bold">
                    <span>★ {sample.rating}.0</span>
                    <span className="text-neutral-400">·</span>
                    <span className="text-neutral-700 font-medium">{sample.author}</span>
                  </div>
                  <span className="text-neutral-400">{sample.time}</span>
                </div>
                <p className="text-neutral-600 text-[11px] leading-relaxed">
                  &ldquo;{sample.text}&rdquo;
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
