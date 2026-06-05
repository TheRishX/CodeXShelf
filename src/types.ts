export interface Topic {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  createdAt: string;
}

export interface Subtopic {
  id: string;
  topicId: string;
  name: string;
  description?: string;
  coreConcepts?: string[]; // short bullet items
  createdAt: string;
}

export interface PdfItem {
  id: string;
  subtopicId: string;
  title: string;
  fileName: string;
  fileSize: string;
  fileData?: string; // Base64 data for offline access
  url?: string; // Web URL link for public papers
  createdAt: string;
}

export interface NoteItem {
  id: string;
  subtopicId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface VideoItem {
  id: string;
  subtopicId: string;
  title: string;
  url: string;
  platform: 'youtube' | 'generic';
  createdAt: string;
  isPlaying?: boolean;
  isCompleted?: boolean;
  // Professional Enterprise metadata
  description?: string;
  thumbnail?: string;
  duration?: string;          // ISO 8601 parsed e.g. "12:35"
  durationSeconds?: number;   // Numeric sorting
  channelTitle?: string;      // Channel Name
  channelId?: string;
  publishedAt?: string;       // Published Date
  views?: number;             // Stat count representation
  likes?: number;
  comments?: number;
  tags?: string[];
  category?: string;
  language?: string;
  embeddable?: boolean;
  privacyStatus?: string;
  sourceId?: string;          // Origin YouTube source ID if imported via channel/playlist
  lastSyncedAt?: string;
}

export interface YouTubeSource {
  id: string;                 // URL playlist ID, channel ID or single hash
  type: 'channel' | 'playlist' | 'video' | 'shorts';
  title: string;
  creatorName: string;
  thumbnail: string;
  thumbnailUrl?: string;      // Backwards compatibility alias
  videoCount: number;
  url: string;
  syncMode: 'manual' | 'hourly' | 'daily' | 'weekly';
  syncInterval?: string;      // Interval settings
  totalImported?: number;     // Stats sync tracking representation
  lastSyncedAt: string;
  latestVideoId?: string;
  importedAt: string;
  subtopicId: string;         // Target subtopic ID
}

export interface YouTubeJob {
  id: string;
  sourceUrl: string;
  sourceType: 'channel' | 'playlist' | 'video' | 'shorts';
  title: string;
  status: 'queued' | 'starting' | 'importing' | 'syncing' | 'completed' | 'failed' | 'paused_offline';
  total: number;
  imported: number;
  remaining: number;
  eta: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConceptItem {
  id: string;
  subtopicId: string;
  title: string;
  content: string;
  codeSnippet?: string;
  createdAt: string;
}

export interface CodingItem {
  id: string;
  subtopicId: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  problemStatement: string;
  starterCode?: string;
  solution?: string;
  createdAt: string;
}

export interface InterviewItem {
  id: string;
  subtopicId: string;
  question: string;
  answer: string;
  level: 'junior' | 'mid' | 'senior';
  createdAt: string;
}

export interface QuizItem {
  id: string;
  subtopicId: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  createdAt: string;
}

export interface TrackerItem {
  id: string;
  subtopicId: string;
  title: string;
  started: boolean;
  completed: boolean;
  revised: boolean;
  confidence: number; // percentage 0-100
  isPerfect: boolean;
  notes?: string;
  createdAt: string;
}

export interface VaultItem {
  id: string;
  title: string;
  description: string;
  url: string;
  category: 'DSA' | 'Development' | 'DevOps' | 'System Design' | 'Interview Preparation' | 'Documentation' | 'AI' | 'Learning Resources' | string;
  tags: string[];
  notes?: string;
  isFavorite: boolean;
  isPinned?: boolean;
  createdAt: string;
}

export interface AssignmentItem {
  id: string;
  title: string;
  description: string;
  paperUrl: string; // PDF / paper link
  websiteUrl: string; // Web link where questions reside
  status: 'Awaiting Solution' | 'In Progress' | 'Completed' | 'Perfected';
  notes?: string;
  createdAt: string;
}

export interface DatabaseState {
  topics: Topic[];
  subtopics: Subtopic[];
  pdfs: PdfItem[];
  notes: NoteItem[];
  videos: VideoItem[];
  concepts: ConceptItem[];
  coding: CodingItem[];
  interviews: InterviewItem[];
  quizzes: QuizItem[];
  trackers?: TrackerItem[];
  vaultItems?: VaultItem[];
  vaultCategories?: string[];
  assignments?: AssignmentItem[];
  youtubeSources?: YouTubeSource[];
  youtubeJobs?: YouTubeJob[];
}

export interface CustomUser {
  email: string;
  name: string;
  picture?: string;
  isAuthenticated: boolean;
  uid?: string;
}
