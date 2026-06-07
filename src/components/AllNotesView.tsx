import React, { useState } from 'react';
import { 
  FileText, Search, BookOpen, Plus, Trash2, Edit3, ExternalLink, 
  Layers, ChevronDown, ChevronUp, Copy, Check 
} from 'lucide-react';
import { DatabaseState, NoteItem, Subtopic, Topic } from '../types';

interface AllNotesViewProps {
  dbState: DatabaseState;
  onOpenSubtopic: (topicId: string, subtopicId: string) => void;
  onUpdateDb: (updates: Partial<DatabaseState>) => void;
}

// Replicate matching markdown parser
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
          className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-blue-650 dark:text-blue-400 font-mono text-xs rounded border border-slate-205 dark:border-slate-700 font-semibold"
        >
          {chunk.slice(1, -1)}
        </code>
      );
    }
    return chunk;
  });
}

function renderSimpleMarkdown(text: string, onCopyCode: (code: string) => void) {
  if (!text) return null;
  const lines = text.split('\n');
  let inCodeBlock = false;
  let codeLines: string[] = [];

  return lines.map((line, idx) => {
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        inCodeBlock = false;
        const currentCode = codeLines.join('\n');
        codeLines = [];
        return (
          <pre key={idx} className="my-3 p-4 bg-slate-950 text-[#00d41e] font-mono text-xs rounded-xl overflow-x-auto relative group border border-slate-800">
            <button 
              type="button"
              onClick={() => onCopyCode(currentCode)}
              className="absolute top-2.5 right-2.5 p-1 rounded bg-slate-800 hover:bg-slate-700 text-white opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity"
              title="Copy code"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <code className="text-[#00d41e]">{currentCode}</code>
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

    if (line.startsWith('### ')) {
      return <h4 key={idx} className="text-base font-bold text-slate-900 dark:text-white mt-4 mb-2 font-sans">{line.slice(4)}</h4>;
    }
    if (line.startsWith('## ')) {
      return <h3 key={idx} className="text-lg font-extrabold text-slate-950 dark:text-white mt-5 mb-2.5 font-sans pb-1 border-b border-slate-100 dark:border-slate-800">{line.slice(3)}</h3>;
    }
    if (line.startsWith('# ')) {
      return <h2 key={idx} className="text-xl font-extrabold text-slate-950 dark:text-white mt-6 mb-3 font-sans pb-1.5 border-b border-slate-150 dark:border-slate-800">{line.slice(2)}</h2>;
    }
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      return (
        <ul key={idx} className="list-disc pl-5 my-1.5 space-y-1 text-sm text-slate-650 dark:text-slate-300">
          <li>{renderInlineFormat(line.trim().slice(2))}</li>
        </ul>
      );
    }
    
    const numMatch = line.trim().match(/^(\d+)\.\s(.*)/);
    if (numMatch) {
      const startNum = parseInt(numMatch[1], 10);
      return (
        <ol key={idx} start={startNum} className="list-decimal pl-5 my-1.5 space-y-1 text-sm text-slate-650 dark:text-slate-300">
          <li>{renderInlineFormat(numMatch[2])}</li>
        </ol>
      );
    }
    
    if (line.trim().startsWith('> ')) {
      return (
        <blockquote key={idx} className="border-l-4 border-blue-600 bg-blue-500/5 px-4 py-2 my-2 rounded-r-lg text-xs font-mono text-slate-600 dark:text-slate-400">
          {renderInlineFormat(line.trim().slice(2))}
        </blockquote>
      );
    }

    if (line.trim() === '') return <div key={idx} className="h-2" />;

    return (
      <p key={idx} className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sans my-1.5">
        {renderInlineFormat(line)}
      </p>
    );
  });
}

export function AllNotesView({ dbState, onOpenSubtopic, onUpdateDb }: AllNotesViewProps) {
  const { topics, subtopics } = dbState;
  const notes = dbState.notes || [];

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('all');
  const [textSize, setTextSize] = useState<'A-' | 'A' | 'A+'>('A');
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // New Note addition state
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteSubtopicId, setNewNoteSubtopicId] = useState('');

  // Find subtopic and topic path details
  const getSubtopicPath = (subtopicId: string) => {
    const sub = subtopics.find(s => s.id === subtopicId);
    const topic = sub ? topics.find(t => t.id === sub.topicId) : null;
    return { sub, topic };
  };

  const handleDeleteItem = (itemId: string) => {
    const updated = notes.filter(n => n.id !== itemId);
    onUpdateDb({ notes: updated });
  };

  const handleAddNoteItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim() || !newNoteContent.trim() || !newNoteSubtopicId) return;

    const newNote: NoteItem = {
      id: `note-${Date.now()}`,
      subtopicId: newNoteSubtopicId,
      title: newNoteTitle.trim(),
      content: newNoteContent,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onUpdateDb({ notes: [...notes, newNote] });
    setNewNoteTitle('');
    setNewNoteContent('');
  };

  const handleCopyCode = (codeStr: string) => {
    navigator.clipboard.writeText(codeStr);
    setCopiedCodeId('temp');
    setTimeout(() => setCopiedCodeId(null), 1500);
  };

  const markNoteAsReading = (noteId: string) => {
    const updated = notes.map(n => {
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
    const updated = notes.map(n => {
      if (n.id === noteId) {
        return {
          ...n,
          status,
          isCompleted: status === 'completed',
          needsRevision: status === 'revision',
          isReading: status === 'completed' ? false : n.isReading
        };
      }
      return n;
    });
    onUpdateDb({ notes: updated });
  };

  const toggleExpand = (noteId: string) => {
    const nextState = !expandedNotes[noteId];
    setExpandedNotes(prev => ({
      ...prev,
      [noteId]: nextState
    }));

    if (nextState) {
      markNoteAsReading(noteId);
    }
  };

  // Filter notes
  const filteredNotes = notes.filter(note => {
    const { sub, topic } = getSubtopicPath(note.subtopicId);
    const query = searchTerm.toLowerCase();

    const matchesQuery = note.title.toLowerCase().includes(query) ||
      note.content.toLowerCase().includes(query) ||
      (sub?.name.toLowerCase().includes(query) ?? false) ||
      (topic?.name.toLowerCase().includes(query) ?? false);

    const matchesTopic = selectedTopicId === 'all' || (sub?.topicId === selectedTopicId);

    return matchesQuery && matchesTopic;
  });

  // Reading scale class helper
  const getTextSizeClass = () => {
    if (textSize === 'A-') return 'prose-sm';
    if (textSize === 'A+') return 'prose-lg font-medium';
    return 'prose-base';
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-200 text-left">
      
      {/* Header section */}
      <div>
        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">
          Global Reading Vault
        </p>
        <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white mt-1 tracking-tight flex items-center gap-2.5">
          <BookOpen className="w-8 h-8 text-indigo-500 shrink-0" />
          <span>Curriculum Study Notes</span>
        </h2>
        <p className="text-sm font-medium text-slate-550 dark:text-slate-400 mt-2 font-sans">
          Curate, read, and search markdown study logs, cheatsheets, and concept definitions. Click cards to expand complex study items styled beautiful markup formats.
        </p>
      </div>

      {/* Control Actions toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-205 dark:border-slate-850 shadow-3xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search titles, syntax outlines, full-text summaries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-205 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 rounded-xl text-xs text-slate-850 placeholder-slate-400 outline-hidden focus:border-blue-500 font-sans"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Layers className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedTopicId}
            onChange={(e) => setSelectedTopicId(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs outline-hidden text-slate-705 dark:text-slate-300 focus:border-indigo-500"
          >
            <option value="all">All Topics (Default)</option>
            {topics.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          {/* Reading Scale Selector */}
          <div className="flex rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-1">
            {(['A-', 'A', 'A+'] as const).map(size => (
              <button
                key={size}
                onClick={() => setTextSize(size)}
                className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                  textSize === size
                    ? 'bg-white dark:bg-slate-800 text-slate-905 dark:text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Global Add Item Section */}
      <div className="p-5 bg-slate-50/50 dark:bg-slate-905/30 rounded-2xl border border-dashed border-slate-205 dark:border-slate-850">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-3">
          <Plus className="w-4 h-4 text-indigo-500" />
          <span>Publish study summary notes globally</span>
        </h4>
        <form onSubmit={handleAddNoteItem} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              required
              placeholder="Cheatsheet Title, e.g. Call, Apply, Bind execution context differences"
              value={newNoteTitle}
              onChange={(e) => setNewNoteTitle(e.target.value)}
              className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-905 focus:outline-none"
            />
            <select
              required
              value={newNoteSubtopicId}
              onChange={(e) => setNewNoteSubtopicId(e.target.value)}
              className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="">-- Attach to subtopic page --</option>
              {subtopics.map(sub => {
                const parent = topics.find(t => t.id === sub.topicId);
                return (
                  <option key={sub.id} value={sub.id}>
                    {parent ? `${parent.name} ➔ ` : ''}{sub.name}
                  </option>
                );
              })}
            </select>
          </div>
          <div>
            <textarea
              required
              rows={4}
              placeholder="Study details support standard text formatting. Use **bold highlights**, `inline definitions`, or ``` block codes."
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              className="w-full p-4 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs font-sans transition-all active:scale-98 cursor-pointer"
          >
            Publish Study Note
          </button>
        </form>
      </div>

      {/* List of notes */}
      <div className="space-y-4">
        {filteredNotes.map(note => {
          const { sub, topic } = getSubtopicPath(note.subtopicId);
          const isExpanded = expandedNotes[note.id] ?? false; // closed by default
          const isReading = !!note.isReading;
          const status = note.status || 'unseen';

          // Distinct card styles depending on study progress
          let cardStyles = "border-slate-200/80 dark:border-slate-850 bg-white dark:bg-slate-900";
          let statusBadge = null;
          let encouragementMsg = "";

          if (isReading) {
            cardStyles = "border-amber-400 dark:border-amber-500 bg-amber-50/[0.02] dark:bg-amber-955/[0.01] shadow-[0_0_15px_rgba(245,158,11,0.12)] ring-1 ring-amber-400/40";
          } else if (status === 'completed' || note.isCompleted) {
            cardStyles = "border-emerald-250 dark:border-emerald-900/60 bg-emerald-500/[0.003] dark:bg-emerald-950/[0.003]";
          } else if (status === 'revision' || note.needsRevision) {
            cardStyles = "border-indigo-250 dark:border-indigo-900/60 bg-indigo-500/[0.003] dark:bg-indigo-950/[0.003]";
          }

          switch (status) {
            case 'completed':
              statusBadge = <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-100/60 dark:text-emerald-400 dark:bg-emerald-955/20 px-1.5 py-0.5 rounded uppercase">🎉 MASTERED</span>;
              encouragementMsg = "Excellent! You have achieved optimal retrieval strength for these concepts.";
              break;
            case 'revision':
              statusBadge = <span className="text-[9px] font-extrabold text-indigo-600 bg-indigo-100/60 dark:text-indigo-400 dark:bg-indigo-955/25 px-1.5 py-0.5 rounded uppercase">🔄 SPACING ACTIVE</span>;
              encouragementMsg = "Spacing pipeline active. Excellent day to practice active recall on this note.";
              break;
            case 'reading':
              statusBadge = <span className="text-[9px] font-extrabold text-amber-600 bg-amber-100/60 dark:text-amber-400 dark:bg-amber-955/20 px-1.5 py-0.5 rounded uppercase">📖 STUDYING NOW</span>;
              encouragementMsg = "Active study session. Double click any code to test compile.";
              break;
            default:
              statusBadge = <span className="text-[9px] font-extrabold text-slate-500 bg-slate-100 dark:text-slate-400 dark:bg-slate-800 px-1.5 py-0.5 rounded uppercase">⏳ UNREAD</span>;
              encouragementMsg = "Unread summary block. Open study notes and write core outline notes.";
          }

          return (
            <div 
              key={note.id}
              className={`rounded-3xl border overflow-hidden transition-all shadow-3xs ${cardStyles}`}
            >
              {/* Accordion Header */}
              <div 
                onClick={() => toggleExpand(note.id)}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none bg-slate-50/40 dark:bg-slate-805/10 hover:bg-slate-50 dark:hover:bg-slate-805/30 transition-colors border-b border-slate-100 dark:border-slate-850"
              >
                <div className="flex-1 space-y-1.5 truncate text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    {sub && topic ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenSubtopic(topic.id, sub.id);
                        }}
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/25 hover:bg-blue-100 text-blue-600 dark:text-blue-400 text-[10px] font-bold font-mono tracking-wide border border-blue-100/20"
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: topic.color }} />
                        <span>{topic.name}</span>
                        <span className="text-slate-400 font-sans">➔</span>
                        <span className="underline">{sub.name}</span>
                        <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                      </button>
                    ) : (
                      <span className="text-[9px] text-slate-400 font-mono tracking-wide bg-slate-100 px-2 rounded">Notes Card</span>
                    )}

                    <div className="flex items-center gap-1">
                      {statusBadge}
                      {isReading && (
                        <span className="text-[8px] font-black tracking-wider text-amber-655 bg-amber-500/15 px-1 py-0.5 rounded animate-pulse">
                          🔖 ACTIVE FOCUS
                        </span>
                      )}
                    </div>

                    <span className="text-[9px] text-slate-450 font-mono shrink-0 ml-auto md:ml-0">
                      Updated: {new Date(note.updatedAt || note.createdAt || Date.now()).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                    </span>
                  </div>

                  <h4 className="text-base font-extrabold text-slate-900 dark:text-white truncate">
                    {note.title}
                  </h4>
                </div>

                <div className="flex items-center gap-3 self-end md:self-center">
                  {/* Inline Status Bar switcher inside notes title section */}
                  <div 
                    onClick={(e) => e.stopPropagation()} 
                    className="inline-flex bg-slate-100/80 dark:bg-slate-950 p-0.5 rounded-lg border border-slate-200/50 dark:border-slate-800"
                  >
                    <button
                      type="button"
                      onClick={() => updateNoteStatus(note.id, 'unseen')}
                      className={`px-1.5 py-0.5 rounded text-[8px] font-bold transition-all cursor-pointer ${
                        status === 'unseen'
                          ? 'bg-white dark:bg-slate-805 text-slate-800 dark:text-white shadow-3xs font-black'
                          : 'text-slate-400 hover:text-slate-650'
                      }`}
                      title="Mark note as unread"
                    >
                      Unread
                    </button>
                    <button
                      type="button"
                      onClick={() => updateNoteStatus(note.id, 'reading')}
                      className={`px-1.5 py-0.5 rounded text-[8px] font-bold transition-all cursor-pointer ${
                        status === 'reading'
                          ? 'bg-amber-500 text-white shadow-3xs font-black'
                          : 'text-slate-400 hover:text-amber-550'
                      }`}
                      title="Mark note as started studying"
                    >
                      Study
                    </button>
                    <button
                      type="button"
                      onClick={() => updateNoteStatus(note.id, 'completed')}
                      className={`px-1.5 py-0.5 rounded text-[8px] font-bold transition-all cursor-pointer ${
                        status === 'completed'
                          ? 'bg-emerald-600 text-white shadow-3xs font-black'
                          : 'text-slate-400 hover:text-emerald-555'
                      }`}
                      title="Mark note as mastered/complete"
                    >
                      Mastered
                    </button>
                    <button
                      type="button"
                      onClick={() => updateNoteStatus(note.id, 'revision')}
                      className={`px-1.5 py-0.5 rounded text-[8px] font-bold transition-all cursor-pointer ${
                        status === 'revision'
                          ? 'bg-indigo-600 text-white shadow-3xs font-black'
                          : 'text-slate-400 hover:text-indigo-505'
                      }`}
                      title="Mark note as needs future spacing reviews"
                    >
                      Revise
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteItem(note.id);
                    }}
                    className="p-1.5 text-slate-404 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Remove Note Card"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="p-1.5 text-slate-450 hover:text-slate-800 transition-colors">
                    {isExpanded ? <ChevronUp className="w-4.5 h-4.5" /> : <ChevronDown className="w-4.5 h-4.5" />}
                  </div>
                </div>
              </div>

              {/* Accordion Body details */}
              {isExpanded && (
                <div className={`p-6 text-left border-t border-slate-100 dark:border-slate-855 bg-white dark:bg-slate-900 overflow-visible text-slate-800 dark:text-slate-200 ${getTextSizeClass()}`}>
                  
                  {/* Encouraging psychological tip line at head of body */}
                  <div className="mb-4 pb-2 border-b border-dashed border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-450 dark:text-slate-500">
                    <span className="italic">💡 {encouragementMsg}</span>
                    <span className="font-mono text-[9px] uppercase tracking-wide">STUDY OUTLINES LOG</span>
                  </div>

                  {copiedCodeId && (
                    <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white text-xs font-mono font-bold px-3 py-1.5 rounded-xl shadow-lg animate-fade-in flex items-center gap-1.5">
                      <Check className="w-4 h-4" />
                      <span>Syntax code copied!</span>
                    </div>
                  )}

                  <div className="space-y-1 select-text">
                    {renderSimpleMarkdown(note.content, handleCopyCode)}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredNotes.length === 0 && (
          <div className="py-16 text-center border-2 border-dashed border-slate-205 dark:border-slate-855 rounded-3xl bg-slate-50/10">
            <FileText className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-sans font-medium text-sm">
              No syllabus companion notes match the current lookup filters.
            </p>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Click add notes globally or attach summaries inside the topics page.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
