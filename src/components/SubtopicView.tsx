import React, { useState } from 'react';
import { 
  ArrowLeft, FileText, FileCode, Play, Lightbulb, Code2, HelpCircle, 
  Sparkles, Plus, Trash2, CheckCircle, XCircle, ChevronDown, ChevronUp, Link, 
  AlertCircle, Download, Upload, Copy, Check, Eye, Edit3, BookOpen, Map, User, RefreshCw,
  ClipboardList, Loader2, GripVertical, Layers, LayoutGrid, Grid, List, AlignJustify
} from 'lucide-react';
import { 
  Subtopic, Topic, PdfItem, NoteItem, VideoItem, ConceptItem, CodingItem, 
  InterviewItem, QuizItem, DatabaseState, TrackerItem
} from '../types';

interface SubtopicViewProps {
  topic: Topic;
  subtopic: Subtopic;
  dbState: DatabaseState;
  onBack: () => void;
  onUpdateDb: (updates: Partial<DatabaseState>) => void;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
  onDeleteSubtopic?: (subtopicId: string) => void;
  onSelectView?: (view: string) => void;
}

type TabType = 'dashboard' | 'tracker' | 'pdfs' | 'notes' | 'videos' | 'concepts' | 'quizzes';

interface TabItem {
  id: TabType;
  label: string;
  icon: any;
}

const TABS: TabItem[] = [
  { id: 'tracker', label: 'Topics Tracker', icon: ClipboardList },
  { id: 'pdfs', label: 'PDFs', icon: FileText },
  { id: 'notes', label: 'Notes', icon: FileCode },
  { id: 'videos', label: 'Videos', icon: Play },
  { id: 'concepts', label: 'Concepts', icon: Lightbulb },
  { id: 'dashboard', label: 'Study Station', icon: Sparkles }
];

// Helper: Custom Inline Markdown formatting
function renderInlineFormat(text: string) {
  if (!text) return '';
  if (!text.includes('**') && !text.includes('`')) {
    return text;
  }
  const chunks = text.split(/(\*\*.*?\*\*|`.*?`)/);
  return chunks.map((chunk, cidx) => {
    if (chunk.startsWith('**') && chunk.endsWith('**')) {
      return (
        <strong key={cidx} className="font-bold text-slate-905 dark:text-white">
          {chunk.slice(2, -2)}
        </strong>
      );
    }
    if (chunk.startsWith('`') && chunk.endsWith('`')) {
      return (
        <code
          key={cidx}
          className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-mono text-xs rounded border border-slate-200 dark:border-slate-700 font-semibold"
        >
          {chunk.slice(1, -1)}
        </code>
      );
    }
    return chunk;
  });
}

// Helper: Custom Markdown-to-HTML formatter to render styling beautifully
function renderSimpleMarkdown(text: string, customParagraphClass?: string) {
  if (!text) return null;
  const lines = text.split('\n');
  let inCodeBlock = false;
  let codeLines: string[] = [];

  return lines.map((line, idx) => {
    // Code block toggles
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        inCodeBlock = false;
        const currentCode = codeLines.join('\n');
        codeLines = [];
        return (
          <pre key={idx} className="my-3 p-4 bg-gray-950 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto relative group border border-gray-800">
            <button 
              onClick={() => navigator.clipboard.writeText(currentCode)}
              className="absolute top-2.5 right-2.5 p-1 rounded bg-gray-800/80 hover:bg-gray-750 opacity-0 group-hover:opacity-100 transition-opacity text-white"
              title="Copy code"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <code>{currentCode}</code>
          </pre>
        );
      } else {
        inCodeBlock = true;
        return null;
      }
    }

    if (inCodeBlock) {
      codeLines.push(line);
      return null;
    }

    // Header 3
    if (line.startsWith('### ')) {
      return <h4 key={idx} className="text-base font-bold text-gray-900 dark:text-white mt-4 mb-2 font-sans">{line.slice(4)}</h4>;
    }
    // Header 2
    if (line.startsWith('## ')) {
      return <h3 key={idx} className="text-lg font-extrabold text-gray-950 dark:text-white mt-5 mb-2.5 font-sans pb-1 border-b border-gray-100 dark:border-gray-800">{line.slice(3)}</h3>;
    }
    // Header 1
    if (line.startsWith('# ')) {
      return <h2 key={idx} className="text-xl font-extrabold text-gray-950 dark:text-white mt-6 mb-3 font-sans pb-1.5 border-b border-gray-150 dark:border-gray-800">{line.slice(2)}</h2>;
    }
    // Lists selectors
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      return (
        <ul key={idx} className="list-disc pl-5 my-1.5 space-y-1 text-sm text-gray-650 dark:text-gray-300">
          <li>{renderInlineFormat(line.trim().slice(2))}</li>
        </ul>
      );
    }
    // Numbered lists
    const numMatch = line.trim().match(/^(\d+)\.\s(.*)/);
    if (numMatch) {
      const startNum = parseInt(numMatch[1], 10);
      return (
        <ol key={idx} start={startNum} className="list-decimal pl-5 my-1.5 space-y-1 text-sm text-gray-650 dark:text-gray-300">
          <li>{renderInlineFormat(numMatch[2])}</li>
        </ol>
      );
    }
    // Blockquotes
    if (line.trim().startsWith('> ')) {
      return (
        <blockquote key={idx} className="border-l-4 border-blue-600 bg-blue-500/5 px-4 py-2 my-2 rounded-r-lg text-xs font-mono text-slate-600 dark:text-slate-400">
          {line.trim().slice(2)}
        </blockquote>
      );
    }

    // Standard inline replacements (Bold wrappers)
    const boldRegex = /\*\*(.*?)\*\*/g;
    const codeSpanRegex = /`(.*?)`/g;
    
    // Quick inline scan fallback
    if (line.includes('**') || line.includes('`')) {
      // Simple parse formatting mapping:
      const chunks = line.split(/(\*\*.*?\*\*|`.*?`)/);
      const elements = chunks.map((chunk, cidx) => {
        if (chunk.startsWith('**') && chunk.endsWith('**')) {
          return <strong key={cidx} className="font-bold text-slate-905 dark:text-white">{chunk.slice(2, -2)}</strong>;
        }
        if (chunk.startsWith('`') && chunk.endsWith('`')) {
          return <code key={cidx} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-mono text-xs rounded border border-slate-205 dark:border-slate-705 font-semibold">{chunk.slice(1, -1)}</code>;
        }
        return chunk;
      });
      return <p key={idx} className={customParagraphClass || "text-sm text-slate-655 dark:text-slate-300 leading-relaxed my-2"}>{elements}</p>;
    }

    if (line.trim() === '') {
      return <div key={idx} className="h-2" />;
    }

    return <p key={idx} className={customParagraphClass || "text-sm text-gray-610 dark:text-gray-300 leading-relaxed my-2"}>{line}</p>;
  });
}

export function SubtopicView({ 
  topic, 
  subtopic, 
  dbState, 
  onBack, 
  onUpdateDb,
  isDarkMode = true,
  onToggleTheme,
  onDeleteSubtopic,
  onSelectView
}: SubtopicViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('pdfs');
  const [tabManagerOpen, setTabManagerOpen] = useState(false);

  // Compute active subtopic tabs
  const defaultSubTabs = ['tracker', 'pdfs', 'notes', 'videos', 'concepts', 'dashboard'];
  const activeSubTabs = dbState.activeSubtopicTabs && dbState.activeSubtopicTabs.length > 0
    ? dbState.activeSubtopicTabs
    : defaultSubTabs;

  const visibleTabs = TABS.filter(tab => activeSubTabs.includes(tab.id));

  // If the active tab is deactivated, fallback immediately
  React.useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.some(t => t.id === activeTab)) {
      setActiveTab(visibleTabs[0].id as TabType);
    }
  }, [dbState.activeSubtopicTabs, activeTab, visibleTabs]);
  
  // Sizing and sync headers states
  const [textSize, setTextSize] = useState<'A-' | 'A' | 'A+'>('A-');
  
  // Subtopic Modifiers & Deletion state
  const [editSubModalOpen, setEditSubModalOpen] = useState(false);
  const [editSubName, setEditSubName] = useState(subtopic.name);
  const [editSubDesc, setEditSubDesc] = useState(subtopic.description || '');
  const [deleteSubConfirmOpen, setDeleteSubConfirmOpen] = useState(false);

  // Core concepts sidepanel states
  const [addConceptOpen, setAddConceptOpen] = useState(false);
  const [newConceptVal, setNewConceptVal] = useState('');

  // Study Assistant loading and model states
  const [currentInteraction, setCurrentInteraction] = useState<'test' | 'cards' | 'roadmap' | 'summary' | 'faang' | 'coding' | null>(null);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantData, setAssistantData] = useState<any>(null);
  const [assistantError, setAssistantError] = useState('');

  // Flashcards state
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  // Quiz state
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const [aiGenerating, setAiGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [aiError, setAiError] = useState('');

  // Modals visibility toggles
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    field: 'pdfs' | 'notes' | 'videos' | 'concepts' | 'coding' | 'interviews' | 'quizzes';
    title: string;
  } | null>(null);

  // Form input fields
  const [manualTitle, setManualTitle] = useState('');
  const [manualContent, setManualContent] = useState('');
  const [manualUrl, setManualUrl] = useState('');
  const [manualOption, setManualOption] = useState<string[]>(['', '', '', '']);
  const [quizCorrectIndex, setQuizCorrectIndex] = useState(0);
  const [quizExpl, setQuizExpl] = useState('');
  const [codingDiff, setCodingDiff] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [codingProblem, setCodingProblem] = useState('');
  const [codingStarter, setCodingStarter] = useState('');
  const [codingSol, setCodingSol] = useState('');

  // Simulated PDF Dropzone state
  const [pdfFileName, setPdfFileName] = useState('');
  const [pdfFileSize, setPdfFileSize] = useState('');
  const [pdfSourceType, setPdfSourceType] = useState<'file' | 'url'>('file');
  const [pdfFileData, setPdfFileData] = useState<string>('');
  const [pdfEnableLinkedNote, setPdfEnableLinkedNote] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // YouTube Playlist Importer inside Subtopic state
  const [playlistModalOpen, setPlaylistModalOpen] = useState(false);
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [playlistStatus, setPlaylistStatus] = useState<'idle' | 'loading' | 'success' | 'err'>('idle');
  const [playlistError, setPlaylistError] = useState('');
  const [playlistPreview, setPlaylistPreview] = useState<{ playlistTitle: string, videos: any[] } | null>(null);

  // Drag and drop state
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [videoViewMode, setVideoViewMode] = useState<'grid' | 'small_grid' | 'list' | 'compact'>('grid');

  // Interactive Quiz State metrics
  const [quizAttempts, setQuizAttempts] = useState<{ [quizId: string]: number }>({}); // maps quizId -> selected choice index
  const [revealSolutions, setRevealSolutions] = useState<{ [itemId: string]: boolean }>({});
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  // Topics tracker input states
  const [newTrackerTitle, setNewTrackerTitle] = useState('');
  const [activeBoxFilter, setActiveBoxFilter] = useState<'all' | 'unseen' | 'learning' | 'recalling' | 'mastered'>('all');
  const [isMdImportModalOpen, setIsMdImportModalOpen] = useState(false);
  const [mdImportContent, setMdImportContent] = useState('');
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});

  const toggleNoteExpansion = (noteId: string) => {
    setExpandedNotes(prev => {
      const nextVal = !prev[noteId];
      if (nextVal) {
        setTimeout(() => {
          markNoteAsReading(noteId);
        }, 10);
      }
      return {
        ...prev,
        [noteId]: nextVal
      };
    });
  };

  // General Edit Item states
  const [editingItem, setEditingItem] = useState<{
    id: string;
    field: 'pdfs' | 'notes' | 'videos' | 'concepts' | 'coding' | 'interviews' | 'quizzes' | 'trackers';
  } | null>(null);

  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editDifficulty, setEditDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [editCodeSnippet, setEditCodeSnippet] = useState('');
  const [editStarterCode, setEditStarterCode] = useState('');
  const [editSolution, setEditSolution] = useState('');
  const [editOptions, setEditOptions] = useState<string[]>(['', '', '', '']);
  const [editCorrectIndex, setEditCorrectIndex] = useState(0);
  const [editExplanation, setEditExplanation] = useState('');
  const [editTrackerStarted, setEditTrackerStarted] = useState(false);
  const [editTrackerCompleted, setEditTrackerCompleted] = useState(false);
  const [editTrackerRevised, setEditTrackerRevised] = useState(false);
  const [editTrackerNotes, setEditTrackerNotes] = useState('');

  const handleFetchPlaylistSubtopic = async () => {
    if (!playlistUrl.trim()) {
      setPlaylistError('Please input a valid URL.');
      setPlaylistStatus('err');
      return;
    }
    setPlaylistStatus('loading');
    setPlaylistError('');
    setPlaylistPreview(null);
    try {
      const response = await fetch('/api/youtube/playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistUrl: playlistUrl.trim() })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to parse playlist.');
      }
      setPlaylistPreview({
        playlistTitle: data.playlistTitle,
        videos: data.videos
      });
      setPlaylistStatus('success');
    } catch (err: any) {
      setPlaylistError(err.message || 'Error occurred syncing playlist steps.');
      setPlaylistStatus('err');
    }
  };

  const handleSavePlaylistSubtopic = () => {
    if (!playlistPreview || playlistPreview.videos.length === 0) return;
    const importedVids = playlistPreview.videos.map((vid, idx) => ({
      id: `vid-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
      subtopicId: subtopic.id,
      title: vid.title,
      url: vid.url,
      platform: 'youtube' as const,
      createdAt: new Date().toISOString()
    }));
    onUpdateDb({ videos: [...dbState.videos, ...importedVids] });
    setPlaylistModalOpen(false);
    setPlaylistUrl('');
    setPlaylistPreview(null);
    setPlaylistStatus('idle');
  };

  const handleVideoReorderSubtopic = (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;
    const listVideos = dbState.videos || [];
    const fromIndex = listVideos.findIndex(v => v.id === draggedId);
    const toIndex = listVideos.findIndex(v => v.id === targetId);
    if (fromIndex !== -1 && toIndex !== -1) {
      const updated = [...listVideos];
      const [movedItem] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, movedItem);
      onUpdateDb({ videos: updated });
    }
  };

  const handleStartEdit = (item: any, field: 'pdfs' | 'notes' | 'videos' | 'concepts' | 'coding' | 'interviews' | 'quizzes' | 'trackers') => {
    setEditingItem({ id: item.id, field });
    setEditTitle(item.title || item.question || '');
    setEditContent(item.content || item.answer || '');
    setEditUrl(item.url || '');
    setEditDifficulty(item.difficulty || item.level || 'easy');
    setEditCodeSnippet(item.codeSnippet || '');
    setEditStarterCode(item.starterCode || '');
    setEditSolution(item.solution || '');
    setEditOptions(item.options ? [...item.options] : ['', '', '', '']);
    setEditCorrectIndex(item.correctIndex || 0);
    setEditExplanation(item.explanation || '');
    setEditTrackerStarted(item.started || false);
    setEditTrackerCompleted(item.completed || false);
    setEditTrackerRevised(item.revised || false);
    setEditTrackerNotes(item.notes || '');
  };

  const handleSaveEditItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const { id, field } = editingItem;
    const array = (dbState[field as keyof DatabaseState] as any[]) || [];

    const updatedArray = array.map(item => {
      if (item.id === id) {
        const next = { ...item };
        if (field === 'pdfs') {
          next.title = editTitle;
          next.url = editUrl || undefined;
          if (editUrl) {
            next.fileName = 'Web Link';
            next.fileSize = 'External URL';
            next.fileData = undefined;
          }
        } else if (field === 'notes') {
          next.title = editTitle;
          next.content = editContent;
          next.updatedAt = new Date().toISOString();
        } else if (field === 'videos') {
          next.title = editTitle;
          next.url = editUrl;
          const isYoutube = editUrl.includes('youtube.com') || editUrl.includes('youtu.be');
          next.platform = isYoutube ? 'youtube' : 'generic';
        } else if (field === 'concepts') {
          next.title = editTitle;
          next.content = editContent;
          next.codeSnippet = editCodeSnippet || undefined;
        } else if (field === 'coding') {
          next.title = editTitle;
          next.difficulty = editDifficulty;
          next.problemStatement = editContent;
          next.starterCode = editStarterCode;
          next.solution = editSolution;
        } else if (field === 'interviews') {
          next.question = editTitle;
          next.answer = editContent;
          next.level = editDifficulty;
        } else if (field === 'quizzes') {
          next.question = editTitle;
          next.options = [...editOptions];
          next.correctIndex = editCorrectIndex;
          next.explanation = editExplanation;
        } else if (field === 'trackers') {
          next.title = editTitle;
          next.started = editTrackerStarted;
          next.completed = editTrackerCompleted;
          next.revised = editTrackerRevised;
          next.notes = editTrackerNotes || undefined;
          if (next.isPerfect) {
            next.confidence = 100;
          }
        }
        return next;
      }
      return item;
    });

    onUpdateDb({ [field]: updatedArray });
    setEditingItem(null);
  };

  // Filter items matching the current subtopicId
  const subtopicId = subtopic.id;
  const listPdfs = dbState.pdfs.filter(x => x.subtopicId === subtopicId);
  const listNotes = dbState.notes.filter(x => x.subtopicId === subtopicId);
  const listVideos = dbState.videos.filter(x => x.subtopicId === subtopicId);
  const listConcepts = dbState.concepts.filter(x => x.subtopicId === subtopicId);
  const listCoding = dbState.coding.filter(x => x.subtopicId === subtopicId);
  const listInterviews = dbState.interviews.filter(x => x.subtopicId === subtopicId);
  const listQuizzes = dbState.quizzes.filter(x => x.subtopicId === subtopicId);
  const listTrackers = (dbState.trackers || []).filter(x => x.subtopicId === subtopicId);
  const totalTrackedItems = listPdfs.length + listNotes.length;
  const compPdfsCount = listPdfs.filter(p => p.status === 'completed' || p.isCompleted).length;
  const compNotesCount = listNotes.filter(n => n.status === 'completed' || n.isCompleted).length;
  const totalCompletedCount = compPdfsCount + compNotesCount;

  const activePdfsCount = listPdfs.filter(p => p.status === 'reading' || p.isReading).length;
  const activeNotesCount = listNotes.filter(n => n.status === 'reading' || n.isReading).length;
  const totalActiveCount = activePdfsCount + activeNotesCount;

  const revPdfsCount = listPdfs.filter(p => p.status === 'revision' || p.needsRevision).length;
  const revNotesCount = listNotes.filter(n => n.status === 'revision' || n.needsRevision).length;
  const totalRevisionCount = revPdfsCount + revNotesCount;

  const lastReadItem = [...listPdfs.map(p => ({...p, type: 'pdf' as const})), ...listNotes.map(n => ({...n, type: 'note' as const}))]
    .filter(x => x.lastOpenedAt)
    .sort((a, b) => new Date(b.lastOpenedAt!).getTime() - new Date(a.lastOpenedAt!).getTime())[0];

  const filteredTrackers = listTrackers.filter(t => {
    const confidence = t.confidence || 0;
    if (activeBoxFilter === 'unseen') return confidence <= 30;
    if (activeBoxFilter === 'learning') return confidence >= 40 && confidence <= 60;
    if (activeBoxFilter === 'recalling') return confidence >= 70 && confidence <= 80;
    if (activeBoxFilter === 'mastered') return confidence >= 90;
    return true; // 'all'
  });

  // Trigger copy handler
  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(id);
    setTimeout(() => setCopiedItem(null), 1500);
  };

  // Core concept handlers
  const handleAddCoreConcept = (val: string) => {
    if (!val.trim()) return;
    const currentList = subtopic.coreConcepts || [];
    const updatedSubtopics = dbState.subtopics.map(s => 
      s.id === subtopic.id ? { ...s, coreConcepts: [...currentList, val.trim()] } : s
    );
    onUpdateDb({ subtopics: updatedSubtopics });
    setNewConceptVal('');
    setAddConceptOpen(false);
  };

  const handleRemoveCoreConcept = (index: number) => {
    const currentList = subtopic.coreConcepts || [];
    const filtered = currentList.filter((_, idx) => idx !== index);
    const updatedSubtopics = dbState.subtopics.map(s => 
      s.id === subtopic.id ? { ...s, coreConcepts: filtered } : s
    );
    onUpdateDb({ subtopics: updatedSubtopics });
  };

  // Subtopic editor handlers
  const handleUpdateSubtopic = (name: string, description: string) => {
    if (!name.trim()) return;
    const updated = dbState.subtopics.map(s => 
      s.id === subtopic.id ? { ...s, name: name.trim(), description: description.trim() } : s
    );
    onUpdateDb({ subtopics: updated });
    setEditSubModalOpen(false);
  };

  const handleExecuteDeleteSubtopic = () => {
    if (onDeleteSubtopic) {
      onDeleteSubtopic(subtopic.id);
      onBack();
    }
  };

  // Study Assistant live interactions fetch
  const handleAIAssistantClick = async (type: 'test' | 'cards' | 'roadmap' | 'summary' | 'faang' | 'coding') => {
    setCurrentInteraction(type);
    setAssistantLoading(true);
    setAssistantError('');
    setAssistantData(null);
    setSelectedQuizOption(null);
    setQuizSubmitted(false);
    setActiveCardIndex(0);
    setIsCardFlipped(false);

    let backendType = '';
    if (type === 'test') backendType = 'quiz';
    else if (type === 'cards') backendType = 'flashcards';
    else if (type === 'summary') backendType = 'notes';
    else if (type === 'roadmap') backendType = 'roadmap';
    else if (type === 'faang') backendType = 'interview';
    else if (type === 'coding') backendType = 'coding';

    try {
      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: backendType,
          topicName: topic.name,
          subtopicName: subtopic.name
        })
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to generate study artifact');
      }
      setAssistantData(data.result);
    } catch (err: any) {
      console.error(err);
      setAssistantError(err.message || 'Failed to reach AI study agent. Please try again.');
    } finally {
      setAssistantLoading(false);
    }
  };

  const [savingArtifact, setSavingArtifact] = useState<string | null>(null);

  const saveSynthesizedNote = (noteTitle: string, noteContent: string) => {
    setSavingArtifact('summary');
    const newNote: NoteItem = {
      id: `note-${Date.now()}`,
      subtopicId: subtopic.id,
      title: noteTitle,
      content: noteContent,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    onUpdateDb({ notes: [...dbState.notes, newNote] });
    setTimeout(() => setSavingArtifact(null), 2000);
  };

  const saveSynthesizedInterview = (q: string, a: string, lvl: string) => {
    setSavingArtifact('faang');
    const newInterview: InterviewItem = {
      id: `interview-${Date.now()}`,
      subtopicId: subtopic.id,
      question: q,
      answer: a,
      level: lvl as any,
      createdAt: new Date().toISOString()
    };
    onUpdateDb({ interviews: [...dbState.interviews, newInterview] });
    setTimeout(() => setSavingArtifact(null), 2000);
  };

  const saveSynthesizedCoding = (titleVal: string, problemStatementVal: string, difficultyVal: string, starterCodeVal: string, solutionVal: string) => {
    setSavingArtifact('coding');
    const newCoding: CodingItem = {
      id: `coding-${Date.now()}`,
      subtopicId: subtopic.id,
      title: titleVal,
      difficulty: difficultyVal as any,
      problemStatement: problemStatementVal,
      starterCode: starterCodeVal,
      solution: solutionVal,
      createdAt: new Date().toISOString()
    };
    onUpdateDb({ coding: [...dbState.coding, newCoding] });
    setTimeout(() => setSavingArtifact(null), 2000);
  };

  // Trigger Gemini AI generation endpoint
  const handleAIGenerate = async () => {
    setAiGenerating(true);
    setAiError('');
    
    // Choose custom loader messages based on current Tab selection
    const messages = {
      tracker: 'Gemini is brainstorming high-yield technical interview topics...',
      notes: 'Gemini is compiling textbooks & writing markdown course notes...',
      concepts: 'Gemini is generating clean layout concepts and visual code syntax...',
      coding: 'Gemini is designing unique algorithm challenges & solution code...',
      interviews: 'Gemini is framing real-world tech interview questions with complete solutions...',
      quizzes: 'Gemini is preparing diagnostic code questions & detailed explanations...'
    };
    setGenerationStep(messages[activeTab as keyof typeof messages] || 'Querying Gemini API...');

    try {
      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: activeTab,
          topicName: topic.name,
          subtopicName: subtopic.name
        })
      });

      const resData = await response.json();
      if (!resData.success) {
        throw new Error(resData.error || 'Server returned failure token');
      }

      setGenerationStep('Integrating AI payload into cache...');
      const payload = resData.result;

      if (activeTab === 'notes') {
        const newNote: NoteItem = {
          id: `note-${Date.now()}`,
          subtopicId,
          title: `AI Note: ${subtopic.name}`,
          content: payload,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        onUpdateDb({ notes: [...dbState.notes, newNote] });
      } else if (activeTab === 'concepts') {
        const newConcept: ConceptItem = {
          id: `concept-${Date.now()}`,
          subtopicId,
          title: payload.title || `Concept for ${subtopic.name}`,
          content: payload.content || 'Synthesized Concept text',
          codeSnippet: payload.codeSnippet || '',
          createdAt: new Date().toISOString()
        };
        onUpdateDb({ concepts: [...dbState.concepts, newConcept] });
      } else if (activeTab === 'coding') {
        const newCoding: CodingItem = {
          id: `coding-${Date.now()}`,
          subtopicId,
          title: payload.title || 'Coding Challenge',
          difficulty: payload.difficulty || 'medium',
          problemStatement: payload.problemStatement || '',
          starterCode: payload.starterCode || '',
          solution: payload.solution || '',
          createdAt: new Date().toISOString()
        };
        onUpdateDb({ coding: [...dbState.coding, newCoding] });
      } else if (activeTab === 'interviews') {
        const newInterview: InterviewItem = {
          id: `interview-${Date.now()}`,
          subtopicId,
          question: payload.question || 'Interview Question?',
          answer: payload.answer || 'Interview Answer.',
          level: payload.level || 'mid',
          createdAt: new Date().toISOString()
        };
        onUpdateDb({ interviews: [...dbState.interviews, newInterview] });
      } else if (activeTab === 'quizzes') {
        const newQuiz: QuizItem = {
          id: `quiz-${Date.now()}`,
          subtopicId,
          question: payload.question || 'Sample Multiple Choice Code Question?',
          options: payload.options || ['Option A', 'Option B', 'Option C', 'Option D'],
          correctIndex: Number.isInteger(payload.correctIndex) ? payload.correctIndex : 0,
          explanation: payload.explanation || '',
          createdAt: new Date().toISOString()
        };
        onUpdateDb({ quizzes: [...dbState.quizzes, newQuiz] });
      } else if (activeTab === 'tracker') {
        const newTr: TrackerItem = {
          id: `tr-${Date.now()}`,
          subtopicId,
          title: payload.title || `Study topic for ${subtopic.name}`,
          started: false,
          completed: false,
          revised: false,
          confidence: 30, // Default base confidence
          isPerfect: false,
          notes: payload.notes || undefined,
          createdAt: new Date().toISOString()
        };
        onUpdateDb({ trackers: [...(dbState.trackers || []), newTr] });
      }

    } catch (err: any) {
      console.error(err);
      setAiError(err.message || 'Failed to trigger Gemini API. Please make sure the server key is defined.');
    } finally {
      setAiGenerating(false);
      setGenerationStep('');
    }
  };

  // Handle file choice
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfFileName(file.name);
    
    const sizeInMB = file.size / (1024 * 1024);
    const sizeStr = sizeInMB > 1 
      ? `${sizeInMB.toFixed(2)} MB` 
      : `${(file.size / 1024).toFixed(0)} KB`;
    setPdfFileSize(sizeStr);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPdfFileData(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Manual Item additions
  const handleSaveManualItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim() && activeTab !== 'quizzes') return;

    if (activeTab === 'pdfs') {
      const newPdf: PdfItem = {
        id: `pdf-${Date.now()}`,
        subtopicId,
        title: manualTitle,
        fileName: pdfSourceType === 'file' ? (pdfFileName || 'document.pdf') : 'Web Link',
        fileSize: pdfSourceType === 'file' ? (pdfFileSize || '250 KB') : 'External URL',
        fileData: pdfSourceType === 'file' ? pdfFileData : undefined,
        url: pdfSourceType === 'url' ? manualUrl : undefined,
        enableLinkedNote: pdfEnableLinkedNote,
        createdAt: new Date().toISOString()
      };
      onUpdateDb({ pdfs: [...dbState.pdfs, newPdf] });
    } else if (activeTab === 'notes') {
      const newNote: NoteItem = {
        id: `note-${Date.now()}`,
        subtopicId,
        title: manualTitle,
        content: manualContent,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      onUpdateDb({ notes: [...dbState.notes, newNote] });
    } else if (activeTab === 'videos') {
      const isYoutube = manualUrl.includes('youtube.com') || manualUrl.includes('youtu.be');
      const newVideo: VideoItem = {
        id: `vid-${Date.now()}`,
        subtopicId,
        title: manualTitle,
        url: manualUrl,
        platform: isYoutube ? 'youtube' : 'generic',
        createdAt: new Date().toISOString()
      };
      onUpdateDb({ videos: [...dbState.videos, newVideo] });
    } else if (activeTab === 'concepts') {
      const newConcept: ConceptItem = {
        id: `concept-${Date.now()}`,
        subtopicId,
        title: manualTitle,
        content: manualContent,
        codeSnippet: manualUrl || undefined, // use url field as codeSnippet block
        createdAt: new Date().toISOString()
      };
      onUpdateDb({ concepts: [...dbState.concepts, newConcept] });
    } else if (activeTab === 'coding') {
      const newCoding: CodingItem = {
        id: `coding-${Date.now()}`,
        subtopicId,
        title: manualTitle,
        difficulty: codingDiff,
        problemStatement: codingProblem,
        starterCode: codingStarter,
        solution: codingSol,
        createdAt: new Date().toISOString()
      };
      onUpdateDb({ coding: [...dbState.coding, newCoding] });
    } else if (activeTab === 'interviews') {
      const newInterview: InterviewItem = {
        id: `interview-${Date.now()}`,
        subtopicId,
        question: manualTitle,
        answer: manualContent,
        level: codingDiff as any, // reuse codingDiff state as level selector
        createdAt: new Date().toISOString()
      };
      onUpdateDb({ interviews: [...dbState.interviews, newInterview] });
    } else if (activeTab === 'quizzes') {
      const newQuiz: QuizItem = {
        id: `quiz-${Date.now()}`,
        subtopicId,
        question: manualTitle,
        options: [...manualOption],
        correctIndex: quizCorrectIndex,
        explanation: quizExpl,
        createdAt: new Date().toISOString()
      };
      onUpdateDb({ quizzes: [...dbState.quizzes, newQuiz] });
    }

    // Reset fields
    setManualTitle('');
    setManualContent('');
    setManualUrl('');
    setManualOption(['', '', '', '']);
    setQuizCorrectIndex(0);
    setQuizExpl('');
    setPdfFileName('');
    setPdfFileSize('');
    setPdfFileData('');
    setPdfSourceType('file');
    setPdfEnableLinkedNote(false);
    setModalOpen(false);
  };

  const markPdfAsReading = (pdfId: string) => {
    const updated = dbState.pdfs.map(p => {
      if (p.id === pdfId) {
        return {
          ...p,
          isReading: true,
          lastOpenedAt: new Date().toISOString(),
          status: (p.status === 'completed' ? 'completed' : 'reading') as 'unseen' | 'reading' | 'completed' | 'revision'
        };
      }
      return { ...p, isReading: false };
    });
    onUpdateDb({ pdfs: updated });
  };

  const triggerLinkedNote = (resourceId: string, resourceTitle: string, resourceType: 'pdf' | 'assignment' | 'book' | 'video') => {
    const quickNotes = dbState.quickNotes || [];
    const existingNote = quickNotes.find(q => q.linkedResourceId === resourceId && q.linkedResourceType === resourceType);
    
    if (existingNote) {
      localStorage.setItem('target_quick_note_id', existingNote.id);
    } else {
      const newNoteId = `qnote-${Date.now()}`;
      const newNote = {
        id: newNoteId,
        title: `Note: ${resourceTitle}`,
        content: `<div><strong>Linked Resource:</strong> <span style="background-color: #fef08a; padding: 2px 6px; border-radius: 4px; font-weight: bold; color: black; font-family: monospace;">${resourceType.toUpperCase()}: ${resourceTitle}</span></div><br><div>Start typing your notes about this ${resourceType}...</div>`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isPinned: true,
        isFavorite: false,
        color: '#fbbf24',
        linkedResourceId: resourceId,
        linkedResourceType: resourceType,
        linkedResourceTitle: resourceTitle
      };
      onUpdateDb({ quickNotes: [newNote, ...quickNotes] });
      localStorage.setItem('target_quick_note_id', newNoteId);
    }
    
    if (onSelectView) {
      onSelectView('quicknotes');
    }
  };

  const updatePdfStatus = (pdfId: string, status: 'unseen' | 'reading' | 'completed' | 'revision') => {
    const updated = dbState.pdfs.map(p => {
      if (p.id === pdfId) {
        return {
          ...p,
          status,
          isCompleted: status === 'completed',
          needsRevision: status === 'revision',
          // If marked completed, clear current reading focus to avoid confusion
          isReading: status === 'completed' ? false : p.isReading
        };
      }
      return p;
    });
    onUpdateDb({ pdfs: updated });
  };

  const markNoteAsReading = (noteId: string) => {
    const updated = dbState.notes.map(n => {
      if (n.id === noteId) {
        return {
          ...n,
          isReading: true,
          lastOpenedAt: new Date().toISOString(),
          status: (n.status === 'completed' ? 'completed' : 'reading') as 'unseen' | 'reading' | 'completed' | 'revision'
        };
      }
      return { ...n, isReading: false };
    });
    onUpdateDb({ notes: updated });
  };

  const updateNoteStatus = (noteId: string, status: 'unseen' | 'reading' | 'completed' | 'revision') => {
    const updated = dbState.notes.map(n => {
      if (n.id === noteId) {
        return {
          ...n,
          status,
          isCompleted: status === 'completed',
          needsRevision: status === 'revision',
          // If marked completed, clear focus
          isReading: status === 'completed' ? false : n.isReading
        };
      }
      return n;
    });
    onUpdateDb({ notes: updated });
  };

  // Item removal triggers
  const handleDeleteItem = (itemId: string, field: 'pdfs' | 'notes' | 'videos' | 'concepts' | 'coding' | 'interviews' | 'quizzes') => {
    const array = dbState[field] as any[];
    const item = array.find(x => x.id === itemId);
    const title = item ? (item.title || item.question || item.name || 'this item') : 'this item';
    setDeleteTarget({ id: itemId, field, title });
  };

  const executeDeleteItem = () => {
    if (!deleteTarget) return;
    const { id, field } = deleteTarget;
    const array = dbState[field] as any[];
    const filtered = array.filter(item => item.id !== id);
    onUpdateDb({ [field]: filtered });
    setDeleteTarget(null);
  };

  const textSizeClass = textSize === 'A-' ? 'text-xs' : textSize === 'A+' ? 'text-sm sm:text-base' : 'text-xs sm:text-sm';

  return (
    <div className={`space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200 ${textSizeClass}`}>
      
      {/* Upper breadcrumbs row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase font-sans">
          <button onClick={onBack} className="hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors">TOPICS</button>
          <span className="text-slate-300 dark:text-slate-700 select-none">&gt;</span>
          <button onClick={onBack} className="hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors">{topic.name}</button>
          <span className="text-slate-300 dark:text-slate-700 select-none">&gt;</span>
          <span className="text-blue-600 dark:text-blue-400 select-none">{subtopic.name}</span>
        </div>

        {/* Global theme controls sync status header indicator */}
        <div className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 font-mono select-none uppercase">
          Study Station
        </div>
      </div>

      {/* Title tag and category metadata */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white leading-none tracking-tight font-sans">
              {subtopic.name}
            </h2>
            <div className="flex items-center gap-1.5 select-none">
              <button
                onClick={() => {
                  setEditSubName(subtopic.name);
                  setEditSubDesc(subtopic.description || '');
                  setEditSubModalOpen(true);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Edit subtopic"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setDeleteSubConfirmOpen(true)}
                className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
                title="Delete subtopic"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-2xl font-sans">
            {subtopic.description || 'Synthesize guides, bookmarks, coding logs and trigger Gemini test sheets.'}
          </p>

          {/* Psychological Study Metrics Bar & Learning Pipeline */}
          {totalTrackedItems > 0 && (
            <div className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 text-left select-none max-w-3xl animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 font-sans pb-1">
                  <span>🎓 READING COGNITION PROGRESS</span>
                  <span className="font-mono text-blue-600 dark:text-blue-400">
                    {Math.round((totalCompletedCount / totalTrackedItems) * 100)}% MASTERED
                  </span>
                </div>
                {/* Visual Progress Bar */}
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                    style={{ width: `${(totalCompletedCount / totalTrackedItems) * 100}%` }}
                  />
                </div>
                {/* Counts Indicators */}
                <div className="flex items-center gap-3.5 text-[10px] font-bold font-sans">
                  <span className="text-slate-500 dark:text-slate-400">Total: {totalTrackedItems} items</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">{totalCompletedCount} Completed</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span className="text-amber-600 dark:text-amber-400">{totalActiveCount} Started</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  <span className="text-indigo-600 dark:text-indigo-400">{totalRevisionCount} Revising</span>
                </div>
              </div>

              {/* Live Resume Shortcut */}
              {lastReadItem && (
                <div className="md:w-72 pl-0 md:pl-4 border-t md:border-t-0 md:border-l border-slate-250 dark:border-slate-800 flex flex-col justify-center gap-1 shrink-0">
                  <p className="text-[10px] font-mono text-slate-404 dark:text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                    <span>🔖 LAST READ</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  </p>
                  <p className="text-xs font-black text-slate-800 dark:text-slate-200 line-clamp-1">
                    {lastReadItem.title}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (lastReadItem.type === 'pdf') {
                        setActiveTab('pdfs');
                        // Expand/scroll to it if needed
                      } else {
                        setActiveTab('notes');
                        setExpandedNotes(prev => ({ ...prev, [lastReadItem.id]: true }));
                      }
                    }}
                    className="mt-1 text-[11px] font-bold text-left text-blue-600 hover:text-blue-550 dark:text-blue-400 dark:hover:text-blue-350 cursor-pointer underline flex items-center gap-1"
                  >
                    <span>Click to resume reading {lastReadItem.type.toUpperCase()} ➔</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Controls Row (Text Size, Theme, Synced Pill) */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
          {/* TEXT SIZE pill */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-705">
            <span className="text-[9px] tracking-wider text-slate-400 font-bold uppercase select-none mr-1 pl-1">TEXT SIZE</span>
            <div className="flex items-center gap-0.5">
              {(['A-', 'A', 'A+'] as const).map(sz => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setTextSize(sz)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${textSize === sz ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 shadow-sm' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>

          {/* THEME pill */}
          <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200 dark:border-slate-705">
            <span className="text-[9px] pl-2 pr-1.5 tracking-wider text-slate-400 font-bold uppercase select-none">THEME</span>
            <button
              type="button"
              onClick={() => isDarkMode && onToggleTheme?.()}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 font-bold text-[10px] transition-all cursor-pointer ${!isDarkMode ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-400 hover:text-white'}`}
            >
              ☀️ Olive
            </button>
            <button
              type="button"
              onClick={() => !isDarkMode && onToggleTheme?.()}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 font-bold text-[10px] transition-all cursor-pointer ${isDarkMode ? 'bg-slate-950 text-white shadow-xs border border-slate-800' : 'text-slate-500 hover:text-slate-900'}`}
            >
              🌙 Night
            </button>
          </div>

          {/* Synced status pill */}
          <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-650 dark:text-emerald-400 font-bold text-[10px] uppercase tracking-wider font-sans select-none shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Synced Offline</span>
          </div>
        </div>
      </div>

      {/* Tabs list (Screen 5 Row of Pills) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-150 dark:border-slate-800">
        {visibleTabs.map(tab => {
          const TabIcon = tab.icon;
          const isSelected = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as TabType);
                setAiError('');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide uppercase transition-all shrink-0 cursor-pointer border
                ${isSelected
                  ? 'bg-blue-600 text-white dark:bg-blue-600 dark:text-white border-transparent shadow'
                  : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-55 dark:hover:bg-slate-800/50 hover:text-slate-950 dark:hover:text-white'
                }
              `}
            >
              <TabIcon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}

        {/* Modular Custom tabs config button */}
        <button
          type="button"
          onClick={() => setTabManagerOpen(!tabManagerOpen)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-all shrink-0 cursor-pointer border border-dashed
            ${tabManagerOpen
              ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-450'
              : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/35'
            }
          `}
          title="Add or remove workspace tabs inside subtopic view"
        >
          <span>{tabManagerOpen ? '✕ Close Manager' : '⚙️ Tab Manager'}</span>
          <span className="text-[9px] bg-slate-150 dark:bg-slate-800 text-slate-550 dark:text-slate-400 px-1.5 py-0.5 rounded font-sans leading-tight">
            {TABS.length - visibleTabs.length} hidden
          </span>
        </button>
      </div>

      {/* Interactive Tabs configuration inline card */}
      {tabManagerOpen && (
        <div className="p-4 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/85 dark:border-slate-800/80 rounded-2xl animate-in slide-in-from-top-3 duration-200 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold font-mono uppercase text-slate-500 dark:text-slate-405 tracking-wider">
                ⚙️ Subtopic Workspace Tabs Customizer
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5 font-sans leading-relaxed">
                Add or remove dynamic tools for this subtopic workspace instantly. Hiding a tab preserves your documents and notes.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {TABS.map(tab => {
              const IsActive = activeSubTabs.includes(tab.id);
              const TabIcon = tab.icon;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    let nextTabs: string[];
                    if (IsActive) {
                      if (visibleTabs.length <= 1) return; // Prevent deleting everything
                      nextTabs = activeSubTabs.filter(id => id !== tab.id);
                    } else {
                      nextTabs = [...activeSubTabs, tab.id];
                    }
                    onUpdateDb({ activeSubtopicTabs: nextTabs });
                  }}
                  disabled={IsActive && visibleTabs.length <= 1}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all select-none cursor-pointer text-left
                    ${IsActive
                      ? 'bg-white dark:bg-slate-950 border-blue-500 shadow-2xs'
                      : 'bg-slate-100/30 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800/80 opacity-60 hover:opacity-100'
                    }
                  `}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`p-1.5 rounded-lg ${IsActive ? 'bg-blue-600/10 text-blue-650 dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-405'}`}>
                      <TabIcon className="w-4 h-4" />
                    </div>
                    <span className={`text-xs font-semibold ${IsActive ? 'text-slate-905 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                      {tab.label}
                    </span>
                  </div>

                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${IsActive ? 'border-transparent bg-blue-600 text-white animate-in zoom-in-50 duration-100' : 'border-slate-300 bg-transparent'}`}>
                    {IsActive && <Check className="w-2.5 h-2.5 stroke-[4.5]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'dashboard' ? (
        /* =================== GE-STUDY STATION / ASSISTANT DASHBOARD LAYOUT =================== */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
          
          {/* LEFT AREA: Study Assistant Workspace (2/3 width) */}
          <div className="lg:col-span-2 space-y-6 bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-150 dark:border-slate-800 p-6 shadow-xs">
            
            {currentInteraction === null ? (
              <div className="space-y-6">
                {/* 1. Revision Quiz Button Pill */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-1">
                  <button
                    onClick={() => handleAIAssistantClick('test')}
                    className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-500 hover:to-indigo-550 text-white font-extrabold text-xs uppercase tracking-wider font-sans shadow-sm cursor-pointer transition-all active:scale-95 shrink-0"
                  >
                    <Sparkles className="w-4 h-4 animate-pulse text-white" />
                    <span>REVISION QUIZ</span>
                  </button>
                  <p className="text-[11px] font-medium text-slate-550 dark:text-slate-450 leading-relaxed font-sans">
                    Instantly request a highly interactive, custom 4-option evaluation test generated from textbooks and trained on <strong className="text-blue-600 dark:text-blue-400 font-bold">"{subtopic.name}"</strong> elements.
                  </p>
                </div>

                <hr className="border-slate-100 dark:border-slate-800" />

                {/* 2. Headline Title & Sparkles */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                    <h3 className="text-base font-extrabold font-sans text-slate-900 dark:text-white tracking-tight uppercase">
                      ✨ Gemini AI Study Assistant
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Generate flashcards, roadmaps, interactive tests, or textbook summaries trained on your notes materials.
                  </p>
                </div>

                {/* 3. Grid of 4 interactive cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {[
                    { id: 'test', title: 'INTERACTIVE TEST', desc: 'Quiz generated dynamically from notes', icon: HelpCircle, color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/5' },
                    { id: 'cards', title: 'FLASHCARD DECK', desc: 'Generate dynamic flip study notes', icon: FileCode, color: 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400 hover:bg-amber-500/5' },
                    { id: 'summary', title: 'TOPIC SUMMARY', desc: 'Synthesize code syntax cheat sheet', icon: FileText, color: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-500/5' },
                    { id: 'roadmap', title: 'VISUAL ROADMAP', desc: 'Estimated steps to master concept', icon: Play, color: 'bg-violet-500/10 border-violet-500/20 text-violet-700 dark:text-violet-400 hover:bg-violet-500/5' }
                  ].map(card => {
                    const CardIcon = card.icon;
                    return (
                      <button
                        key={card.id}
                        onClick={() => handleAIAssistantClick(card.id as any)}
                        className={`group p-4 rounded-2xl border text-left flex flex-col justify-between gap-4 transition-all duration-300 hover:shadow-sm hover:-translate-y-0.5 cursor-pointer ${card.color}`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-[10px] uppercase font-bold tracking-wider font-mono">{card.title}</span>
                          <CardIcon className="w-3.5 h-3.5 transition-transform group-hover:scale-115" />
                        </div>
                        <p className="text-xs text-slate-550 dark:text-slate-400 leading-normal group-hover:text-slate-900 dark:group-hover:text-white transition-colors duration-205">
                          {card.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* ACTIVE INTERACTIVE SESSION WORKSPACE PANEL */
              <div className="space-y-6">
                
                {/* Session Header banner */}
                <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-705">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-pulse" />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-850 dark:text-white">
                      Active AI Study Room: {currentInteraction.toUpperCase()}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setCurrentInteraction(null);
                      setAssistantData(null);
                      setAssistantError('');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 hover:opacity-90 font-sans text-[10px] font-bold uppercase tracking-wider transition flex items-center gap-1 cursor-pointer"
                  >
                    <span>←</span> Go back to Study Desk
                  </button>
                </div>

                {/* Loader State */}
                {assistantLoading && (
                  <div className="py-24 border-2 border-dashed border-slate-205 dark:border-slate-800 bg-slate-50/10 dark:bg-slate-950/20 rounded-2xl flex flex-col items-center justify-center text-center space-y-4">
                    <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white font-sans">
                        Gemini is organizing lesson plans...
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-1 block">
                        Compiling textbooks database schemas
                      </p>
                    </div>
                  </div>
                )}

                {/* Error Banner state */}
                {assistantError && (
                  <div className="p-6 bg-red-100/10 border border-red-500/20 text-red-550 dark:text-red-400 rounded-2xl flex flex-col items-center justify-center text-center space-y-4">
                    <AlertCircle className="w-8 h-8 text-red-500 shrink-0" />
                    <div>
                      <p className="font-extrabold text-sm font-sans uppercase tracking-wide">Gemini AI Synthesis Unreached</p>
                      <p className="text-xs leading-relaxed opacity-90 max-w-sm mx-auto mt-1">{assistantError}</p>
                    </div>
                    <button
                      onClick={() => handleAIAssistantClick(currentInteraction)}
                      className="px-4 py-2 border border-transparent rounded-xl bg-red-650 hover:bg-red-550 text-white font-bold text-xs uppercase tracking-wider font-mono shadow transition cursor-pointer flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retry Request</span>
                    </button>
                  </div>
                )}

                {/* Active content panel renders */}
                {assistantData && (
                  <div className="space-y-6">
                    
                    {/* A. MCQ Quiz taker module */}
                    {currentInteraction === 'test' && (
                      <div className="bg-slate-50/50 dark:bg-slate-950/20 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-left">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold font-mono uppercase tracking-wide">
                            DIAGNOSTIC ACTIVE RECALL TEST
                          </span>
                          <button
                            onClick={() => handleAIAssistantClick('test')}
                            className="flex items-center gap-1.5 text-[10px] uppercase font-mono tracking-wider text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Try Another</span>
                          </button>
                        </div>

                        <div className="text-base font-bold text-slate-905 dark:text-white leading-relaxed font-sans pt-1 space-y-1">
                          {renderSimpleMarkdown(assistantData.question, "text-base font-bold text-slate-905 dark:text-white leading-relaxed font-sans")}
                        </div>

                        <div className="grid grid-cols-1 gap-3 pt-2">
                          {assistantData.options && assistantData.options.map((option: string, choiceIdx: number) => {
                            const isSelected = selectedQuizOption === choiceIdx;
                            const isCorrect = choiceIdx === assistantData.correctIndex;
                            let btnStyle = 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-300';
                            
                            if (quizSubmitted) {
                              if (isCorrect) {
                                btnStyle = 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold';
                              } else if (isSelected) {
                                btnStyle = 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-400 font-bold';
                              } else {
                                btnStyle = 'border-slate-200 dark:border-slate-800/80 opacity-55 text-slate-500';
                              }
                            } else if (isSelected) {
                              btnStyle = 'border-blue-600 bg-blue-650/10 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400';
                            }

                            return (
                              <button
                                key={choiceIdx}
                                disabled={quizSubmitted}
                                onClick={() => setSelectedQuizOption(choiceIdx)}
                                className={`w-full text-left p-3.5 rounded-xl border text-xs font-semibold transition-all ${btnStyle} flex items-center justify-between cursor-pointer`}
                              >
                                <span>{String.fromCharCode(65 + choiceIdx)}. &nbsp; {renderInlineFormat(option)}</span>
                                {quizSubmitted && isCorrect && <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />}
                                {quizSubmitted && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>

                        {!quizSubmitted ? (
                          <button
                            disabled={selectedQuizOption === null}
                            onClick={() => setQuizSubmitted(true)}
                            className="w-full mt-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 text-xs font-bold uppercase tracking-wider font-mono transition disabled:opacity-45 cursor-pointer"
                          >
                            Submit Choice
                          </button>
                        ) : (
                          <div className="mt-4 p-4 bg-slate-100 dark:bg-slate-800/60 rounded-xl space-y-2 border border-slate-200/50 dark:border-slate-705 text-left">
                            <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                              💡 MODEL LOGIC EXPLANATION
                            </p>
                            <div className="text-xs leading-relaxed text-slate-650 dark:text-slate-350 space-y-1">
                              {renderSimpleMarkdown(assistantData.explanation, "text-xs leading-relaxed text-slate-650 dark:text-slate-350")}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* B. Flashcards index card session */}
                    {currentInteraction === 'cards' && (
                      <div className="space-y-5 text-left">
                        {(() => {
                          const cards = assistantData.flashcards || [];
                          const curCard = cards[activeCardIndex];
                          if (!curCard) return <p className="text-center italic text-xs py-4 dark:text-slate-500">Zero cards parsed.</p>;

                          return (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <span className="px-2.5 py-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold font-mono uppercase tracking-wide">
                                  FLASHCARD RECALL DECK
                                </span>
                                <span className="text-xs font-mono text-slate-550 dark:text-slate-450 font-bold select-none">
                                  Card {activeCardIndex + 1} of {cards.length}
                                </span>
                              </div>

                              <div 
                                onClick={() => setIsCardFlipped(!isCardFlipped)}
                                className={`h-64 cursor-pointer relative select-none rounded-2xl py-8 px-6 flex flex-col justify-between overflow-hidden shadow-xs border transition-all duration-300 transform active:scale-98 text-center
                                  ${isCardFlipped 
                                    ? 'bg-slate-950 text-slate-100 border-slate-800' 
                                    : 'bg-amber-50/20 dark:bg-amber-950/5 text-slate-950 dark:text-white border-amber-500/20 dark:border-amber-900/20'
                                  }
                                `}
                              >
                                <div className="text-[9px] uppercase font-mono tracking-widest text-slate-400">
                                  {isCardFlipped ? 'ANSWER / CODE CHEAT' : 'TERM / CONCEPT EXPLORATION'}
                                </div>

                                <div className="py-2 flex-1 flex items-center justify-center">
                                  {isCardFlipped ? (
                                    <div className="text-xs sm:text-sm font-medium leading-relaxed font-mono text-slate-200 max-w-lg">
                                      {curCard.back}
                                    </div>
                                  ) : (
                                    <div className="text-base sm:text-lg font-extrabold tracking-tight font-sans text-slate-900 dark:text-white max-w-lg">
                                      {curCard.front}
                                    </div>
                                  )}
                                </div>

                                <div className="text-[9px] text-slate-400 font-mono tracking-wider uppercase select-none font-bold">
                                  Click card to flip
                                </div>
                              </div>

                              <div className="flex items-center justify-between gap-4 pt-1">
                                <button
                                  disabled={activeCardIndex === 0}
                                  onClick={() => {
                                    setActiveCardIndex(activeCardIndex - 1);
                                    setIsCardFlipped(false);
                                  }}
                                  className="px-4 py-2 text-xs font-mono font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-755 text-slate-800 dark:text-white rounded-lg transition disabled:opacity-45 cursor-pointer border border-slate-200/50 dark:border-slate-705"
                                >
                                  ← Back
                                </button>
                                
                                <div className="flex-1 max-w-xs bg-slate-200 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                                  <div 
                                    className="bg-amber-500 h-full transition-all duration-200" 
                                    style={{ width: `${((activeCardIndex + 1) / cards.length) * 100}%` }}
                                  />
                                </div>

                                <button
                                  disabled={activeCardIndex === cards.length - 1}
                                  onClick={() => {
                                    setActiveCardIndex(activeCardIndex + 1);
                                    setIsCardFlipped(false);
                                  }}
                                  className="px-4 py-2 text-xs font-mono font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-755 text-slate-800 dark:text-white rounded-lg transition disabled:opacity-45 cursor-pointer border border-slate-200/50 dark:border-slate-705"
                                >
                                  Next →
                                </button>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* C. Textbook cheatsheet renderer wrapper */}
                    {currentInteraction === 'summary' && (
                      <div className="space-y-4 text-left">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-1 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-[10px] font-bold font-mono uppercase tracking-wide">
                            TEXTBOOK SUMMARY & SYNTAX CHEATS
                          </span>
                          <button
                            onClick={() => saveSynthesizedNote(`${subtopic.name} STUDY SUMMARY`, assistantData)}
                            disabled={savingArtifact === 'summary'}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase font-bold border tracking-wider transition ${savingArtifact === 'summary' ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/25' : 'bg-blue-600 hover:bg-blue-500 text-white border-transparent cursor-pointer'}`}
                          >
                            {savingArtifact === 'summary' ? '✓ Saved into Notes' : '💾 Save to Notes Vault'}
                          </button>
                        </div>

                        <div className="p-5 bg-slate-50 dark:bg-slate-950/20 rounded-2xl border border-slate-200" style={{ contentVisibility: 'auto' }}>
                          <div className="max-h-96 overflow-y-auto whitespace-pre-wrap leading-relaxed pr-2 p-1">
                            {renderSimpleMarkdown(assistantData)}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* D. Master Method Roadmap progress timeline checklist */}
                    {currentInteraction === 'roadmap' && (
                      <div className="space-y-5 text-left">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-1 rounded bg-violet-500/10 text-violet-600 dark:text-violet-400 text-[10px] font-bold font-mono uppercase tracking-wide">
                            METHODICAL ROADMAP TIMELINE
                          </span>
                        </div>

                        <div className="relative border-l-2 border-dashed border-slate-200 dark:border-slate-800 pl-6 ml-3 space-y-6 pt-2">
                          {assistantData.steps && assistantData.steps.map((step: any, stepIdx: number) => (
                            <div key={stepIdx} className="relative">
                              <div className="absolute -left-[35px] top-1.5 w-6 h-6 rounded-full bg-blue-650 text-white font-mono text-[11px] font-extrabold flex items-center justify-center shadow-xs">
                                {step.stepNum || (stepIdx + 1)}
                              </div>

                              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/10 space-y-2">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                  <h5 className="text-sm font-extrabold text-slate-905 dark:text-white font-sans">
                                    {step.title}
                                  </h5>
                                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[9px] text-slate-500 dark:text-slate-400 font-mono tracking-wider font-bold">
                                    ⏱️ {step.timeframe}
                                  </span>
                                </div>

                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
                                  {step.focus}
                                </p>

                                <div className="pt-2 border-t border-slate-150/50 dark:border-slate-800/50 space-y-1.5">
                                  {step.tasks && step.tasks.map((task: string, taskIdx: number) => (
                                    <label key={taskIdx} className="flex items-start gap-2 text-xs font-semibold text-slate-600 dark:text-slate-350 hover:text-slate-950 dark:hover:text-white transition-colors cursor-pointer select-none font-sans">
                                      <input 
                                        type="checkbox" 
                                        className="mt-0.5 w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 text-indigo-600" 
                                      />
                                      <span>{task}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* E. Senior Accordion Scenario Answers */}
                    {currentInteraction === 'faang' && (
                      <div className="space-y-4 text-left">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-1 rounded bg-red-500/10 text-rose-600 dark:text-red-400 text-[10px] font-bold font-mono uppercase tracking-wide">
                            🧑‍💻 FAANG SCENARIO INTERVIEW
                          </span>
                          <button
                            onClick={() => saveSynthesizedInterview(assistantData.question, assistantData.answer, assistantData.level || 'senior')}
                            disabled={savingArtifact === 'faang'}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase border tracking-wider transition ${savingArtifact === 'faang' ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/25' : 'bg-blue-600 hover:bg-blue-500 text-white border-transparent cursor-pointer'}`}
                          >
                            {savingArtifact === 'faang' ? '✓ Saved' : '💾 Save to Interview bank'}
                          </button>
                        </div>

                        <div className="p-5 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                          <span className="inline-block px-2 py-0.5 rounded bg-pink-100 dark:bg-pink-950 text-pink-600 dark:text-pink-300 text-[9px] font-bold font-mono uppercase tracking-wider">
                            {assistantData.level || 'senior'} level Scenario
                          </span>

                          <div className="text-sm font-extrabold text-slate-905 dark:text-white leading-relaxed font-sans space-y-1">
                            {renderSimpleMarkdown(`Q: ${assistantData.question}`, "text-sm font-extrabold text-slate-905 dark:text-white font-sans leading-relaxed")}
                          </div>

                          <div className="border-t border-slate-150/50 dark:border-slate-850/50 pt-3 space-y-1.5">
                            <span className="text-[9px] font-mono tracking-widest text-slate-400 uppercase font-sans">CORRECT RESPONSE METHOD MATRIX</span>
                            <div className="text-xs leading-relaxed text-slate-650 dark:text-slate-350 font-mono" style={{ contentVisibility: 'auto' }}>
                              {renderSimpleMarkdown(assistantData.answer)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* F. Algoritm task with problem statements */}
                    {currentInteraction === 'coding' && (
                      <div className="space-y-4 text-left">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-1 rounded bg-teal-500/10 text-teal-600 dark:text-teal-400 text-[10px] font-bold font-mono uppercase tracking-wide">
                            ALGORITHM DIAGNOSTIC CODE SHEET
                          </span>
                          <button
                            onClick={() => saveSynthesizedCoding(assistantData.title, assistantData.problemStatement, assistantData.difficulty || 'medium', assistantData.starterCode || '', assistantData.solution || '')}
                            disabled={savingArtifact === 'coding'}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase border tracking-wider transition ${savingArtifact === 'coding' ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/25' : 'bg-blue-600 hover:bg-blue-500 text-white border-transparent cursor-pointer'}`}
                          >
                            {savingArtifact === 'coding' ? '✓ Saved' : '💾 Add to Challenges'}
                          </button>
                        </div>

                        <div className="p-5 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase tracking-widest text-white 
                              ${(assistantData.difficulty || 'medium') === 'easy' ? 'bg-emerald-500' : (assistantData.difficulty || 'medium') === 'hard' ? 'bg-rose-500' : 'bg-amber-500'}
                            `}>
                              {assistantData.difficulty || 'medium'}
                            </span>
                            <h5 className="text-sm font-extrabold text-slate-905 dark:text-white font-sans leading-none">
                              {assistantData.title}
                            </h5>
                          </div>

                          <div className="text-xs leading-relaxed text-slate-655 dark:text-slate-350 font-sans border-b border-dashed border-slate-150 dark:border-slate-800 pb-3">
                            {renderSimpleMarkdown(assistantData.problemStatement)}
                          </div>

                          {assistantData.starterCode && (
                            <div className="space-y-1">
                              <span className="text-[9px] font-bold text-slate-400 uppercase font-mono">Starter Workspace Layout</span>
                              <pre className="p-3.5 rounded-xl bg-gray-950 border border-gray-850 text-emerald-400 font-mono text-xs overflow-x-auto">
                                <code>{assistantData.starterCode}</code>
                              </pre>
                            </div>
                          )}

                          {assistantData.solution && (
                            <div className="space-y-1 border-t border-slate-150/45 dark:border-slate-800/40 pt-3">
                              <span className="text-[9px] font-bold text-slate-400 uppercase font-mono block">Reference Reference Solution Code</span>
                              <pre className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 font-mono text-xs overflow-x-auto">
                                <code>{assistantData.solution}</code>
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                  </div>
                )}

              </div>
            )}

          </div>

          {/* RIGHT AREA: Core Concepts & Recall Systems (1/3 width) */}
          <div className="space-y-6">
            
            {/* CARD 1: CORE CONCEPTS */}
            <div className="bg-slate-950 dark:bg-slate-900 rounded-3xl p-6 border border-slate-900 shadow-xl text-white flex flex-col justify-between text-left">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 font-bold font-sans text-xs tracking-wider uppercase text-emerald-400">
                    <span>🗃️</span>
                    <span>CORE CONCEPTS</span>
                  </div>
                  <button
                    onClick={() => setAddConceptOpen(true)}
                    className="text-[10px] uppercase font-mono tracking-wider font-bold bg-slate-800 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-700"
                  >
                    + add item
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 font-semibold font-sans uppercase tracking-wide leading-none select-none">
                  Key items of subtopic
                </p>

                {(subtopic.coreConcepts || []).length === 0 ? (
                  <p className="text-xs text-slate-500 font-sans italic text-center py-8">
                    Click Add to list core items.
                  </p>
                ) : (
                  <ul className="space-y-2 mt-4">
                    {(subtopic.coreConcepts || []).map((item, index) => (
                      <li key={index} className="group flex items-start gap-2.5 text-xs text-slate-300 hover:text-white transition-colors duration-150 py-1 border-b border-slate-850 last:border-0">
                        <span className="text-emerald-500 mt-0.5 select-none font-bold">•</span>
                        <span className="flex-1 leading-relaxed">{item}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveCoreConcept(index);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-red-400 rounded transition-opacity cursor-pointer"
                          title="Remove concept"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* CARD 2: RECALL ADVICE AMBER UNIT */}
            <div className="bg-amber-500/10 dark:bg-amber-950/10 border border-amber-500/20 rounded-3xl p-6 text-left space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400 text-xs font-sans tracking-wide uppercase select-none">
                <span>🧠</span>
                <span>EFFECTIVE RECALL SYSTEM</span>
              </div>
              <p className="text-xs leading-relaxed text-slate-650 dark:text-slate-350 font-medium font-sans">
                Science confirms writing custom manual summaries and practicing micro quiz trials boosts active recall by <strong className="text-amber-700 dark:text-amber-400 font-bold font-sans">82%</strong>. Use the active study tools to draft your revision checklist.
              </p>
            </div>

          </div>

        </div>
      ) : (
        /* =================== STANDARD DETAILED RESOURCES TABS CARD WORKSPACE =================== */
        <div className="bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        
        {/* Dynamic Inner Tab Description headers */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800 mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white capitalize font-sans leading-none">
              {activeTab === 'pdfs' ? 'PDF Study Worksheets' : activeTab === 'interviews' ? 'Interview Q&A pairs' : activeTab}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-sans">
              {activeTab === 'notes' && 'Write clear summaries and study notes with custom Markdown syntax.'}
              {activeTab === 'pdfs' && 'Simulate, upload, and save detailed scholarly files or cheatsheets.'}
              {activeTab === 'videos' && 'Pin academic YouTube tutorials and play them inline.'}
              {activeTab === 'concepts' && 'Consolidate complex programming language paradigms and configurations.'}
              {activeTab === 'coding' && 'Practice diagnostic syntax challenges with revealable mock reference solutions.'}
              {activeTab === 'interviews' && 'Prepare using high-level senior technical interview scenarios.'}
              {activeTab === 'quizzes' && 'Test your mental memory with multi-choice checks & visual explanations.'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* AI Generator button: Not visible for PDFs or Videos (only text generative supports) */}
            {activeTab !== 'pdfs' && activeTab !== 'videos' && (
              <button
                onClick={handleAIGenerate}
                disabled={aiGenerating}
                className="inline-flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-wider font-mono transition-all disabled:opacity-50 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 animate-pulse text-blue-600 dark:text-blue-400" />
                <span>AI Generate</span>
              </button>
            )}

            {activeTab === 'videos' && (
              <button
                onClick={() => setPlaylistModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white border border-red-700/20 font-bold text-xs uppercase tracking-wider font-mono transition-all cursor-pointer shadow-xs"
              >
                <Layers className="w-4 h-4 text-white" />
                <span>Import Playlist</span>
              </button>
            )}

            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1 px-4.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-900 dark:text-white border border-slate-200/50 dark:border-slate-705 font-bold text-xs uppercase tracking-wider font-mono transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400 font-bold" />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* Global loader during AI processes */}
        {aiGenerating && (
          <div className="py-12 border-2 border-dashed border-blue-500/20 bg-blue-500/5 rounded-2xl flex flex-col items-center justify-center text-center space-y-4 mb-6">
            <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white font-sans">
                Generating study elements...
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-mono tracking-wide">
                {generationStep}
              </p>
            </div>
          </div>
        )}

        {aiError && (
          <div className="p-4 bg-red-100/10 border border-red-500/20 text-red-550 dark:text-red-400 rounded-xl mb-6 text-xs flex items-start gap-2 animate-in fade-in duration-200">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Gemini AI Synthesis Unreached</p>
              <p className="mt-1 leading-relaxed opacity-90">{aiError}</p>
            </div>
          </div>
        )}

        {/* =============== Tab 0: Topics Tracker =============== */}
        {activeTab === 'tracker' && (
          <div className="space-y-6">
            {/* Intellectually Stimulating Gamified Psychological Dashboard */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-550/15 via-emerald-500/10 to-amber-500/5 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 shadow-sm relative overflow-hidden">
              {/* Abstract decorative ambient shapes */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full filter blur-2xl pointer-events-none -mr-16 -mt-16" />
              <div className="absolute bottom-0 left-0 w-36 h-36 bg-blue-500/5 rounded-full filter blur-2xl pointer-events-none -ml-16 -mb-16" />

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1 px-2.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 font-extrabold text-[10px] tracking-wider uppercase font-mono border border-teal-500/20">
                      ⚡ Ebbinghaus Aligned
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500">•</span>
                    <span className="text-xs font-mono font-bold text-emerald-500 dark:text-emerald-400">Leitner System Ready</span>
                  </div>
                  <h4 className="text-xl font-bold font-sans tracking-tight text-slate-900 dark:text-white">
                    Cognitive Consolidation Masterboard
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
                    Combat active neural decay. Moving cards through physical retrieval filters locks complex engineering theory into long-term crystalline storage.
                  </p>
                </div>

                {/* Cognitive Retention Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-center shrink-0 w-full lg:w-auto">
                  <div className="bg-white/80 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="text-2xl font-black text-rose-500 font-sans tracking-tight">
                      {listTrackers.filter(t => (t.confidence || 0) <= 30).length}
                    </div>
                    <div className="text-[9px] uppercase tracking-wider text-slate-405 mt-0.5 font-bold">Unretained</div>
                  </div>
                  <div className="bg-white/80 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="text-2xl font-black text-amber-500 font-sans tracking-tight">
                      {listTrackers.filter(t => (t.confidence || 0) >= 40 && (t.confidence || 0) <= 80).length}
                    </div>
                    <div className="text-[9px] uppercase tracking-wider text-slate-405 mt-0.5 font-bold">Active recall</div>
                  </div>
                  <div className="bg-white/80 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="text-2xl font-black text-emerald-500 font-sans tracking-tight">
                      {listTrackers.filter(t => (t.confidence || 0) >= 90).length}
                    </div>
                    <div className="text-[9px] uppercase tracking-wider text-slate-405 mt-0.5 font-bold">Crystallized</div>
                  </div>
                  <div className="bg-white/80 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="text-2xl font-black text-indigo-500 dark:text-indigo-400 font-sans tracking-tight">
                      {listTrackers.length > 0 ? Math.round((listTrackers.filter(t => t.revised).length / listTrackers.length) * 100) : 0}%
                    </div>
                    <div className="text-[9px] uppercase tracking-wider text-slate-405 mt-0.5 font-bold">Self-Tested</div>
                  </div>
                </div>
              </div>

              {/* Progress and Psychological State Summary */}
              {listTrackers.length > 0 && (
                <div className="mt-5 pt-4 border-t border-slate-200/50 dark:border-slate-800/80">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center text-[10px] font-bold font-mono tracking-wider text-slate-500 dark:text-slate-400 gap-1.5 mb-2">
                    <div className="flex items-center gap-1.5 uppercase">
                      <span>🧠 Overall Synapse Index:</span>
                      <span className="text-slate-905 dark:text-teal-400 font-extrabold">
                        {listTrackers.length > 0 ? Math.round(listTrackers.reduce((s, curr) => s + (curr.confidence || 0), 0) / listTrackers.length) : 0}% Confidence
                      </span>
                    </div>
                    <div className="text-amber-600 dark:text-amber-400 text-right">
                      {listTrackers.length > 0 && (listTrackers.reduce((s, curr) => s + (curr.confidence || 0), 0) / listTrackers.length) < 40 && "⚠️ Heavy mental decay hazard. Engage core retrieval review!"}
                      {listTrackers.length > 0 && (listTrackers.reduce((s, curr) => s + (curr.confidence || 0), 0) / listTrackers.length) >= 40 && (listTrackers.reduce((s, curr) => s + (curr.confidence || 0), 0) / listTrackers.length) < 75 && "🌱 Synaptic pathways stabilizing. Reinforce with more coding!"}
                      {listTrackers.length > 0 && (listTrackers.reduce((s, curr) => s + (curr.confidence || 0), 0) / listTrackers.length) >= 75 && "🔥 Impeccable structural consolidation. Keep pushing!"}
                    </div>
                  </div>
                  <div className="h-2.5 w-full bg-slate-200/80 dark:bg-slate-850 rounded-full overflow-hidden block">
                    <div 
                      className="h-full bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 transition-all duration-305"
                      style={{ width: `${Math.round(listTrackers.reduce((s, curr) => s + (curr.confidence || 0), 0) / listTrackers.length)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Quick adding container inline along with the MD bulk parser button */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newTrackerTitle.trim()) return;
                  const newTr: TrackerItem = {
                    id: `tr-${Date.now()}`,
                    subtopicId,
                    title: newTrackerTitle.trim(),
                    started: false,
                    completed: false,
                    revised: false,
                    confidence: 10, // Default start at 10%
                    isPerfect: false,
                    createdAt: new Date().toISOString()
                  };
                  onUpdateDb({ trackers: [...(dbState.trackers || []), newTr] });
                  setNewTrackerTitle('');
                }}
                className="flex-1 flex items-center gap-2 p-3 bg-white dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800"
              >
                <input
                  type="text"
                  placeholder="💡 Enter core concept to master... (e.g., Closure garbage collection leak patterns)"
                  value={newTrackerTitle}
                  onChange={(e) => setNewTrackerTitle(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-slate-905 dark:text-white placeholder-slate-400 outline-hidden focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold font-sans transition-colors shrink-0 cursor-pointer"
                >
                  + Add Topic
                </button>
              </form>

              <button
                type="button"
                onClick={() => setIsMdImportModalOpen(true)}
                className="px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold font-sans flex items-center justify-center gap-2 transition shrink-0 cursor-pointer"
                title="Bulk generate checklist of topics from a pasted Markdown / text file"
              >
                <ClipboardList className="w-4 h-4 text-emerald-500" />
                <span>Import MD Checklist</span>
              </button>
            </div>

            {/* Beautiful Spaced Repetition Leitner Filters Row */}
            <div className="flex flex-wrap items-center gap-2 pb-1 overflow-x-auto text-slate-800 dark:text-slate-100">
              <button
                type="button"
                onClick={() => setActiveBoxFilter('all')}
                className={`px-3 py-2 rounded-xl text-xs font-bold font-sans transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap border ${
                  activeBoxFilter === 'all'
                    ? 'bg-indigo-650 border-indigo-650 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-650 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                📥 Show All ({listTrackers.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveBoxFilter('unseen')}
                className={`px-3 py-2 rounded-xl text-xs font-bold font-sans transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap border ${
                  activeBoxFilter === 'unseen'
                    ? 'bg-rose-500 border-rose-500 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-rose-500 dark:text-rose-400 border-rose-100 dark:border-rose-950/40 hover:bg-rose-50/40 dark:hover:bg-rose-950/25'
                }`}
              >
                🔴 Box 1: Sensory Register ({listTrackers.filter(t => (t.confidence || 0) <= 30).length})
              </button>
              <button
                type="button"
                onClick={() => setActiveBoxFilter('learning')}
                className={`px-3 py-2 rounded-xl text-xs font-bold font-sans transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap border ${
                  activeBoxFilter === 'learning'
                    ? 'bg-amber-550 border-amber-550 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-950/40 hover:bg-amber-50/40 dark:hover:bg-amber-950/25'
                }`}
              >
                🟡 Box 2: Working Memory ({listTrackers.filter(t => (t.confidence || 0) >= 40 && (t.confidence || 0) <= 60).length})
              </button>
              <button
                type="button"
                onClick={() => setActiveBoxFilter('recalling')}
                className={`px-3 py-2 rounded-xl text-xs font-bold font-sans transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap border ${
                  activeBoxFilter === 'recalling'
                    ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-950/40 hover:bg-blue-50/40 dark:hover:bg-blue-950/25'
                }`}
              >
                🔵 Box 3: Active Retrieval ({listTrackers.filter(t => (t.confidence || 0) >= 70 && (t.confidence || 0) <= 80).length})
              </button>
              <button
                type="button"
                onClick={() => setActiveBoxFilter('mastered')}
                className={`px-3 py-2 rounded-xl text-xs font-bold font-sans transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap border ${
                  activeBoxFilter === 'mastered'
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-950/40 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/25'
                }`}
              >
                🟢 Box 4: Long-Term Memory ({listTrackers.filter(t => (t.confidence || 0) >= 90).length})
              </button>
            </div>

            {/* Topic Tracker List rendering */}
            <div className="space-y-4">
              {filteredTrackers.map(tr => {
                const handleToggleField = (field: 'started' | 'completed' | 'revised' | 'isPerfect') => {
                  const updated = (dbState.trackers || []).map(t => {
                    if (t.id === tr.id) {
                      const updatedItem = { ...t, [field]: !t[field] };
                      if (field === 'isPerfect' && updatedItem.isPerfect) {
                        updatedItem.confidence = 100;
                        updatedItem.completed = true;
                        updatedItem.started = true;
                        updatedItem.revised = true;
                      }
                      return updatedItem;
                    }
                    return t;
                  });
                  onUpdateDb({ trackers: updated });
                };

                const handleSliderChange = (val: number) => {
                  const updated = (dbState.trackers || []).map(t => {
                    if (t.id === tr.id) {
                      const updatedItem = { ...t, confidence: val, isPerfect: val === 100 ? true : t.isPerfect };
                      if (val === 100) {
                        updatedItem.completed = true;
                        updatedItem.started = true;
                        updatedItem.revised = true;
                        updatedItem.isPerfect = true;
                      }
                      return updatedItem;
                    }
                    return t;
                  });
                  onUpdateDb({ trackers: updated });
                };

                // Dynamic Styling for Box stages
                const score = tr.confidence || 0;
                let cardColorClasses = '';
                let boxBadgeLabel = '';
                let boxBadgeColor = '';
                let cognitiveReaction = '';

                if (score <= 30) {
                  cardColorClasses = 'border-l-4 border-l-rose-500 bg-rose-500/5 dark:bg-rose-500/5 border-slate-200 dark:border-slate-800';
                  boxBadgeLabel = '🔴 Box 1: Sensory Stage';
                  boxBadgeColor = 'text-rose-600 dark:text-rose-400 bg-rose-500/10 dark:bg-rose-500/10';
                  cognitiveReaction = score <= 10 
                    ? '💤 Blind spot. Please read this topic thoroughly before active coding.'
                    : '🔍 Vaguely familiar, but would freeze under interview pressure.';
                } else if (score <= 60) {
                  cardColorClasses = 'border-l-4 border-l-amber-500 bg-amber-500/5 dark:bg-amber-500/5 border-slate-200 dark:border-slate-800';
                  boxBadgeLabel = '🟡 Box 2: Working Memory';
                  boxBadgeColor = 'text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/10';
                  cognitiveReaction = '🌱 Concept understood. Working through active recall implementation details.';
                } else if (score <= 80) {
                  cardColorClasses = 'border-l-4 border-l-indigo-500 bg-indigo-500/5 dark:bg-indigo-500/5 border-slate-200 dark:border-slate-800';
                  boxBadgeLabel = '🔵 Box 3: Active Retrieval';
                  boxBadgeColor = 'text-indigo-600 dark:text-indigo-400 bg-indigo-505/10 dark:bg-indigo-505/10';
                  cognitiveReaction = '⚡ Strong concept grasp! Ready to model core structures without assistance.';
                } else {
                  cardColorClasses = 'border-l-4 border-l-emerald-500 bg-emerald-500/5 dark:bg-emerald-950/20 border-emerald-550/20 dark:border-emerald-550/10 shadow-sm shadow-emerald-500/5';
                  boxBadgeLabel = '🟢 Box 4: Long-Term Storage';
                  boxBadgeColor = 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/10 border border-emerald-500/20';
                  cognitiveReaction = '🏆 Elite level retention! Ready to explain or lecture this on a whiteboard.';
                }

                return (
                  <div 
                    key={tr.id} 
                    className={`p-5 rounded-2xl border transition-all duration-200 hover:shadow-xs hover:border-slate-300 dark:hover:border-slate-700 relative group flex flex-col gap-4 ${cardColorClasses}`}
                  >
                    {/* Top Row: Title, Perfect Toggle, Delete */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1.5 flex-1 select-none">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-lg ${boxBadgeColor}`}>
                            {boxBadgeLabel}
                          </span>
                          
                          <h4 className="text-base font-bold text-slate-900 dark:text-white leading-snug font-sans flex items-center gap-1.5">
                            {tr.title}
                          </h4>
                        </div>
                        {tr.notes ? (
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-sans italic pl-1 border-l border-slate-200 dark:border-slate-800 mt-1">
                            "{tr.notes}"
                          </p>
                        ) : (
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 italic pl-1 mt-0.5">
                            No revision summary notes added yet.
                          </p>
                        )}
                      </div>

                      {/* Small actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(tr, 'trackers')}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-amber-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Edit Topic Details"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const filtered = (dbState.trackers || []).filter(t => t.id !== tr.id);
                            onUpdateDb({ trackers: filtered });
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Delete Topic Tracker"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Middle Row: Progress and Checkbox Actions */}
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-center bg-slate-50/50 dark:bg-slate-900/40 p-4.5 rounded-xl border border-slate-150 dark:border-slate-800/80">
                      {/* Immersive Cognitive Stages Roadmap */}
                      <div className="xl:col-span-8 flex flex-col gap-2">
                        <span className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-slate-400 dark:text-slate-500">
                          Cognitive Consolidation Progress:
                        </span>
                        
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleField('started')}
                            className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                              tr.started 
                                ? 'bg-indigo-600 border-transparent text-white shadow-xs' 
                                : 'bg-white dark:bg-slate-950 text-slate-500 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white'
                            }`}
                            title="Cognitive Stage 1: Encoding facts into working memory."
                          >
                            <input type="checkbox" checked={tr.started || false} readOnly className="pointer-events-none rounded text-indigo-650 focus:ring-0 w-3 h-3" />
                            <span>1. Encoded</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleField('completed')}
                            className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                              tr.completed 
                                ? 'bg-blue-600 border-transparent text-white shadow-xs' 
                                : 'bg-white dark:bg-slate-950 text-slate-500 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white'
                            }`}
                            title="Cognitive Stage 2: Organizing and outlining principles."
                          >
                            <input type="checkbox" checked={tr.completed || false} readOnly className="pointer-events-none rounded text-blue-650 focus:ring-0 w-3 h-3" />
                            <span>2. Restructured</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleField('revised')}
                            className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                              tr.revised 
                                ? 'bg-violet-650 border-transparent text-white shadow-xs' 
                                : 'bg-white dark:bg-slate-950 text-slate-500 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white'
                            }`}
                            title="Cognitive Stage 3: Self-testing active memory recall."
                          >
                            <input type="checkbox" checked={tr.revised || false} readOnly className="pointer-events-none rounded text-violet-650 focus:ring-0 w-3 h-3" />
                            <span>3. Self-Tested</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleField('isPerfect')}
                            className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                              tr.isPerfect 
                                ? 'bg-emerald-600 border-transparent text-white shadow-xs' 
                                : 'bg-white dark:bg-slate-950 text-slate-500 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white'
                            }`}
                            title="Cognitive Stage 4: Mastery locked into long-term crystalline storage."
                          >
                            <span>⭐</span>
                            <span>4. Mastery Locked</span>
                          </button>
                        </div>
                      </div>

                      {/* Interactive Retention Gauge with real-time feedback */}
                      <div className="xl:col-span-4 flex flex-col gap-1.5 bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-slate-150 dark:border-slate-800/80">
                        <div className="flex justify-between items-center text-[10px] font-bold font-mono tracking-wider text-slate-400 dark:text-slate-500">
                          <span>STRENGTH INDEX:</span>
                          <span className="text-slate-905 dark:text-indigo-400 font-extrabold">{score}%</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="10"
                            value={score}
                            onChange={(e) => handleSliderChange(Number(e.target.value))}
                            className="w-full accent-indigo-600 h-1.5 bg-slate-100 dark:bg-slate-850 rounded-lg appearance-none cursor-ew-resize focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Qualitative Brain reaction feedback */}
                    <div className="text-[11px] text-slate-505 dark:text-slate-400 font-medium font-sans flex items-center gap-1.5">
                      <span className="shrink-0 text-amber-500 font-bold">🧠 Reaction:</span>
                      <span className="animate-in fade-in duration-200 italic">{cognitiveReaction}</span>
                    </div>

                  </div>
                );
              })}

              {filteredTrackers.length === 0 && (
                <div className="py-14 text-center bg-slate-50/20 dark:bg-slate-900/20 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  <div className="text-4xl text-slate-400 select-none">🧠</div>
                  <h4 className="mt-2.5 font-bold text-sm text-slate-700 dark:text-slate-300 font-sans">No topics found in this stage</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto font-sans leading-normal">
                    {activeBoxFilter === 'all' 
                      ? 'No high-yield interview topics listed. Add some topics using the input box or Bulk Import Markdown checklist!'
                      : `You have no topics sorted in the ${activeBoxFilter} Box state yet. Keep testing yourself and slide confidence scores to relocate items!`}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =============== Tab 1: Notes =============== */}
        {activeTab === 'notes' && (
          <div className="space-y-6">
            {listNotes.map(note => {
              const isExpanded = !!expandedNotes[note.id];
              const isReading = !!note.isReading;
              const status = note.status || 'unseen';

              // Decide border and background color styles based on psychological state
              let cardStyles = "border-gray-150 dark:border-gray-805 bg-gray-50/20 dark:bg-gray-900/50";
              let statusBadge = null;
              let mindsetMessage = "";

              if (isReading) {
                cardStyles = "border-amber-400 dark:border-amber-500 bg-amber-50/[0.02] dark:bg-amber-950/[0.02] shadow-[0_0_15px_rgba(245,158,11,0.12)] ring-1 ring-amber-400/40";
              } else if (status === 'completed' || note.isCompleted) {
                cardStyles = "border-emerald-250 dark:border-emerald-900 bg-emerald-500/[0.01] dark:bg-emerald-950/[0.01]";
              } else if (status === 'revision' || note.needsRevision) {
                cardStyles = "border-indigo-250 dark:border-indigo-900 bg-indigo-500/[0.01] dark:bg-indigo-950/[0.01]";
              } else if (status === 'reading') {
                cardStyles = "border-amber-200 dark:border-amber-900/60 bg-amber-500/[0.01] dark:bg-amber-950/[0.01]";
              }

              switch (status) {
                case 'completed':
                  statusBadge = <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-600 bg-emerald-100/60 dark:text-emerald-400 dark:bg-emerald-955/20 px-2 py-0.5 rounded-md">✅ MASTERED</span>;
                  mindsetMessage = "🎉 Excellent! You've completed and mastered this note card.";
                  break;
                case 'revision':
                  statusBadge = <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-indigo-650 bg-indigo-100/60 dark:text-indigo-400 dark:bg-indigo-955/25 px-2 py-0.5 rounded-md">🔄 REVISION PIPELINE</span>;
                  mindsetMessage = "🧠 Active Recall: Revise this summary today to solidify encoding.";
                  break;
                case 'reading':
                  statusBadge = <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-655 bg-amber-100/60 dark:text-amber-400 dark:bg-amber-955/20 px-2 py-0.5 rounded-md">📖 IN PROGRESS</span>;
                  mindsetMessage = "⚡ Active encoding focus: Read thoroughly and synthesize concept maps.";
                  break;
                default:
                  statusBadge = <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-slate-500 bg-slate-100 dark:text-slate-400 dark:bg-slate-800 px-2 py-0.5 rounded-md">⏳ NOT STARTED</span>;
                  mindsetMessage = "🌱 Fresh resource card: Tap to read and trigger learning circuits.";
              }

              return (
                <div 
                  key={note.id} 
                  className={`p-5 rounded-2xl border transition-all duration-200 relative group text-left ${cardStyles}`}
                >
                  {/* Action Buttons Top Right Overlay */}
                  <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyText(note.content, note.id);
                      }}
                      className="p-1.5 rounded-lg bg-white dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white border border-gray-150 dark:border-gray-700 transition cursor-pointer"
                      title="Copy note text"
                    >
                      {copiedItem === note.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartEdit(note, 'notes');
                      }}
                      className="p-1.5 rounded-lg bg-white dark:bg-gray-800 text-gray-500 hover:text-blue-600 dark:hover:text-blue-450 border border-gray-150 dark:border-gray-700 transition cursor-pointer"
                      title="Edit Note"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteItem(note.id, 'notes');
                      }}
                      className="p-1.5 rounded-lg bg-red-50 text-red-650 hover:text-red-750 transition cursor-pointer"
                      title="Delete Note"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Header click-to-expand region */}
                  <div 
                    onClick={() => toggleNoteExpansion(note.id)}
                    className="flex items-start gap-3.5 cursor-pointer select-none"
                  >
                    <div className="mt-1 shrink-0 p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-amber-500/10 dark:hover:bg-amber-500/10 transition-all duration-200">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-amber-505 dark:text-amber-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        {statusBadge}
                        {isReading && (
                          <span className="text-[10px] font-black tracking-wider text-amber-600 bg-amber-500/15 px-2 py-0.5 rounded-md animate-pulse">
                            🔖 LAST READ
                          </span>
                        )}
                      </div>

                      <h4 className="text-base md:text-lg font-bold text-gray-900 dark:text-white font-sans pr-14 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-450 transition-colors">
                        {note.title}
                      </h4>
                      
                      <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1.5 font-sans italic">
                        {mindsetMessage}
                      </p>
                    </div>
                  </div>

                  {/* Styled Markdown block showing if expanded */}
                  {isExpanded && (
                    <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800/80 prose dark:prose-invert max-w-none animate-in fade-in slide-in-from-top-2 duration-200">
                      {renderSimpleMarkdown(note.content)}
                    </div>
                  )}

                  {/* Interactive Phase/Status Manager Segment Panel */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4 pt-4 border-t border-dashed border-gray-150 dark:border-gray-800">
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase font-mono mr-1.5">Change Status:</span>
                      <div className="inline-flex bg-slate-100 dark:bg-slate-900 p-0.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); updateNoteStatus(note.id, 'unseen'); }}
                          className={`px-2 py-1 rounded-lg text-[9px] font-bold tracking-tight cursor-pointer transition-all ${
                            status === 'unseen'
                              ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-3xs font-black'
                              : 'text-slate-450 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
                          }`}
                        >
                          ⏳ Unstarted
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); updateNoteStatus(note.id, 'reading'); }}
                          className={`px-2 py-1 rounded-lg text-[9px] font-bold tracking-tight cursor-pointer transition-all ${
                            status === 'reading'
                              ? 'bg-amber-500 text-white dark:bg-amber-600 dark:text-slate-100 shadow-3xs font-black'
                              : 'text-slate-450 dark:text-slate-500 hover:text-amber-550 dark:hover:text-amber-400'
                          }`}
                        >
                          📖 Reading
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); updateNoteStatus(note.id, 'completed'); }}
                          className={`px-2 py-1 rounded-lg text-[9px] font-bold tracking-tight cursor-pointer transition-all ${
                            status === 'completed'
                              ? 'bg-emerald-600 text-white dark:bg-emerald-600 dark:text-slate-100 shadow-3xs font-black'
                              : 'text-slate-450 dark:text-slate-500 hover:text-emerald-550 dark:hover:text-emerald-400'
                          }`}
                        >
                          ✅ Completed
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); updateNoteStatus(note.id, 'revision'); }}
                          className={`px-2 py-1 rounded-lg text-[9px] font-bold tracking-tight cursor-pointer transition-all ${
                            status === 'revision'
                              ? 'bg-indigo-605 text-white dark:bg-indigo-600 dark:text-slate-100 shadow-3xs font-black'
                              : 'text-slate-450 dark:text-slate-500 hover:text-indigo-650 dark:hover:text-indigo-400'
                          }`}
                        >
                          🔄 Revise
                        </button>
                      </div>
                    </div>

                    <div className="text-[9px] text-slate-400 dark:text-slate-500 font-mono self-end sm:self-center">
                      Modified: {new Date(note.updatedAt || note.createdAt || Date.now()).toLocaleDateString(undefined, {month: 'numeric', day: 'numeric', year: '2-digit'})}
                    </div>
                  </div>
                </div>
              );
            })}

            {listNotes.length === 0 && !aiGenerating && (
              <div className="py-12 text-center text-gray-400 dark:text-gray-500 italic">
                Nothing in notes yet. Add or generate one.
              </div>
            )}
          </div>
        )}

        {/* =============== Tab 2: PDFs =============== */}
        {activeTab === 'pdfs' && (
          <div className="space-y-4">
            {listPdfs.map(pdf => {
              const handleOpenPdfFile = (e: React.MouseEvent) => {
                // Ensure we don't open the PDF if clicking delete
                if ((e.target as HTMLElement).closest('.delete-pdf-btn') || (e.target as HTMLElement).closest('.status-btn')) {
                  return;
                }
                e.preventDefault();
                e.stopPropagation();

                // Save reading state & last opened time in DB
                markPdfAsReading(pdf.id);

                if (pdf.url) {
                  window.open(pdf.url, '_blank');
                  return;
                }
                if (pdf.fileData) {
                  try {
                    const parts = pdf.fileData.split(',');
                    const byteString = atob(parts[1]);
                    const mime = parts[0].split(':')[1].split(';')[0];
                    
                    const ab = new ArrayBuffer(byteString.length);
                    const ia = new Uint8Array(ab);
                    for (let i = 0; i < byteString.length; i++) {
                      ia[i] = byteString.charCodeAt(i);
                    }
                    const blob = new Blob([ab], { type: mime });
                    const objectUrl = URL.createObjectURL(blob);
                    window.open(objectUrl, '_blank');
                  } catch (err) {
                    console.error("Failed to open internal PDF securely using blob representation", err);
                    const pdfWindow = window.open();
                    if (pdfWindow) {
                      pdfWindow.document.write(
                        `<iframe src="${pdf.fileData}" frameborder="0" style="border:0; top:0; left:0; bottom:0; right:0; width:100%; height:100%;" allowfullscreen></iframe>`
                      );
                    }
                  }
                } else {
                  alert(`Simulated opening/previewing file: ${pdf.fileName}`);
                }
              };

              const isReading = !!pdf.isReading;
              const status = pdf.status || 'unseen';

              // Visual styling for PDF cards based on learning state
              let cardStyles = "border-slate-200 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/40";
              let statusBadge = null;
              let encouragementMsg = "";

              if (isReading) {
                cardStyles = "border-amber-400 dark:border-amber-550 ring-4 ring-amber-400/25 dark:ring-amber-950/40 shadow-[0_10px_35px_rgba(245,158,11,0.18)] bg-gradient-to-tr from-orange-50/50 via-amber-50/30 to-rose-50/50 dark:from-orange-950/10 dark:via-amber-950/15 dark:to-rose-950/10";
              } else if (status === 'completed' || pdf.isCompleted) {
                cardStyles = "border-emerald-250 dark:border-emerald-900 bg-emerald-500/[0.01]/10 dark:bg-emerald-950/[0.01]";
              } else if (status === 'revision' || pdf.needsRevision) {
                cardStyles = "border-indigo-250 dark:border-indigo-900 bg-indigo-500/[0.01] dark:bg-indigo-950/[0.01]";
              } else if (status === 'reading') {
                cardStyles = "border-amber-200 dark:border-amber-900/60 bg-amber-500/[0.01] dark:bg-amber-950/[0.01]";
              }

              switch (status) {
                case 'completed':
                  statusBadge = <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold text-emerald-600 bg-emerald-100/60 dark:text-emerald-400 dark:bg-emerald-955/25 px-1.5 py-0.5 rounded">🎉 READ</span>;
                  encouragementMsg = "Double-tap to open reference! Perfect mastery achieved.";
                  break;
                case 'revision':
                  statusBadge = <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold text-indigo-600 bg-indigo-100/60 dark:text-indigo-400 dark:bg-indigo-955/25 px-1.5 py-0.5 rounded">🔄 SPACING ACTIVE</span>;
                  encouragementMsg = "Plan a quick recall loop of these document concepts today.";
                  break;
                case 'reading':
                  statusBadge = <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold text-amber-600 bg-amber-100/60 dark:text-amber-400 dark:bg-amber-955/25 px-1.5 py-0.5 rounded">📖 READING NOW</span>;
                  encouragementMsg = "Active learning active. Absorb, summarize and write outline codes.";
                  break;
                default:
                  statusBadge = <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold text-slate-500 bg-slate-100 dark:text-slate-400 dark:bg-slate-800 px-1.5 py-0.5 rounded">⏳ UNREAD</span>;
                  encouragementMsg = "Unopened curriculum log. Tap Preview to unlock reading maps.";
              }

              return (
                <div 
                  key={pdf.id} 
                  onClick={handleOpenPdfFile}
                  className={`group relative overflow-hidden flex flex-col p-4 rounded-xl border transition-all cursor-pointer ${cardStyles}`}
                >
                  {/* Playful watercolor blend blobs inside active reading card */}
                  {isReading && (
                    <>
                      <div className="absolute -right-4 -top-4 w-32 h-32 bg-gradient-to-r from-amber-400/20 dark:from-amber-300/10 via-pink-400/5 to-transparent rounded-full blur-2xl pointer-events-none" />
                      <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-gradient-to-r from-yellow-400/15 dark:from-yellow-300/5 via-amber-300/5 to-transparent rounded-full blur-2xl pointer-events-none" />
                    </>
                  )}

                  <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/30 text-red-650 flex items-center justify-center shrink-0">
                        <FileText className="w-5.5 h-5.5 text-red-600" />
                      </div>
                      <div className="text-left">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          {statusBadge}
                          {isReading && (
                            <span className="inline-flex items-center gap-1 text-[8.5px] font-black tracking-wider text-amber-700 bg-amber-500/20 dark:text-amber-300 dark:bg-amber-500/25 px-2 py-0.5 rounded animate-pulse shadow-sm">
                              <Sparkles className="w-2.5 h-2.5 text-amber-655 dark:text-amber-400 animate-spin" />
                              <span>ACTIVE FOCUS</span>
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm font-sans leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {pdf.title}
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-1 font-mono flex flex-wrap items-center gap-1.5">
                          <span className={`px-1 py-0.2 rounded text-[8px] uppercase font-bold tracking-wider ${
                            pdf.url ? 'bg-blue-100 dark:bg-blue-950/45 text-blue-600 dark:text-blue-400' : 'bg-emerald-100 dark:bg-emerald-950/45 text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {pdf.url ? 'Web URL' : 'Local File'}
                          </span>
                          <span className="truncate max-w-[150px] sm:max-w-xs">{pdf.fileName}</span>
                          <span>({pdf.fileSize})</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 sm:self-center justify-end">
                      {/* Preview Option Button */}
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          markPdfAsReading(pdf.id);
                          handleOpenPdfFile(e);
                        }}
                        className="px-2.5 py-1 text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-805 transition-colors flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider font-mono border border-slate-200/50 dark:border-slate-705 cursor-pointer"
                        title="Preview PDF File"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Preview</span>
                      </button>

                      {/* Open Option Button */}
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          markPdfAsReading(pdf.id);
                          handleOpenPdfFile(e);
                        }}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider font-mono shadow-3xs cursor-pointer"
                        title="Open PDF File directly"
                      >
                        <BookOpen className="w-3 h-3" />
                        <span>Open</span>
                      </button>

                      {/* Connected Quick Note Button */}
                      {pdf.enableLinkedNote && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerLinkedNote(pdf.id, pdf.title, 'pdf');
                          }}
                          className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg transition-colors flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider font-mono border border-amber-500/20 cursor-pointer"
                          title="Open connected study note"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0 inline-block" />
                          <span>Note</span>
                        </button>
                      )}

                      {/* Edit PDF Button */}
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEdit(pdf, 'pdfs');
                        }}
                        className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-amber-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-805/60 transition-colors cursor-pointer"
                        title="Edit PDF / Link"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete PDF Button */}
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteItem(pdf.id, 'pdfs');
                        }}
                        className="delete-pdf-btn p-1.5 text-slate-404 hover:text-red-650 rounded-lg hover:bg-red-50 dark:hover:bg-red-955/20 transition-colors cursor-pointer"
                        title="Delete PDF"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Encouragement text line & dynamic status control bar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-3 pt-3 border-t border-dashed border-slate-200/60 dark:border-slate-800 w-full">
                    <p className="text-[10px] text-slate-450 dark:text-slate-500 italic text-left">
                      💡 {encouragementMsg}
                    </p>

                    <div className="flex items-center gap-1.5 self-start sm:self-center">
                      <span className="text-[9px] font-bold text-slate-400 font-mono tracking-wider">STATUS:</span>
                      <div className="inline-flex bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200/50 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); updatePdfStatus(pdf.id, 'unseen'); }}
                          className={`status-btn px-1.5 py-0.5 rounded text-[8px] font-bold transition-all cursor-pointer ${
                            status === 'unseen'
                              ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-3xs font-black'
                              : 'text-slate-400 hover:text-slate-700'
                          }`}
                        >
                          ⏳ Unread
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); updatePdfStatus(pdf.id, 'reading'); }}
                          className={`status-btn px-1.5 py-0.5 rounded text-[8px] font-bold transition-all cursor-pointer ${
                            status === 'reading'
                              ? 'bg-amber-500 text-white shadow-3xs font-black'
                              : 'text-slate-400 hover:text-amber-550'
                          }`}
                        >
                          📖 Reading
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); updatePdfStatus(pdf.id, 'completed'); }}
                          className={`status-btn px-1.5 py-0.5 rounded text-[8px] font-bold transition-all cursor-pointer ${
                            status === 'completed'
                              ? 'bg-emerald-600 text-white shadow-3xs font-black'
                              : 'text-slate-400 hover:text-emerald-550'
                          }`}
                        >
                          ✅ Done
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); updatePdfStatus(pdf.id, 'revision'); }}
                          className={`status-btn px-1.5 py-0.5 rounded text-[8px] font-bold transition-all cursor-pointer ${
                            status === 'revision'
                              ? 'bg-indigo-600 text-white shadow-3xs font-black'
                              : 'text-slate-400 hover:text-indigo-500'
                          }`}
                        >
                          🔄 Revise
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {listPdfs.length === 0 && (
              <div className="py-12 text-center text-gray-450 dark:text-gray-500 italic">
                Nothing in PDF files yet. Add one.
              </div>
            )}
          </div>
        )}

        {/* =============== Tab 3: Videos =============== */}
        {activeTab === 'videos' && (
          <div className="space-y-4">
            {/* Subtopic Video Layout Switcher */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-150 dark:border-slate-800 shadow-3xs">
              <span className="text-xs font-bold text-slate-550 dark:text-slate-400 pl-1 font-sans">
                📺 Video Playlist Display
              </span>
              <div className="flex items-center border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-100/10 p-1 rounded-xl gap-1 w-full sm:w-auto shrink-0 select-none shadow-3xs">
                <button
                  type="button"
                  onClick={() => setVideoViewMode('grid')}
                  className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    videoViewMode === 'grid'
                      ? 'bg-red-500/10 text-red-655 dark:text-red-400 font-bold'
                      : 'text-slate-550 hover:text-slate-800 dark:text-slate-350 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Grid</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => setVideoViewMode('small_grid')}
                  className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    videoViewMode === 'small_grid'
                      ? 'bg-red-500/10 text-red-655 dark:text-red-400 font-bold'
                      : 'text-slate-550 hover:text-slate-800 dark:text-slate-350 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span>Small Grid</span>
                </button>

                <button
                  type="button"
                  onClick={() => setVideoViewMode('list')}
                  className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    videoViewMode === 'list'
                      ? 'bg-red-500/10 text-red-655 dark:text-red-400 font-bold'
                      : 'text-slate-555 hover:text-slate-800 dark:text-slate-350 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>List</span>
                </button>

                <button
                  type="button"
                  onClick={() => setVideoViewMode('compact')}
                  className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    videoViewMode === 'compact'
                      ? 'bg-red-500/10 text-red-655 dark:text-red-400 font-bold'
                      : 'text-slate-555 hover:text-slate-800 dark:text-slate-350 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <AlignJustify className="w-3.5 h-3.5" />
                  <span>Compact</span>
                </button>
              </div>
            </div>

            <div className={
              videoViewMode === 'grid'
                ? "grid grid-cols-1 md:grid-cols-2 gap-6"
                : videoViewMode === 'small_grid'
                  ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
                  : videoViewMode === 'list'
                    ? "flex flex-col gap-4"
                    : "flex flex-col gap-2"
            }>
              {listVideos.map(vid => {
                // Extract YouTube ID if valid
                let ytId = '';
                try {
                  if (vid.url.includes('youtube.com/watch')) {
                    const urlObj = new URL(vid.url);
                    ytId = urlObj.searchParams.get('v') || '';
                  } else if (vid.url.includes('youtu.be/')) {
                    ytId = vid.url.split('youtu.be/')[1]?.split('?')[0] || '';
                  }
                } catch(e) {}

                if (videoViewMode === 'compact') {
                  return (
                    <div 
                      key={vid.id}
                      className={`bg-white dark:bg-gray-950/45 border ${
                        dragOverId === vid.id
                          ? 'border-red-500 bg-red-500/[0.02]'
                          : 'border-slate-200 dark:border-slate-800'
                      } rounded-xl px-3 py-2 flex items-center justify-between gap-4 group transition-all duration-150 relative shadow-3xs`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => {
                            window.open(vid.url, '_blank');
                          }}
                          className="w-7 h-7 rounded-full bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-650 dark:bg-slate-800 dark:hover:bg-red-950/40 dark:text-slate-300 flex items-center justify-center shrink-0 transition-colors"
                        >
                          <Play className="w-3 h-3 fill-current ml-0.5" />
                        </button>

                        <div className="min-w-0 flex-1 text-left">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate" title={vid.title}>
                            {vid.title}
                          </h4>
                          <span className="text-[8px] bg-slate-100 dark:bg-slate-800 text-slate-550 dark:text-slate-400 px-1 py-0.2 rounded font-mono uppercase font-bold shrink-0">
                            {ytId ? 'YouTube' : 'Web Link'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button 
                          type="button"
                          onClick={() => handleStartEdit(vid, 'videos')}
                          className="p-1 text-gray-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleDeleteItem(vid.id, 'videos')}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                }

                if (videoViewMode === 'list') {
                  const thumbUrl = ytId 
                    ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` 
                    : 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600&auto=format&fit=crop&q=80';

                  return (
                    <div 
                      key={vid.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', vid.id);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverId(vid.id);
                      }}
                      onDragLeave={() => {
                        setDragOverId(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const draggedId = e.dataTransfer.getData('text/plain');
                        handleVideoReorderSubtopic(draggedId, vid.id);
                        setDragOverId(null);
                      }}
                      className={`bg-white dark:bg-gray-950/45 border p-3 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 group transition-all duration-200 shadow-3xs ${
                        dragOverId === vid.id
                          ? 'border-red-500 bg-red-500/5'
                          : 'border-slate-205 dark:border-slate-805'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 flex-1 min-w-0">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-slate-450 p-0.5 shrink-0">
                          <GripVertical className="w-4 h-4" />
                        </div>
                        
                        <div className="relative w-32 aspect-video rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-905 shrink-0 border border-slate-200/60 dark:border-slate-800">
                          <img 
                            src={thumbUrl} 
                            alt={vid.title} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <a
                            href={vid.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute inset-0 bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-all rounded-xl"
                          >
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          </a>
                        </div>

                        <div className="min-w-0 flex-1 space-y-1 text-left">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate" title={vid.title}>
                            {vid.title}
                          </h4>
                          <a 
                            href={vid.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-slate-400 hover:text-blue-500 font-mono flex items-center gap-1 mt-1 truncate"
                          >
                            <Link className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{vid.url}</span>
                          </a>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800">
                        <button 
                          type="button"
                          onClick={() => handleStartEdit(vid, 'videos')}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-105 hover:text-slate-850 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleDeleteItem(vid.id, 'videos')}
                          className="p-1.5 rounded-lg text-slate-450 hover:bg-slate-105 hover:text-red-500 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                }

                if (videoViewMode === 'small_grid') {
                  const thumbUrl = ytId 
                    ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` 
                    : 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600&auto=format&fit=crop&q=80';

                  return (
                    <div 
                      key={vid.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', vid.id);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverId(vid.id);
                      }}
                      onDragLeave={() => {
                        setDragOverId(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const draggedId = e.dataTransfer.getData('text/plain');
                        handleVideoReorderSubtopic(draggedId, vid.id);
                        setDragOverId(null);
                      }}
                      className={`bg-white dark:bg-gray-950/45 border rounded-2xl overflow-hidden group hover:border-slate-350 dark:hover:border-slate-800 shadow-3xs flex flex-col justify-between text-left relative transition-all duration-200 ${
                        dragOverId === vid.id
                          ? 'border-red-500 bg-red-500/5'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-slate-900/80 p-0.5 rounded-lg">
                        <button 
                          type="button"
                          onClick={() => handleStartEdit(vid, 'videos')}
                          className="p-1 text-slate-300 hover:text-white transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleDeleteItem(vid.id, 'videos')}
                          className="p-1 text-slate-300 hover:text-red-400 transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="relative aspect-video bg-slate-105 dark:bg-slate-950 overflow-hidden shrink-0">
                        <img 
                          src={thumbUrl} 
                          alt={vid.title} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <a
                          href={vid.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute inset-0 bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-all rounded-xl"
                        >
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        </a>
                      </div>

                      <div className="p-3">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug" title={vid.title}>
                          {vid.title}
                        </h4>
                      </div>
                    </div>
                  );
                }

                // Default full Grid View Option
                return (
                  <div 
                    key={vid.id} 
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', vid.id);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverId(vid.id);
                    }}
                    onDragLeave={() => {
                      setDragOverId(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const draggedId = e.dataTransfer.setData('text/plain');
                      handleVideoReorderSubtopic(draggedId, vid.id);
                      setDragOverId(null);
                    }}
                    className={`rounded-2xl border overflow-hidden bg-white dark:bg-gray-950/50 flex flex-col justify-between shadow-xs relative group transition-all duration-205 ${
                      dragOverId === vid.id
                        ? 'border-red-500 bg-red-500/5 scale-[1.015]'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <button 
                        type="button"
                        onClick={() => handleStartEdit(vid, 'videos')}
                        className="p-1.5 rounded-lg bg-gray-900/80 text-stone-300 hover:text-white transition-colors cursor-pointer"
                        title="Edit Video URL/Title"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleDeleteItem(vid.id, 'videos')}
                        className="p-1.5 rounded-lg bg-gray-900/80 text-gray-400 hover:text-white transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Inline iframe embedded YouTube video player mockup or play button */}
                    {ytId ? (
                      <div className="aspect-video w-full bg-black relative">
                        <iframe 
                          title={vid.title}
                          src={`https://www.youtube.com/embed/${ytId}`}
                          className="absolute inset-0 w-full h-full border-0"
                          allowFullScreen
                        />
                      </div>
                    ) : (
                      <div 
                        onClick={() => window.open(vid.url, '_blank')}
                        className="aspect-video bg-gray-900 flex flex-col items-center justify-center p-4 text-center cursor-pointer hover:bg-gray-855 transition-colors text-white"
                      >
                        <Play className="w-12 h-12 text-amber-500" />
                        <span className="text-[10px] font-mono tracking-wider mt-2 text-gray-400 uppercase">External media link</span>
                      </div>
                    )}

                    <div className="p-4 text-left">
                      <div className="flex items-center justify-between gap-2.5 mb-11">
                        <h4 className="font-extrabold text-slate-800 dark:text-white text-sm font-sans line-clamp-1 leading-normal flex-1">
                          {vid.title}
                        </h4>
                        <GripVertical className="w-4 h-4 text-slate-400 cursor-grab active:cursor-grabbing shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" title="Drag to reorder playlist position" />
                      </div>
                      <a 
                        href={vid.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-gray-400 font-mono hover:underline truncate block flex items-center gap-1 mt-1"
                      >
                        <Link className="w-3 h-3 shrink-0" />
                        <span className="truncate">{vid.url}</span>
                      </a>
                    </div>
                  </div>
                );
              })}

              {listVideos.length === 0 && (
                <div className="col-span-full py-12 text-center text-gray-400 dark:text-gray-500 italic">
                  Nothing in video resources yet. Pin and add a YouTube tutorial URL.
                </div>
              )}
            </div>
          </div>
        )}

        {/* =============== Tab 4: Concepts =============== */}
        {activeTab === 'concepts' && (
          <div className="space-y-6">
            {listConcepts.map(c => (
              <div key={c.id} className="p-5 rounded-xl border border-gray-150 dark:border-gray-805 bg-gray-50/20 relative group">
                <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleStartEdit(c, 'concepts')}
                    className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-amber-400 rounded bg-white dark:bg-gray-800 border border-slate-200 dark:border-slate-700"
                    title="Edit Concept"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteItem(c.id, 'concepts')}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded bg-white dark:bg-gray-800 border border-slate-200 dark:border-slate-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <h4 className="text-base font-bold text-gray-950 dark:text-white font-sans mr-8 leading-none">
                  {c.title}
                </h4>
                <p className="text-sm text-gray-610 dark:text-gray-300 mt-2.5 leading-relaxed">
                  {c.content}
                </p>

                {c.codeSnippet && (
                  <pre className="mt-4 p-4 bg-gray-950 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto border border-gray-805">
                    <code>{c.codeSnippet}</code>
                  </pre>
                )}
              </div>
            ))}

            {listConcepts.length === 0 && !aiGenerating && (
              <div className="py-12 text-center text-gray-400 dark:text-gray-500 italic">
                Nothing in concepts yet. Add or generate one.
              </div>
            )}
          </div>
        )}

        {/* =============== Tab 5: Coding =============== */}
        {activeTab === 'coding' && (
          <div className="space-y-6">
            {listCoding.map(code => {
              const showSol = revealSolutions[code.id];

              return (
                <div key={code.id} className="p-5 rounded-2xl border border-gray-150 dark:border-gray-805 bg-gray-50/20 relative group">
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase font-mono px-2 py-0.5 rounded-md border
                      ${code.difficulty === 'easy' ? 'bg-emerald-100/10 border-emerald-500 text-emerald-500' : ''}
                      ${code.difficulty === 'medium' ? 'bg-amber-100/10 border-amber-500 text-amber-500' : ''}
                      ${code.difficulty === 'hard' ? 'bg-red-100/10 border-red-500 text-red-500' : ''}
                    `}>
                      {code.difficulty}
                    </span>
                    <button 
                      onClick={() => handleStartEdit(code, 'coding')}
                      className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-amber-400 rounded bg-white dark:bg-gray-850 opacity-0 group-hover:opacity-100 transition-opacity border border-slate-200 dark:border-slate-700"
                      title="Edit Coding Challenge"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteItem(code.id, 'coding')}
                      className="p-1 text-gray-400 hover:text-red-600 rounded bg-white dark:bg-gray-850 opacity-0 group-hover:opacity-100 transition-opacity border border-slate-200 dark:border-slate-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h4 className="text-base font-bold text-gray-950 dark:text-white font-sans mr-24 leading-none">
                    {code.title}
                  </h4>

                  <div className="text-sm text-gray-610 dark:text-gray-300 mt-4 leading-relaxed font-sans prose dark:prose-invert">
                    {renderSimpleMarkdown(code.problemStatement)}
                  </div>

                  {code.starterCode && (
                    <div className="mt-4">
                      <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-gray-400">Starter Code Template:</span>
                      <pre className="mt-1.5 p-4 bg-gray-950 text-gray-300 font-mono text-xs rounded-xl overflow-x-auto border border-gray-850">
                        <code>{code.starterCode}</code>
                      </pre>
                    </div>
                  )}

                  {code.solution && (
                    <div className="mt-5 border-t border-gray-100 dark:border-gray-800 pt-4">
                      <button
                        onClick={() => setRevealSolutions({ ...revealSolutions, [code.id]: !showSol })}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-amber-650 dark:text-amber-500 hover:underline cursor-pointer"
                      >
                        {showSol ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        <span>{showSol ? 'Hide Reference Solution' : 'Reveal Solution Logic'}</span>
                      </button>

                      {showSol && (
                        <div className="mt-3 animate-in fade-in slide-in-from-top-1 duration-150">
                          <pre className="p-4 bg-emerald-950/10 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto border border-emerald-500/15">
                            <code>{code.solution}</code>
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {listCoding.length === 0 && !aiGenerating && (
              <div className="py-12 text-center text-gray-400 dark:text-gray-500 italic">
                Nothing in coding challenges yet. Add or generate one.
              </div>
            )}
          </div>
        )}

        {/* =============== Tab 6: Interview =============== */}
        {activeTab === 'interviews' && (
          <div className="space-y-6">
            {listInterviews.map(qa => {
              const showAns = revealSolutions[qa.id];

              return (
                <div key={qa.id} className="p-5 rounded-2xl border border-gray-150 dark:border-gray-805 bg-gray-50/20 relative group">
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    <span className="text-[9px] font-bold uppercase font-mono px-2 py-0.5 rounded-md bg-stone-100/10 text-stone-500 border border-stone-500">
                      {qa.level} level
                    </span>
                    <button 
                      type="button"
                      onClick={() => handleStartEdit(qa, 'interviews')}
                      className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-amber-400 rounded bg-white dark:bg-gray-850 opacity-0 group-hover:opacity-100 transition-opacity border border-slate-200 dark:border-slate-700"
                      title="Edit Interview Question"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleDeleteItem(qa.id, 'interviews')}
                      className="p-1 text-gray-400 hover:text-red-500 rounded bg-white dark:bg-gray-850 opacity-0 group-hover:opacity-100 transition-opacity border border-slate-200 dark:border-slate-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <span className="text-[10px] font-bold text-amber-550 dark:text-amber-500 font-mono tracking-widest uppercase">Question Tag</span>
                  <div className="text-base font-extrabold text-gray-900 dark:text-white mt-1 pr-24 font-sans leading-relaxed space-y-1">
                    {renderSimpleMarkdown(qa.question, "text-base font-extrabold text-gray-900 dark:text-white font-sans leading-relaxed")}
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800/80">
                    <button
                      onClick={() => setRevealSolutions({ ...revealSolutions, [qa.id]: !showAns })}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer"
                    >
                      {showAns ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      <span>{showAns ? 'Hide response walkthrough' : 'Reveal Suggested Response'}</span>
                    </button>

                    {showAns && (
                      <div className="mt-3.5 p-4.5 bg-gray-50/60 dark:bg-gray-950/40 rounded-xl border border-gray-150 dark:border-gray-850 text-sm text-gray-650 dark:text-gray-300 leading-relaxed font-sans prose dark:prose-invert animate-in fade-in slide-in-from-top-1.5 duration-200">
                        {renderSimpleMarkdown(qa.answer)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {listInterviews.length === 0 && !aiGenerating && (
              <div className="py-12 text-center text-gray-400 dark:text-gray-500 italic">
                Nothing in interview sheets. Add or generate one.
              </div>
            )}
          </div>
        )}

        {/* =============== Tab 7: Quizzes (Quiz engine) =============== */}
        {activeTab === 'quizzes' && (
          <div className="space-y-8">
            {listQuizzes.map((quiz, quizIdx) => {
              const selectedIndex = quizAttempts[quiz.id];
              const answered = selectedIndex !== undefined;
              const isCorrect = answered && selectedIndex === quiz.correctIndex;

              return (
                <div key={quiz.id} className="p-6 rounded-2xl border border-gray-200 dark:border-gray-805 bg-white dark:bg-gray-950/40 relative group shadow-xs">
                  <div className="flex items-center justify-between mb-4.5">
                    <span className="text-[10px] font-bold font-mono tracking-widest text-[#4d4d4d] dark:text-gray-400 uppercase">
                      Question {quizIdx + 1}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEdit(quiz, 'quizzes');
                        }}
                        className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-amber-400 rounded bg-white dark:bg-gray-850 cursor-pointer border border-slate-200"
                        title="Edit Quiz Question"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteItem(quiz.id, 'quizzes')}
                        className="p-1 text-gray-400 hover:text-red-500 rounded bg-white dark:bg-gray-850 cursor-pointer border border-slate-200"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="text-base font-extrabold text-gray-950 dark:text-white font-sans leading-normal space-y-1">
                    {renderSimpleMarkdown(quiz.question, "text-base font-extrabold text-gray-950 dark:text-white font-sans leading-normal")}
                  </div>

                  {/* MCQ Choices */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
                    {quiz.options.map((opt, optIdx) => {
                      const isOptionSelected = selectedIndex === optIdx;
                      const isCorrectOption = quiz.correctIndex === optIdx;

                      let btnStyle = 'border-gray-200 dark:border-gray-855 hover:bg-gray-50 dark:hover:bg-gray-800/65 text-gray-700 dark:text-gray-300';
                      
                      if (answered) {
                        if (isCorrectOption) {
                          btnStyle = 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold';
                        } else if (isOptionSelected) {
                          btnStyle = 'border-red-500 bg-red-500/10 text-red-650 dark:text-red-450';
                        } else {
                          btnStyle = 'border-gray-150 dark:border-gray-850 text-gray-400 dark:text-gray-600 opacity-60';
                        }
                      }

                      return (
                        <button
                          key={optIdx}
                          disabled={answered}
                          onClick={() => setQuizAttempts({ ...quizAttempts, [quiz.id]: optIdx })}
                          className={`px-4 py-3 rounded-xl border text-left text-xs sm:text-xs.5 leading-normal transition-all font-medium flex items-center justify-between
                            ${btnStyle}
                            ${!answered ? 'hover:scale-[1.01] hover:border-gray-320 cursor-pointer' : ''}
                          `}
                        >
                          <span>{renderInlineFormat(opt)}</span>
                          {answered && isCorrectOption && <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />}
                          {answered && isOptionSelected && !isCorrectOption && <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Feedback summary explanation card */}
                  {answered && (
                    <div className="mt-5 p-4 bg-amber-500/5 dark:bg-amber-500/[0.02] border border-amber-500/15 rounded-xl text-xs text-gray-650 dark:text-gray-400 leading-relaxed font-sans animate-in fade-in slide-in-from-top-1.5 duration-200 text-left">
                      <div className="flex items-center gap-1 text-[10px] font-bold font-mono tracking-widest text-amber-600 dark:text-amber-500 uppercase mb-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Mechanism explanation</span>
                      </div>
                      <div className="space-y-1">
                        {renderSimpleMarkdown(quiz.explanation, "text-xs text-gray-650 dark:text-gray-400 leading-relaxed font-sans")}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {listQuizzes.length === 0 && !aiGenerating && (
              <div className="py-12 text-center text-gray-400 dark:text-gray-500 italic">
                Nothing in quiz sheets yet. Add or generate one.
              </div>
            )}
          </div>
        )}

      </div>
      )}

      {/* Modern custom inline modals */}
      {/* 1. Custom inline Subtopic editing modal */}
      {editSubModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setEditSubModalOpen(false)} className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs" />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 animate-in fade-in zoom-in-95 duration-150">
            <h4 className="font-extrabold text-lg text-slate-900 dark:text-white leading-tight mb-4 font-sans">
              Edit Subtopic Metadata
            </h4>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 font-mono">Subtopic Name</label>
                <input
                  type="text"
                  value={editSubName || ''}
                  onChange={(e) => setEditSubName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-205 dark:border-slate-705 bg-white dark:bg-slate-950 text-slate-905 dark:text-white text-xs focus:outline-none font-sans"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 font-mono">Description</label>
                <textarea
                  value={editSubDesc || ''}
                  rows={3}
                  onChange={(e) => setEditSubDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-205 dark:border-slate-705 bg-white dark:bg-slate-950 text-slate-905 dark:text-white text-xs focus:outline-none font-sans"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-4 mt-5 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditSubModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white text-xs font-semibold uppercase tracking-wider font-mono transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleUpdateSubtopic(editSubName, editSubDesc)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold uppercase tracking-wider font-mono shadow-md transition-all cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1.5. YouTube Playlist Importer Modal */}
      {playlistModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => {
            setPlaylistModalOpen(false);
            setPlaylistUrl('');
            setPlaylistPreview(null);
            setPlaylistStatus('idle');
          }} className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs" />
          
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 overflow-y-auto max-h-[85vh] animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <div>
                <h3 className="text-base font-black text-slate-905 dark:text-white flex items-center gap-1.5 font-sans">
                  <Layers className="w-5 h-5 text-red-500 shrink-0" />
                  <span>YouTube Playlist Batch Importer</span>
                </h3>
                <p className="text-xs text-slate-400 font-medium font-sans">Generate comprehensive educational lessons inside "{subtopic.name}"</p>
              </div>
              <button 
                onClick={() => {
                  setPlaylistModalOpen(false);
                  setPlaylistUrl('');
                  setPlaylistPreview(null);
                  setPlaylistStatus('idle');
                }}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono">
                  Paste YouTube Playlist Link or List ID *
                </label>
                <div className="flex gap-2 mt-1.5">
                  <input
                    type="url"
                    placeholder="e.g. https://www.youtube.com/playlist?list=PL..."
                    value={playlistUrl}
                    onChange={(e) => setPlaylistUrl(e.target.value)}
                    className="flex-grow px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-805 bg-slate-50/50 dark:bg-slate-950 text-xs font-semibold outline-none focus:border-red-500 text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleFetchPlaylistSubtopic}
                    disabled={playlistStatus === 'loading'}
                    className="px-4 py-2.5 bg-red-600 hover:bg-red-500 disabled:bg-slate-200 disabled:dark:bg-slate-800 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shrink-0 transition-opacity cursor-pointer select-none"
                  >
                    {playlistStatus === 'loading' ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Fetching...</span>
                      </>
                    ) : (
                      <span>Crawl</span>
                    )}
                  </button>
                </div>
                {playlistError && (
                  <p className="text-[10px] text-red-500 font-semibold leading-tight mt-1.5">⚠️ {playlistError}</p>
                )}
              </div>

              {playlistPreview && (
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/15 rounded-2xl space-y-2 mt-3 animate-in fade-in slide-in-from-bottom-2 duration-100">
                  <div className="flex items-center justify-between border-b border-emerald-500/10 pb-2">
                    <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 max-w-[70%] truncate font-sans">
                      📚 {playlistPreview.playlistTitle}
                    </span>
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-600 font-mono font-black px-1.5 py-0.5 rounded-md">
                      {playlistPreview.videos.length} Lectures Found
                    </span>
                  </div>

                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                    {playlistPreview.videos.map((v, i) => (
                      <div key={v.videoId + i} className="flex gap-2 items-center text-[10px] text-slate-600 dark:text-slate-355 truncate">
                        <span className="text-[9px] font-mono font-black bg-slate-100 dark:bg-slate-800 p-0.5 rounded shrink-0">#{i+1}</span>
                        <span className="truncate font-sans font-medium">{v.title}</span>
                      </div>
                    ))}
                  </div>

                  <p className="text-[9px] text-slate-400 font-medium select-none text-center pt-2 italic leading-none">
                    All crawled steps will be linked to this subtask path.
                  </p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setPlaylistModalOpen(false);
                    setPlaylistUrl('');
                    setPlaylistPreview(null);
                    setPlaylistStatus('idle');
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-xl text-xs transition-colors cursor-pointer dark:bg-slate-800 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePlaylistSubtopic}
                  disabled={!playlistPreview || playlistPreview.videos.length === 0}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-250 disabled:dark:bg-slate-800 text-white font-black rounded-xl text-xs transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Import Playlist</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Custom inline Subtopic deleting confirmation modal */}
      {deleteSubConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setDeleteSubConfirmOpen(false)} className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs" />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-100 dark:bg-red-955/40 text-red-600 dark:text-red-400 rounded-2xl shrink-0 shadow-sm">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-lg text-slate-900 dark:text-white leading-tight font-sans">
                  Delete subtopic?
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed font-sans">
                  Are you sure you want to permanently delete <strong className="font-semibold text-slate-800 dark:text-slate-200">"{subtopic.name}"</strong>? This will remove all associated notes, coding files, quizzes, bookmarks, and transcripts instantly.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-4 mt-5 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteSubConfirmOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-805 text-xs font-semibold uppercase tracking-wider font-mono transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteDeleteSubtopic}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold uppercase tracking-wider font-mono shadow-md transition-all cursor-pointer"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Custom inline Core concept adder modal */}
      {addConceptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2">
          <div onClick={() => setAddConceptOpen(false)} className="absolute inset-0 bg-slate-950/40 dark:bg-black/60 backdrop-blur-xs" />
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-805 shadow-xl p-6 animate-in fade-in zoom-in-95 duration-150">
            <h4 className="font-extrabold text-lg text-slate-905 dark:text-white leading-tight mb-3 font-sans">
              Add Key Item
            </h4>
            <input
              type="text"
              autoFocus
              placeholder="e.g. Memory Lexical Scopes"
              value={newConceptVal || ''}
              onChange={(e) => setNewConceptVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddCoreConcept(newConceptVal);
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-205 dark:border-slate-705 bg-white dark:bg-slate-950 text-slate-905 dark:text-white text-xs focus:outline-none mb-4 font-sans"
            />
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-150/45 dark:border-slate-800/45">
              <button
                type="button"
                onClick={() => setAddConceptOpen(false)}
                className="px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-850 text-xs font-semibold transition font-sans cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleAddCoreConcept(newConceptVal)}
                className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-205 text-white dark:text-slate-950 text-xs font-bold shadow-xs cursor-pointer font-sans"
              >
                Add to List
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Resource Addition Modals (Grid of options based on activeTab) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setModalOpen(false)} className="absolute inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-xs" />
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl p-6 overflow-y-auto max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white capitalize mb-4">
              Add {activeTab === 'pdfs' ? 'PDF File' : activeTab === 'quizzes' ? 'Quiz Question' : activeTab}
            </h3>

            <form onSubmit={handleSaveManualItem} className="space-y-4">
              
              {/* Conditional Title or Question blocks */}
              {activeTab === 'quizzes' ? (
                <div>
                  <label className="block text-xs font-bold tracking-wider text-gray-405 dark:text-gray-500 uppercase mb-2 font-mono">
                    Question Text
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Which keyword retains variables in closures?"
                    value={manualTitle || ''}
                    onChange={(e) => setManualTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-202 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-sans"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold tracking-wider text-gray-405 dark:text-gray-500 uppercase mb-2 font-mono">
                    Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Give it a clear name"
                    value={manualTitle || ''}
                    onChange={(e) => setManualTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-202 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-sans"
                  />
                </div>
              )}

              {/* Conditional Fields: PDFs Dropzone & Link options */}
              {activeTab === 'pdfs' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-2 font-mono">
                      PDF Addition Method
                    </label>
                    <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl">
                      <button
                        type="button"
                        onClick={() => {
                          setPdfSourceType('file');
                          setPdfFileName('');
                          setPdfFileSize('');
                          setPdfFileData('');
                        }}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          pdfSourceType === 'file'
                            ? 'bg-blue-600 text-white shadow'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        Local File Upload
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPdfSourceType('url');
                        }}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          pdfSourceType === 'url'
                            ? 'bg-blue-600 text-white shadow'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        PDF Link / URL Option
                      </button>
                    </div>
                  </div>

                  {pdfSourceType === 'file' ? (
                    <div>
                      <label className="block text-xs font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-2 font-mono">
                        Select PDF File
                      </label>
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-500/40 rounded-xl p-6 text-center cursor-pointer hover:bg-slate-55 dark:hover:bg-slate-850/10 transition-all flex flex-col items-center justify-center bg-slate-50/10"
                      >
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="application/pdf"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <Upload className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-2 animate-bounce" />
                        {pdfFileName ? (
                          <div>
                            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono break-all">{pdfFileName}</p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{pdfFileSize} • Load successful</p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Click to open file picker & upload a PDF file</p>
                            <p className="text-[10px] text-slate-400 font-mono mt-1">Saves file data locally</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-2 font-mono">
                        PDF Link URL
                      </label>
                      <input
                        type="url"
                        required={pdfSourceType === 'url'}
                        placeholder="https://example.com/syllabus.pdf"
                        value={manualUrl || ''}
                        onChange={(e) => setManualUrl(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-sans"
                      />
                       <p className="text-[10px] text-slate-400 font-mono mt-1">Provide external hyperlink to save as reference</p>
                    </div>
                  )}

                  {/* Connected Quick Notes toggle option matching AllPdfsView */}
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 animate-in fade-in">
                    <input
                      type="checkbox"
                      id="pdfEnableLinkedNoteSubtopic"
                      checked={pdfEnableLinkedNote}
                      onChange={(e) => setPdfEnableLinkedNote(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 accent-amber-500 cursor-pointer shrink-0"
                    />
                    <label htmlFor="pdfEnableLinkedNoteSubtopic" className="text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer select-none">
                      Enable Connected Quick Note 🔗
                      <span className="block text-[10px] font-normal text-slate-400 mt-0.5">Creates a floating Study note linkage for active reference reading.</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Conditional Fields: Videos URL */}
              {activeTab === 'videos' && (
                <div>
                  <label className="block text-xs font-bold tracking-wider text-gray-405 dark:text-gray-500 uppercase mb-2 font-mono">
                    Video Url
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://youtube.com/watch?v=..."
                    value={manualUrl || ''}
                    onChange={(e) => setManualUrl(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-202 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-sans"
                  />
                </div>
              )}

              {/* Conditional Fields: Custom Note, Concept content, or problem statement inputs */}
              {(activeTab === 'notes' || activeTab === 'concepts' || activeTab === 'coding' || activeTab === 'interviews') && (
                <div>
                  <label className="block text-xs font-bold tracking-wider text-gray-405 dark:text-gray-500 uppercase mb-2 font-mono">
                    {activeTab === 'notes' ? 'Content (Markdown)' : activeTab === 'coding' ? 'Problem Statement (Markdown)' : 'Content/Explanation'}
                  </label>
                  <textarea
                    required
                    rows={activeTab === 'notes' ? 8 : 4}
                    placeholder="Write detailed layout parameters..."
                    value={activeTab === 'coding' ? (codingProblem || '') : (manualContent || '')}
                    onChange={(e) => activeTab === 'coding' ? setCodingProblem(e.target.value) : setManualContent(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-202 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-sans"
                  />
                </div>
              )}

              {/* Specific Field: Code snippets trigger on Concepts */}
              {activeTab === 'concepts' && (
                <div>
                  <label className="block text-xs font-bold tracking-wider text-gray-405 dark:text-gray-500 uppercase mb-2 font-mono">
                    Code Block (Optional)
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Paste conceptual code syntax..."
                    value={manualUrl || ''} // reuse manualUrl as state
                    onChange={(e) => setManualUrl(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-202 bg-white dark:bg-gray-950 text-gray-900 dark:text-white font-mono text-xs focus:outline-none"
                  />
                </div>
              )}

              {/* Specific Field: Coding Challenge Difficulties & Solution template blocks */}
              {activeTab === 'coding' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {['easy', 'medium', 'hard'].map(level => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setCodingDiff(level as any)}
                        className={`py-2 rounded-xl border font-bold text-xs capitalize transition-all cursor-pointer
                          ${codingDiff === level 
                            ? 'bg-amber-500/10 border-amber-500 text-amber-500' 
                            : 'border-gray-200 dark:border-gray-800 text-gray-550'
                          }
                        `}
                      >
                        {level}
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="block text-xs font-bold tracking-wider text-gray-450 dark:text-gray-500 uppercase mb-2 font-mono">
                      Starter Code Skeletal
                    </label>
                    <textarea
                      rows={3}
                      placeholder="function solution() {\n  // Starter code here...\n}"
                      value={codingStarter || ''}
                      onChange={(e) => setCodingStarter(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-gray-202 bg-white dark:bg-gray-950 font-mono text-xs text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold tracking-wider text-gray-450 dark:text-gray-500 uppercase mb-2 font-mono">
                      Reference Answer Solution
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Actual syntax solution logic..."
                      value={codingSol || ''}
                      onChange={(e) => setCodingSol(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-gray-202 bg-white dark:bg-gray-950 font-mono text-xs text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* Specific Field: Seniority difficulty selector for Interview Q&As */}
              {activeTab === 'interviews' && (
                <div>
                  <label className="block text-xs font-bold tracking-wider text-gray-420 dark:text-gray-500 uppercase mb-2 font-mono">
                    Seniority Level
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {['junior', 'mid', 'senior'].map(level => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setCodingDiff(level as any)} // reuse codingDiff state
                        className={`py-2 rounded-xl border font-bold text-xs capitalize transition-all cursor-pointer
                          ${codingDiff === level 
                            ? 'bg-amber-500/10 border-amber-500 text-amber-500' 
                            : 'border-gray-200 dark:border-gray-800 text-gray-550'
                          }
                        `}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Specific Field: Quiz Choices options */}
              {activeTab === 'quizzes' && (
                <div className="space-y-3 pt-2">
                  <span className="text-[10px] font-bold tracking-wider uppercase font-mono text-gray-400">Quiz Choices options (provide 4):</span>
                  {manualOption.map((opt, oIdx) => (
                    <div key={oIdx} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQuizCorrectIndex(oIdx)}
                        className={`w-7 h-7 shrink-0 rounded-full border flex items-center justify-center font-mono font-bold text-xs transition-colors cursor-pointer
                          ${quizCorrectIndex === oIdx 
                            ? 'bg-emerald-500 border-transparent text-white' 
                            : 'border-gray-200 dark:border-gray-850 text-gray-500'
                          }
                        `}
                        title="Mark as correct answer"
                      >
                        {String.fromCharCode(65 + oIdx)}
                      </button>
                      <input
                        type="text"
                        required
                        placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                        value={opt || ''}
                        onChange={(e) => {
                          const copy = [...manualOption];
                          copy[oIdx] = e.target.value;
                          setManualOption(copy);
                        }}
                        className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 bg-white dark:bg-gray-950 text-xs text-gray-900 dark:text-white focus:outline-none"
                      />
                    </div>
                  ))}

                  <div className="pt-2">
                    <label className="block text-xs font-bold tracking-wider text-gray-420 dark:text-gray-500 uppercase mb-2 font-mono">
                      Logic Explanation
                    </label>
                    <textarea
                      required
                      rows={2}
                      placeholder="Why is this option correct? (explains scope lookup mechanics, etc.)"
                      value={quizExpl || ''}
                      onChange={(e) => setQuizExpl(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-gray-202 bg-white dark:bg-gray-950 text-xs text-gray-950 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* Form Controls submit/dismiss */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-805">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-gray-500 hover:text-gray-800 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-805 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-905 text-sm font-semibold shadow-md cursor-pointer transition-all active:scale-98"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modern custom resource deletion confirmation dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setDeleteTarget(null)} className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs" />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-2xl shrink-0 shadow-sm">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-lg text-slate-900 dark:text-white leading-tight">
                  Delete item?
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  Are you sure you want to permanently delete <strong className="font-semibold text-slate-800 dark:text-slate-200">"{deleteTarget.title}"</strong> from your {deleteTarget.field} dashboard? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-4 mt-5 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-805 text-xs font-semibold uppercase tracking-wider font-mono transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDeleteItem}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold uppercase tracking-wider font-mono shadow-md transition-all cursor-pointer active:scale-95"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Universal Edit Item modal component */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setEditingItem(null)} className="absolute inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-xs" />
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-805 shadow-2xl p-6 overflow-y-auto max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white capitalize mb-4">
              Edit {editingItem.field === 'pdfs' ? 'PDF File / Link' : editingItem.field === 'quizzes' ? 'Quiz Question' : editingItem.field === 'trackers' ? 'Topic Tracker' : editingItem.field}
            </h3>

            <form onSubmit={handleSaveEditItem} className="space-y-4">
              
              {/* Question / Title */}
              {editingItem.field === 'quizzes' ? (
                <div>
                  <label className="block text-xs font-bold tracking-wider text-gray-400 dark:text-gray-500 uppercase mb-2 font-mono">
                    Question Text
                  </label>
                  <input
                    type="text"
                    required
                    value={editTitle || ''}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-sans"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold tracking-wider text-gray-400 dark:text-gray-500 uppercase mb-2 font-mono">
                    {editingItem.field === 'trackers' ? 'Interview Topic Title' : 'Title'}
                  </label>
                  <input
                    type="text"
                    required
                    value={editTitle || ''}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-sans"
                  />
                </div>
              )}

              {/* Conditional URL / Links for PDFs or Videos */}
              {editingItem.field === 'pdfs' && (
                <div>
                  <label className="block text-xs font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-2 font-mono">
                    PDF Link / URL Action
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com/syllabus.pdf"
                    value={editUrl || ''}
                    onChange={(e) => setEditUrl(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-905 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/25 font-sans"
                  />
                  <p className="text-[10px] text-slate-400 font-mono mt-1">If blank, preserves the uploaded file data</p>
                </div>
              )}

              {editingItem.field === 'videos' && (
                <div>
                  <label className="block text-xs font-bold tracking-wider text-gray-400 dark:text-gray-500 uppercase mb-2 font-mono">
                    Video Url
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://youtube.com/watch?v=..."
                    value={editUrl || ''}
                    onChange={(e) => setEditUrl(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-sans"
                  />
                </div>
              )}

              {/* Conditional Content box for notes, concepts, coding problems, interviews */}
              {(editingItem.field === 'notes' || editingItem.field === 'concepts' || editingItem.field === 'coding' || editingItem.field === 'interviews') && (
                <div>
                  <label className="block text-xs font-bold tracking-wider text-gray-400 dark:text-gray-500 uppercase mb-2 font-mono">
                    {editingItem.field === 'notes' ? 'Content (Markdown)' : editingItem.field === 'coding' ? 'Problem Statement (Markdown)' : 'Content/Explanation'}
                  </label>
                  <textarea
                    required
                    rows={editingItem.field === 'notes' ? 8 : 4}
                    value={editContent || ''}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-gray-950 text-slate-955 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-sans"
                  />
                </div>
              )}

              {/* Specific Field: Code block for concepts */}
              {editingItem.field === 'concepts' && (
                <div>
                  <label className="block text-xs font-bold tracking-wider text-gray-400 dark:text-gray-500 uppercase mb-2 font-mono">
                    Code Snippet (Optional)
                  </label>
                  <textarea
                    rows={4}
                    value={editCodeSnippet || ''}
                    onChange={(e) => setEditCodeSnippet(e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-950 border border-slate-200 font-mono text-xs text-emerald-500 rounded-xl focus:outline-none"
                  />
                </div>
              )}

              {/* Specific fields for coding challenges */}
              {editingItem.field === 'coding' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {['easy', 'medium', 'hard'].map(level => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setEditDifficulty(level as any)}
                        className={`py-2 rounded-xl border font-bold text-xs capitalize transition-all cursor-pointer
                          ${editDifficulty === level 
                            ? 'bg-amber-500/10 border-amber-500 text-amber-500' 
                            : 'border-slate-200 dark:border-slate-800 text-slate-500'
                          }
                        `}
                      >
                        {level}
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="block text-xs font-bold tracking-wider text-gray-400 dark:text-gray-500 uppercase mb-2 font-mono">
                      Starter Code Skeletal
                    </label>
                    <textarea
                      rows={3}
                      value={editStarterCode || ''}
                      onChange={(e) => setEditStarterCode(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white dark:bg-gray-950 font-mono text-xs text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold tracking-wider text-gray-400 dark:text-gray-500 uppercase mb-2 font-mono">
                      Reference Answer Solution
                    </label>
                    <textarea
                      rows={3}
                      value={editSolution || ''}
                      onChange={(e) => setEditSolution(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white dark:bg-gray-950 font-mono text-xs text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Seniority difficulty level on Interview Q&As */}
              {editingItem.field === 'interviews' && (
                <div>
                  <label className="block text-xs font-bold tracking-wider text-gray-450 dark:text-gray-500 uppercase mb-2 font-mono">
                    Seniority level
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {['junior', 'mid', 'senior'].map(level => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setEditDifficulty(level as any)}
                        className={`py-2 rounded-xl border font-bold text-xs capitalize transition-all cursor-pointer
                          ${editDifficulty === level 
                            ? 'bg-amber-500/10 border-amber-500 text-amber-500' 
                            : 'border-slate-200 dark:border-slate-800 text-slate-500'
                          }
                        `}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Specific fields for Topic Tracker items */}
              {editingItem.field === 'trackers' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      onClick={() => setEditTrackerStarted(!editTrackerStarted)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                        editTrackerStarted 
                          ? 'bg-indigo-600 border-transparent text-white shadow-xs' 
                          : 'bg-slate-50 dark:bg-slate-905 text-slate-500 border-slate-205 dark:border-slate-800 hover:text-slate-900'
                      }`}
                      title="Cognitive Stage 1: Encoding facts into working memory."
                    >
                      <input type="checkbox" checked={editTrackerStarted} readOnly className="pointer-events-none rounded text-indigo-650 focus:ring-0 w-3 h-3" />
                      <span>1. Encoded</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditTrackerCompleted(!editTrackerCompleted)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                        editTrackerCompleted 
                          ? 'bg-blue-600 border-transparent text-white shadow-xs' 
                          : 'bg-slate-50 dark:bg-slate-905 text-slate-500 border-slate-205 dark:border-slate-800 hover:text-slate-900'
                      }`}
                      title="Cognitive Stage 2: Organizing and restructuring principles."
                    >
                      <input type="checkbox" checked={editTrackerCompleted} readOnly className="pointer-events-none rounded text-blue-650 focus:ring-0 w-3 h-3" />
                      <span>2. Restructured</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditTrackerRevised(!editTrackerRevised)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                        editTrackerRevised 
                          ? 'bg-violet-650 border-transparent text-white shadow-xs' 
                          : 'bg-slate-50 dark:bg-slate-905 text-slate-500 border-slate-205 dark:border-slate-800 hover:text-slate-900'
                      }`}
                      title="Cognitive Stage 3: Active memory recall practice."
                    >
                      <input type="checkbox" checked={editTrackerRevised} readOnly className="pointer-events-none rounded text-violet-650 focus:ring-0 w-3 h-3" />
                      <span>3. Self-Tested</span>
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold tracking-wider text-gray-400 dark:text-gray-500 uppercase mb-2 font-mono">
                      Personal Reminder Notes
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Focus most heavily on recursive closures memory leak patterns"
                      value={editTrackerNotes || ''}
                      onChange={(e) => setEditTrackerNotes(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-805 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Specific fields for quizzes */}
              {editingItem.field === 'quizzes' && (
                <div className="space-y-4 pt-2">
                  <span className="text-[10px] font-bold tracking-wider uppercase font-mono text-gray-400">Quiz Choices options:</span>
                  {editOptions.map((opt, oIdx) => (
                    <div key={oIdx} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditCorrectIndex(oIdx)}
                        className={`w-7 h-7 shrink-0 rounded-full border flex items-center justify-center font-mono font-bold text-xs transition-colors cursor-pointer
                          ${editCorrectIndex === oIdx 
                            ? 'bg-emerald-500 border-transparent text-white' 
                            : 'border-slate-200 dark:border-slate-800 text-gray-500'
                          }
                        `}
                      >
                        {String.fromCharCode(65 + oIdx)}
                      </button>
                      <input
                        type="text"
                        required
                        value={opt || ''}
                        onChange={(e) => {
                          const copy = [...editOptions];
                          copy[oIdx] = e.target.value;
                          setEditOptions(copy);
                        }}
                        className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-850 bg-white dark:bg-gray-950 text-xs text-gray-901 focus:outline-none"
                      />
                    </div>
                  ))}

                  <div className="pt-2">
                    <label className="block text-xs font-bold tracking-wider text-gray-410 dark:text-gray-500 uppercase mb-2 font-mono">
                      Logic Explanation
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={editExplanation || ''}
                      onChange={(e) => setEditExplanation(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white dark:bg-gray-950 text-xs text-gray-950 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Actions submit/cancel */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-805">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl text-gray-500 hover:text-gray-800 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-805 text-sm font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-205 text-white dark:text-slate-950 text-sm font-semibold shadow-md cursor-pointer transition-all active:scale-98"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk MD file / pasted list Topic Tracker import modal */}
      {isMdImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            onClick={() => setIsMdImportModalOpen(false)} 
            className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs duration-150 animate-in fade-in" 
          />
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 md:p-8 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800/60 mb-5 font-sans shrink-0">
              <div>
                <h3 className="font-sans font-bold text-lg md:text-xl text-slate-900 dark:text-white flex items-center gap-2">
                  <ClipboardList className="w-5.5 h-5.5 text-emerald-500" />
                  Bulk Import MD Checklist
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Pasted text or upload a Markdown file containing checklist or bulleted topics.
                </p>
              </div>
              <button 
                onClick={() => setIsMdImportModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Drag & Drop File Upload + Paste Container */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 font-sans">
              <div 
                className="group relative border-2 border-dashed border-slate-200 hover:border-slate-350 dark:border-slate-800 dark:hover:border-slate-700 rounded-2xl p-4 transition-all text-center"
                onDragOver={(e) => {
                  e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      if (event.target?.result) {
                        setMdImportContent(event.target.result as string);
                      }
                    };
                    reader.readAsText(file);
                  }
                }}
              >
                <input
                  type="file"
                  id="md-file-input"
                  accept=".md,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        if (event.target?.result) {
                          setMdImportContent(event.target.result as string);
                        }
                      };
                      reader.readAsText(file);
                    }
                  }}
                />
                <label 
                  htmlFor="md-file-input"
                  className="flex flex-col items-center justify-center cursor-pointer space-y-2 py-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Upload className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="text-xs">
                    <span className="font-extrabold text-slate-700 dark:text-slate-200 hover:underline">Click to upload .md/.txt file</span>
                    <span className="text-slate-400"> or drag and drop here</span>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">Supports standard .md checkboxes, bullets, numbered topics or raw lines</p>
                </label>
              </div>

              {/* Paste area */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase font-mono">
                  Paste Markdown / Checklist Contents:
                </label>
                <textarea
                  placeholder={`### JavaScript Interview Topics\n- [ ] Lexical scoping and closure\n- [ ] Event loop and macro/microtasks\n- Prototype inheritance\n1. Promises and async/await`}
                  rows={8}
                  value={mdImportContent}
                  onChange={(e) => setMdImportContent(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono text-xs leading-relaxed"
                />
              </div>

              {/* Live Parsing Preview */}
              {mdImportContent.trim().length > 0 && (
                <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase font-mono">
                      Parsed Checklist Preview
                    </span>
                    <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded font-mono font-bold">
                      {(() => {
                        const parsed = mdImportContent.split(/\r?\n/).map(line => {
                          let trimmed = line.trim();
                          if (!trimmed) return '';
                          if (trimmed.startsWith('#')) trimmed = trimmed.replace(/^#+\s+/, '');
                          if (/^[*-]\s+\[[ xX]\]\s+/.test(trimmed)) trimmed = trimmed.replace(/^[*-]\s+\[[ xX]\]\s+/, '');
                          else if (/^[*\-+]\s+/.test(trimmed)) trimmed = trimmed.replace(/^[*\-+]\s+/, '');
                          else if (/^\d+[\s.)\-]+\s*/.test(trimmed)) trimmed = trimmed.replace(/^\d+[\s.)\-]+\s*/, '');
                          trimmed = trimmed.replace(/^(\*\*|__|\*|_)+|(\*\*|__|\*|_)+$/g, '');
                          return trimmed.trim();
                        }).filter(it => it.length > 1);
                        return `${parsed.length} items found`;
                      })()}
                    </span>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 text-xs text-slate-600 dark:text-slate-400 font-sans border-t border-slate-100 dark:border-slate-800/40 pt-2 shrink-0">
                    {mdImportContent.split(/\r?\n/).map((line, lIdx) => {
                      let trimmed = line.trim();
                      if (!trimmed) return null;
                      if (trimmed.startsWith('#')) trimmed = trimmed.replace(/^#+\s+/, '');
                      if (/^[*-]\s+\[[ xX]\]\s+/.test(trimmed)) trimmed = trimmed.replace(/^[*-]\s+\[[ xX]\]\s+/, '');
                      else if (/^[*\-+]\s+/.test(trimmed)) trimmed = trimmed.replace(/^[*\-+]\s+/, '');
                      else if (/^\d+[\s.)\-]+\s*/.test(trimmed)) trimmed = trimmed.replace(/^\d+[\s.)\-]+\s*/, '');
                      trimmed = trimmed.replace(/^(\*\*|__|\*|_)+|(\*\*|__|\*|_)+$/g, '');
                      trimmed = trimmed.trim();
                      if (!trimmed || trimmed.length <= 1) return null;
                      return (
                        <div key={`preview-tr-${lIdx}`} className="flex items-center gap-2 bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-150 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-100">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span className="truncate">{trimmed}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Actions Footer */}
            <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/60 shrink-0 font-sans">
              <button
                type="button"
                onClick={() => setIsMdImportModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-150 dark:hover:bg-slate-800 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!mdImportContent.trim()}
                onClick={() => {
                  const lines = mdImportContent.split(/\r?\n/);
                  const parsedList: string[] = [];
                  for (let line of lines) {
                    let trimmed = line.trim();
                    if (!trimmed) continue;
                    if (trimmed.startsWith('#')) trimmed = trimmed.replace(/^#+\s+/, '');
                    if (/^[*-]\s+\[[ xX]\]\s+/.test(trimmed)) trimmed = trimmed.replace(/^[*-]\s+\[[ xX]\]\s+/, '');
                    else if (/^[*\-+]\s+/.test(trimmed)) trimmed = trimmed.replace(/^[*\-+]\s+/, '');
                    else if (/^\d+[\s.)\-]+\s*/.test(trimmed)) trimmed = trimmed.replace(/^\d+[\s.)\-]+\s*/, '');
                    trimmed = trimmed.replace(/^(\*\*|__|\*|_)+|(\*\*|__|\*|_)+$/g, '');
                    trimmed = trimmed.trim();
                    if (trimmed && trimmed.length > 1) {
                      parsedList.push(trimmed);
                    }
                  }

                  if (parsedList.length > 0) {
                    const newItems: TrackerItem[] = parsedList.map((title, idx) => ({
                      id: `tr-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
                      subtopicId,
                      title,
                      started: false,
                      completed: false,
                      revised: false,
                      confidence: 30, // default
                      isPerfect: false,
                      createdAt: new Date().toISOString()
                    }));

                    onUpdateDb({ trackers: [...(dbState.trackers || []), ...newItems] });
                  }
                  setMdImportContent('');
                  setIsMdImportModalOpen(false);
                }}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Bulk Generate Checklist</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
