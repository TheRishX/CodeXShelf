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
}

export interface CustomUser {
  email: string;
  name: string;
  picture?: string;
  isAuthenticated: boolean;
}
