/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface FeedbackSubmission {
  id: string;
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
  timestamp: number;
}

export const FEEDBACK_STORAGE_KEY = 'sd_all_feedback_submissions';
export const USER_FEEDBACK_KEY = 'sd_event_feedback_2026';

export const INITIAL_FEEDBACK_ENTRIES: FeedbackSubmission[] = [
  {
    id: 'fb-1',
    overallRating: 5,
    categoryRatings: { content: 5, venue: 5, organization: 5 },
    selectedTags: ['Inspiring Keynotes', 'Clear Retail Strategy', 'Actionable Insights'],
    comment: 'Peter Macnab and the leadership team gave clear, transparent visibility into 2027 high-street priorities. Super energizing summit.',
    name: 'Sarah Jenkins',
    company: 'L\'Oréal UK Commercial Team',
    isAnonymous: false,
    submittedAt: '14:42',
    timestamp: 1728999720000,
  },
  {
    id: 'fb-2',
    overallRating: 5,
    categoryRatings: { content: 5, venue: 4, organization: 5 },
    selectedTags: ['Smooth Logistics', 'Helpful Q&A Sessions'],
    comment: 'The Brewery venue is brilliant and the running order moved exactly to schedule. The live app made asking questions to the stage frictionless.',
    name: 'Anonymous Delegate',
    company: '',
    isAnonymous: true,
    submittedAt: '14:28',
    timestamp: 1728998880000,
  },
  {
    id: 'fb-3',
    overallRating: 4,
    categoryRatings: { content: 5, venue: 4, organization: 4 },
    selectedTags: ['Actionable Insights', 'Valuable 1:1 Discussions'],
    comment: 'Great breakdown of high-street customer demographics and digital loyalty app trends. Would love even more time for the bilateral breakout meetings.',
    name: 'David Reynolds',
    company: 'Category Lead · Haleon Consumer Health',
    isAnonymous: false,
    submittedAt: '14:15',
    timestamp: 1728998100000,
  },
  {
    id: 'fb-4',
    overallRating: 5,
    categoryRatings: { content: 5, venue: 5, organization: 5 },
    selectedTags: ['Superb Catering', 'Great Networking', 'Inspiring Keynotes'],
    comment: 'Fantastic luncheon at the Sugar Rooms and great conversations with the Superdrug commercial category managers.',
    name: 'Elena Rostova',
    company: 'Coty Beauty Group',
    isAnonymous: false,
    submittedAt: '13:55',
    timestamp: 1728996900000,
  },
  {
    id: 'fb-5',
    overallRating: 4,
    categoryRatings: { content: 4, venue: 4, organization: 5 },
    selectedTags: ['Clear Retail Strategy', 'Smooth Logistics'],
    comment: 'The ESG and sustainability session by Clare demonstrated genuine partnership. Looking forward to joint refill station pilots.',
    name: 'Anonymous Delegate',
    company: '',
    isAnonymous: true,
    submittedAt: '13:40',
    timestamp: 1728996000000,
  },
  {
    id: 'fb-6',
    overallRating: 5,
    categoryRatings: { content: 5, venue: 5, organization: 5 },
    selectedTags: ['Helpful Q&A Sessions', 'Inspiring Keynotes'],
    comment: 'The digital app and confidence monitor on stage kept discussions crisp and interactive. Excellent execution by the Superdrug events team.',
    name: 'Marcus Thorne',
    company: 'Managing Director · Baylis & Harding',
    isAnonymous: false,
    submittedAt: '13:20',
    timestamp: 1728994800000,
  },
  {
    id: 'fb-7',
    overallRating: 4,
    categoryRatings: { content: 4, venue: 5, organization: 4 },
    selectedTags: ['Great Networking', 'Superb Catering'],
    comment: 'Excellent conference venue choice. Coffee breaks and networking zones were buzzing with brand representatives.',
    name: 'Chloe Simmons',
    company: 'National Account Manager · Unilever Personal Care',
    isAnonymous: false,
    submittedAt: '12:50',
    timestamp: 1728993000000,
  },
  {
    id: 'fb-8',
    overallRating: 5,
    categoryRatings: { content: 5, venue: 5, organization: 5 },
    selectedTags: ['Clear Retail Strategy', 'Valuable 1:1 Discussions', 'Actionable Insights'],
    comment: 'Best supplier conference in years. Clear retail targets, pragmatic merchandising timelines, and an honest appetite for innovation.',
    name: 'Richard Vance',
    company: 'Commercial Director · PZ Cussons',
    isAnonymous: false,
    submittedAt: '12:15',
    timestamp: 1728990900000,
  },
  {
    id: 'fb-9',
    overallRating: 4,
    categoryRatings: { content: 4, venue: 4, organization: 4 },
    selectedTags: ['Actionable Insights', 'Smooth Logistics'],
    comment: 'Loved the supply chain delivery accuracy deep-dive. Good to see concrete benchmarks for Christmas peak readiness.',
    name: 'Anonymous Delegate',
    company: '',
    isAnonymous: true,
    submittedAt: '11:45',
    timestamp: 1728989100000,
  },
  {
    id: 'fb-10',
    overallRating: 5,
    categoryRatings: { content: 5, venue: 5, organization: 5 },
    selectedTags: ['Inspiring Keynotes', 'Great Networking'],
    comment: 'Health & Beauty Card loyalty stats were mind-blowing. Truly excited for our upcoming exclusive endcap promotions.',
    name: 'Aisha Patel',
    company: 'Senior Brand Manager · Kenvue',
    isAnonymous: false,
    submittedAt: '11:10',
    timestamp: 1728987000000,
  },
];

/**
 * Loads all feedback submissions from storage or initializes with defaults
 */
export function getAllFeedbackSubmissions(): FeedbackSubmission[] {
  try {
    const raw = localStorage.getItem(FEEDBACK_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(INITIAL_FEEDBACK_ENTRIES));
      return INITIAL_FEEDBACK_ENTRIES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_FEEDBACK_ENTRIES;
  } catch {
    return INITIAL_FEEDBACK_ENTRIES;
  }
}

/**
 * Adds a new feedback submission to the shared conference submissions store
 */
export function recordFeedbackSubmission(
  submission: Omit<FeedbackSubmission, 'id' | 'timestamp'>
): FeedbackSubmission {
  const current = getAllFeedbackSubmissions();
  const newRecord: FeedbackSubmission = {
    ...submission,
    id: `fb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: Date.now(),
  };

  const updated = [newRecord, ...current];
  try {
    localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save feedback submission:', err);
  }

  return newRecord;
}

/**
 * Converts feedback records into a clean, RFC-compliant CSV string
 */
export function generateFeedbackCSV(submissions: FeedbackSubmission[]): string {
  const headers = [
    'Submission ID',
    'Date / Time',
    'Overall Rating (out of 5)',
    'Content & Keynotes (1-5)',
    'The Brewery Venue (1-5)',
    'Schedule & App (1-5)',
    'Selected Highlight Tags',
    'Delegate Name',
    'Brand / Company',
    'Anonymous Submission',
    'Verbatim Comments / Feedback',
  ];

  const escapeCSV = (val: unknown): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = submissions.map((item) => {
    return [
      escapeCSV(item.id),
      escapeCSV(item.submittedAt),
      escapeCSV(item.overallRating),
      escapeCSV(item.categoryRatings?.content ?? item.overallRating),
      escapeCSV(item.categoryRatings?.venue ?? item.overallRating),
      escapeCSV(item.categoryRatings?.organization ?? item.overallRating),
      escapeCSV(item.selectedTags?.join('; ') || 'None'),
      escapeCSV(item.name || 'Anonymous'),
      escapeCSV(item.company || 'N/A'),
      escapeCSV(item.isAnonymous ? 'Yes' : 'No'),
      escapeCSV(item.comment || ''),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\r\n');
}

/**
 * Triggers a browser download of the feedback CSV
 */
export function downloadFeedbackCSV(
  submissions: FeedbackSubmission[],
  filename = 'superdrug-supplier-conference-feedback-2026.csv'
): boolean {
  try {
    const csvContent = generateFeedbackCSV(submissions);
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch (err) {
    console.error('Failed to trigger CSV download:', err);
    return false;
  }
}
