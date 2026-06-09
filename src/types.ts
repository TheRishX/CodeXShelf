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
  isReading?: boolean;
  isCompleted?: boolean;
  needsRevision?: boolean;
  lastOpenedAt?: string;
  status?: 'unseen' | 'reading' | 'completed' | 'revision';
  enableLinkedNote?: boolean;
}

export interface NoteItem {
  id: string;
  subtopicId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  isReading?: boolean;
  isCompleted?: boolean;
  needsRevision?: boolean;
  lastOpenedAt?: string;
  status?: 'unseen' | 'reading' | 'completed' | 'revision';
}

export interface QuickNoteItem {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  isPinned?: boolean;
  isFavorite?: boolean;
  color?: string;
  linkedResourceId?: string;
  linkedResourceType?: 'book' | 'assignment' | 'pdf' | 'video';
  linkedResourceTitle?: string;
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
  enableLinkedNote?: boolean;
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
  paperUrl?: string; // PDF / paper link
  websiteUrl: string; // Web link where questions reside
  localPdfData?: string; // Base64 local file data (offline option)
  localPdfName?: string;
  localPdfSize?: string;
  status: 'Awaiting Solution' | 'In Progress' | 'Completed' | 'Perfected';
  notes?: string;
  createdAt: string;
  isPinned?: boolean;
  isSolving?: boolean;
  enableLinkedNote?: boolean;
}

export interface StudyTodoItem {
  id: string;
  title: string;
  description?: string;
  category: 'concept_synthesize' | 'active_recall' | 'blind_spot_clarify' | 'interview_simulate' | 'coding_practice' | 'revision';
  priority: 'critical_blocker' | 'learning_milestone' | 'casual_deep_dive';
  status: 'todo' | 'in_progress' | 'completed';
  subtopicId?: string; // optional relation to subtopic
  createdAt: string;
  completedAt?: string;
  notes?: string; // psychological takeaways for consolidation
  difficultyEstimate?: 'quick_win' | 'deep_analytical' | 'epic_conceptual';
}

export interface BookItem {
  id: string;
  title: string;
  author?: string;
  link?: string;
  localPdfData?: string; // Base64 local file data (offline option)
  localPdfName?: string;
  localPdfSize?: string;
  coverUrl?: string; // Web URL or Base64 data
  notes?: string;
  rating?: number; // 0-5
  status: 'want_to_read' | 'reading' | 'completed';
  totalPages?: number;
  currentPage?: number;
  shelfLocation?: string; // 'top' | 'middle' | 'bottom'
  createdAt: string;
  isReadingActive?: boolean;
  lastOpenedAt?: string;
  enableLinkedNote?: boolean;
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
  todos?: StudyTodoItem[];
  quickNotes?: QuickNoteItem[];
  books?: BookItem[];
  bookshelfViewMode?: 'shelf' | 'grid' | 'list' | 'compact';
  bookshelfSortBy?: 'manual' | 'date' | 'alpha' | 'progress';
  bookshelfLastReadId?: string;
  streak?: {
    count: number;
    lastActiveDate: string;
  };
  streakLogs?: Record<string, {
    text: string;
    questionsSolved?: number;
    topicsLearned?: string[];
    createdAt?: string;
  }>;
  sidebarOrder?: string[];
  customMenuLabels?: Record<string, string>;
  activeSidebarItems?: string[];
  activeSubtopicTabs?: string[];
}

export interface CustomUser {
  email: string;
  name: string;
  picture?: string;
  isAuthenticated: boolean;
  uid?: string;
}
