export interface Session {
  id: string;
  day: number;
  time: string;
  endTime: string;
  title: string;
  stage: string;
  presenters: string;
  speakers: { name: string; title?: string; company?: string }[];
  description: string;
  track: 'Plenary' | 'Trading' | 'Supply Chain' | 'Healthcare' | 'Break' | 'Awards';
  isBreak?: boolean;
  isLive?: boolean;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface Poll {
  id: string;
  question: string;
  sessionTitle: string;
  totalVotes: number;
  options: PollOption[];
  userVotedOptionId?: string;
  resultsRevealed?: boolean;
  isActive?: boolean;
}

export interface QAQuestion {
  id: string;
  author: string;
  role: string;
  targetSpeaker: string;
  text: string;
  timestamp: string;
  upvotes: number;
  isUpvoted?: boolean;
  answered?: boolean;
}

export interface Speaker {
  id: string;
  name: string;
  role: string;
  sessionTitle: string;
  bio: string;
}

export const CONFERENCE_INFO = {
  name: 'Superdrug Supplier Conference 2026',
  tagline: 'Partnering for Growth · Innovation & Retail Leadership',
  date: 'Thursday 15th October 2026',
  dateShort: '15 Oct 2026',
  eventStartIso: '2026-10-15T08:30:00+01:00',
  eventEndIso: '2026-10-15T19:00:00+01:00',
  venue: 'The Brewery, London',
  address: '52 Chiswell Street, London EC1Y 4SD',
  delegateCount: '350+ Partner Brands',
};

export const INITIAL_SESSIONS: Session[] = [
  {
    id: 's-reg',
    day: 1,
    time: '08:30',
    endTime: '09:15',
    title: 'Registration & Morning Coffee',
    stage: 'King George III Room',
    presenters: 'Events & Commercial Team',
    speakers: [{ name: 'Commercial Partnership Team' }],
    description: 'Arrive, register your digital supplier badge, enjoy specialty coffee, and network before opening remarks.',
    track: 'Break',
    isBreak: true,
  },
  {
    id: 's1',
    day: 1,
    time: '09:15',
    endTime: '09:30',
    title: 'Host Intro',
    stage: 'The Porter Tun',
    presenters: 'Jade & Chloe',
    speakers: [
      { name: 'Jade', title: 'Conference Host & Commercial Leader' },
      { name: 'Chloe', title: 'Conference Host & Commercial Leader' },
    ],
    description: 'Welcome and framing for the Superdrug Supplier Conference 2026 at The Brewery London.',
    track: 'Plenary',
    isLive: true,
  },
  {
    id: 's2',
    day: 1,
    time: '09:30',
    endTime: '10:00',
    title: 'Accelerating Growth',
    stage: 'The Porter Tun',
    presenters: 'Simon & Charlie',
    speakers: [
      { name: 'Simon', title: 'Executive Director' },
      { name: 'Charlie', title: 'Commercial Director' },
    ],
    description: 'Key trading numbers, volume performance, customer growth metrics, and macro retail momentum across 800+ stores.',
    track: 'Plenary',
  },
  {
    id: 's3',
    day: 1,
    time: '10:00',
    endTime: '10:30',
    title: 'Supply Chain',
    stage: 'The Porter Tun',
    presenters: 'Mark & Rachel',
    speakers: [
      { name: 'Mark', title: 'Logistics Director' },
      { name: 'Rachel', title: 'Supply Chain Director' },
    ],
    description: 'Enhancing direct-to-store fulfillment, automated replenishment, EDI integration, and OTIF service level performance with suppliers.',
    track: 'Supply Chain',
  },
  {
    id: 's4',
    day: 1,
    time: '10:30',
    endTime: '11:00',
    title: 'GOBE Strategy',
    stage: 'The Porter Tun',
    presenters: 'Jamie, Emma, Shona & Sarah',
    speakers: [
      { name: 'Jamie', title: 'Commercial Lead' },
      { name: 'Emma', title: 'Brand Exclusives Lead' },
      { name: 'Shona', title: 'Own Brand Strategy' },
      { name: 'Sarah', title: 'Global Exclusives Lead' },
    ],
    description: 'Global Only at Superdrug / Brand Exclusives strategy, own-brand differentiation, viral beauty launches, and shared supplier value.',
    track: 'Trading',
  },
  {
    id: 's5',
    day: 1,
    time: '11:00',
    endTime: '11:30',
    title: 'Healthcare Strategy',
    stage: 'The Porter Tun',
    presenters: 'Craig, Chloe, Richard & Amit',
    speakers: [
      { name: 'Craig', title: 'Healthcare Director' },
      { name: 'Chloe', title: 'Clinical Services Lead' },
      { name: 'Richard', title: 'Pharmacy Commercial Lead' },
      { name: 'Amit', title: 'Head of OTC & Health' },
    ],
    description: 'Expanding high street primary health, NHS Pharmacy First consultations, self-care diagnostics, and OTC category innovations.',
    track: 'Healthcare',
  },
  {
    id: 's-break',
    day: 1,
    time: '11:30',
    endTime: '12:00',
    title: 'Break',
    stage: 'King George III & Courtyard',
    presenters: 'All Attendees',
    speakers: [{ name: 'Networking & Refreshments' }],
    description: 'Coffee, tea, and supplier networking in the historic Georgian brick vaults.',
    track: 'Break',
    isBreak: true,
  },
  {
    id: 's6',
    day: 1,
    time: '12:00',
    endTime: '12:45',
    title: 'Trading Strategies',
    stage: 'The Porter Tun',
    presenters: 'Meg, Laura, Jade, Jonathan, Jo & Ellie',
    speakers: [
      { name: 'Meg', title: 'Commercial Director' },
      { name: 'Laura', title: 'Head of Trading' },
      { name: 'Jade', title: 'Category Controller' },
      { name: 'Jonathan', title: 'Category Controller' },
      { name: 'Jo', title: 'Senior Buyer' },
      { name: 'Ellie', title: 'Senior Buyer' },
    ],
    description: 'Joint Business Planning (JBP), promotional mechanics, margin drivers, and category planning horizons for 2027.',
    track: 'Trading',
  },
  {
    id: 's7',
    day: 1,
    time: '12:45',
    endTime: '13:15',
    title: 'Comms, Online and Customer',
    stage: 'The Porter Tun',
    presenters: 'Matt, Caris & Helen',
    speakers: [
      { name: 'Matt', title: 'Marketing & Digital Director' },
      { name: 'Caris', title: 'Head of Digital & E-Commerce' },
      { name: 'Helen', title: 'Customer Experience & Loyalty' },
    ],
    description: 'Superdrug Retail Media Network, Health & Beauty app loyalty, digital media co-investments, and omnichannel customer touchpoints.',
    track: 'Trading',
  },
  {
    id: 's-lunch',
    day: 1,
    time: '13:15',
    endTime: '14:15',
    title: 'Lunch',
    stage: 'The Sugar Rooms & Courtyard',
    presenters: 'All Delegates & Buying Teams',
    speakers: [{ name: 'Seated Networking Luncheon' }],
    description: 'Two-course seated luncheon across the historic Sugar Rooms and cobbled courtyard.',
    track: 'Break',
    isBreak: true,
  },
  {
    id: 's8',
    day: 1,
    time: '14:15',
    endTime: '14:45',
    title: 'IPB & Ambassadors',
    stage: 'The Porter Tun',
    presenters: 'Craig, Charlie & RGMs',
    speakers: [
      { name: 'Craig', title: 'Healthcare Director' },
      { name: 'Charlie', title: 'Commercial Director' },
      { name: 'RGMs', title: 'Regional General Managers (UK & Ireland)' },
    ],
    description: 'In-store Partner Brand execution, regional ambassador programmes, colleague advocacy, and retail theatre.',
    track: 'Plenary',
  },
  {
    id: 's9',
    day: 1,
    time: '14:45',
    endTime: '15:30',
    title: 'Supplier & Agency Trends Panel',
    stage: 'The Porter Tun',
    presenters: 'Meg, Matt, Helen & Guests',
    speakers: [
      { name: 'Meg', title: 'Commercial Director' },
      { name: 'Matt', title: 'Marketing Director' },
      { name: 'Helen', title: 'Customer Strategy Lead' },
      { name: 'Special Guests', title: 'External Brand & Agency Leaders' },
    ],
    description: 'Live interactive panel dissecting beauty, wellness, and Gen-Z consumer shifts, agency collaborations, and high street trends.',
    track: 'Trading',
  },
  {
    id: 's10',
    day: 1,
    time: '15:30',
    endTime: '16:15',
    title: 'Segmentation 3.0',
    stage: 'The Porter Tun',
    presenters: 'Simon, Jamie, Jonathan, Aaron, Sarah & Helen',
    speakers: [
      { name: 'Simon', title: 'Executive Lead' },
      { name: 'Jamie', title: 'Commercial Lead' },
      { name: 'Jonathan', title: 'Category Lead' },
      { name: 'Aaron', title: 'Customer Insights Lead' },
      { name: 'Sarah', title: 'Store Segmentation Lead' },
      { name: 'Helen', title: 'Data & Analytics Lead' },
    ],
    description: 'The next era of store tiering, hyper-localized space allocation, range tailoring, and targeted supplier brand distribution.',
    track: 'Trading',
  },
  {
    id: 's11',
    day: 1,
    time: '16:15',
    endTime: '17:00',
    title: 'Final Awards & Wrap Up',
    stage: 'The Porter Tun',
    presenters: 'Simon, Jamie & Meg',
    speakers: [
      { name: 'Simon', title: 'Executive Director' },
      { name: 'Jamie', title: 'Commercial Lead' },
      { name: 'Meg', title: 'Commercial Director' },
    ],
    description: 'Superdrug Supplier of the Year trophy presentation, key performance awards, and closing leadership reflections.',
    track: 'Awards',
  },
  {
    id: 's-drinks',
    day: 1,
    time: '17:00',
    endTime: '19:30',
    title: 'Join us for drinks!',
    stage: 'The Brewery Courtyard & King George III',
    presenters: 'Superdrug Executive & Commercial Board',
    speakers: [{ name: 'All Delegates & Partners' }],
    description: 'Celebratory drinks reception, canapés, and executive networking in The Brewery cobbled courtyard and King George III vaults.',
    track: 'Break',
    isBreak: true,
  },
];

export const INITIAL_POLLS: Poll[] = [
  {
    id: 'p1',
    question: 'Which strategic initiative discussed today will deliver the greatest collaborative value for your brand in 2027?',
    sessionTitle: 'Segmentation 3.0 & Trading Strategies',
    totalVotes: 312,
    options: [
      { id: 'opt1', text: 'Segmentation 3.0 hyper-localized store tiering', votes: 124 },
      { id: 'opt2', text: 'Superdrug Retail Media Network & app loyalty co-investment', votes: 98 },
      { id: 'opt3', text: 'GOBE & Brand Exclusives partnership programs', votes: 62 },
      { id: 'opt4', text: 'Supply Chain EDI automation & direct replenishment', votes: 28 },
    ],
  },
  {
    id: 'p2',
    question: 'How do you rate the clarity of Superdrug’s 2027 Trading & Category roadmaps presented today?',
    sessionTitle: 'Accelerating Growth & Trading Strategies',
    totalVotes: 245,
    options: [
      { id: 'opt2-1', text: 'Extremely clear — fully aligned with our brand growth targets', votes: 138 },
      { id: 'opt2-2', text: 'Strong — clear priorities with great commercial focus', votes: 76 },
      { id: 'opt2-3', text: 'Good — looking forward to bilateral follow-ups during JBP', votes: 24 },
      { id: 'opt2-4', text: 'Need more detail on specific sub-category tiering', votes: 7 },
    ],
  },
];

export const INITIAL_QA: QAQuestion[] = [
  {
    id: 'q1',
    author: 'Mark Henderson',
    role: 'Commercial Director · L’Oréal UK',
    targetSpeaker: 'Simon & Charlie (Accelerating Growth)',
    text: 'Under the Accelerating Growth plan, what is the target split between physical store space expansion and digital app sales growth?',
    timestamp: '10 mins ago',
    upvotes: 48,
    isUpvoted: true,
  },
  {
    id: 'q2',
    author: 'Fiona Campbell',
    role: 'National Account Manager · Unilever',
    targetSpeaker: 'Mark & Rachel (Supply Chain)',
    text: 'What are the planned milestones for automated EDI ordering and how will stock safety buffers be calculated ahead of Christmas peak trading?',
    timestamp: '25 mins ago',
    upvotes: 39,
    isUpvoted: false,
  },
  {
    id: 'q3',
    author: 'Julian Cross',
    role: 'Head of Pharmacy Accounts · Haleon',
    targetSpeaker: 'Craig & Chloe (Healthcare Strategy)',
    text: 'How can OTC brands co-fund targeted training content for in-store pharmacy colleagues under the new Healthcare Strategy rollout?',
    timestamp: '35 mins ago',
    upvotes: 31,
    isUpvoted: false,
  },
  {
    id: 'q4',
    author: 'Elena Rossi',
    role: 'Founder · Clean Botanics',
    targetSpeaker: 'Jamie & Emma (GOBE Strategy)',
    text: 'What is the evaluation timeline for challenger brands pitching into the GOBE Brand Exclusives tier for Spring 2027?',
    timestamp: '45 mins ago',
    upvotes: 24,
    isUpvoted: false,
  },
];

export const FEATURED_SPEAKERS: Speaker[] = [
  {
    id: 'sp1',
    name: 'Simon & Charlie',
    role: 'Executive & Commercial Directors',
    sessionTitle: 'Accelerating Growth',
    bio: 'Presenting Superdrug’s trading momentum, macro expansion, and overarching retail commercial direction for 2027.',
  },
  {
    id: 'sp2',
    name: 'Meg & Trading Team',
    role: 'Commercial Director & Trading Controllers',
    sessionTitle: 'Trading Strategies & Trends Panel',
    bio: 'Overseeing category commercial roadmaps, supplier Joint Business Planning (JBP), and agency trend partnerships.',
  },
  {
    id: 'sp3',
    name: 'Jamie, Emma, Shona & Sarah',
    role: 'GOBE & Brand Exclusives Strategy',
    sessionTitle: 'GOBE Strategy',
    bio: 'Driving Global Only at Superdrug, brand exclusivity partnerships, own-brand innovation, and hero product collaborations.',
  },
  {
    id: 'sp4',
    name: 'Craig, Chloe, Richard & Amit',
    role: 'Healthcare Leadership Team',
    sessionTitle: 'Healthcare Strategy',
    bio: 'Leading high street primary healthcare accessibility, NHS Pharmacy First clinical consultations, and OTC category innovations.',
  },
  {
    id: 'sp5',
    name: 'Mark & Rachel',
    role: 'Supply Chain & Logistics',
    sessionTitle: 'Supply Chain',
    bio: 'Directing distribution centers, stock accuracy, direct-to-store logistics, and supplier collaboration.',
  },
  {
    id: 'sp6',
    name: 'Matt, Caris & Helen',
    role: 'Comms, Online and Customer',
    sessionTitle: 'Comms, Online and Customer',
    bio: 'Leading Superdrug Retail Media Network, digital e-commerce growth, and 18M+ Health & Beauty card loyalty engagement.',
  },
];
