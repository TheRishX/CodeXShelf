import React, { useState } from 'react';
import { 
  HelpCircle, Search, HelpCircle as AskIcon, Plus, Trash2, 
  ExternalLink, Layers, Copy, Check, ChevronDown, ChevronUp, AlertCircle 
} from 'lucide-react';
import { DatabaseState, InterviewItem, Subtopic, Topic } from '../types';

interface AllInterviewsViewProps {
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
          className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-mono text-xs rounded border border-slate-200 dark:border-slate-700 font-semibold"
        >
          {chunk.slice(1, -1)}
        </code>
      );
    }
    return chunk;
  });
}

function renderSimpleMarkdown(text: string) {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      return (
        <ul key={idx} className="list-disc pl-5 my-1.5 space-y-1 text-sm text-slate-655 dark:text-slate-350 text-left font-sans animate-fade-in">
          <li>{renderInlineFormat(line.trim().slice(2))}</li>
        </ul>
      );
    }
    const numMatch = line.trim().match(/^(\d+)\.\s(.*)/);
    if (numMatch) {
      const startNum = parseInt(numMatch[1], 10);
      return (
        <ol key={idx} start={startNum} className="list-decimal pl-5 my-1.5 space-y-1 text-sm text-slate-655 dark:text-slate-355 text-left font-sans animate-fade-in">
          <li>{renderInlineFormat(numMatch[2])}</li>
        </ol>
      );
    }
    if (line.trim() === '') return <div key={idx} className="h-2" />;

    return (
      <p key={idx} className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sans my-1.5 text-left">
        {renderInlineFormat(line)}
      </p>
    );
  });
}

export function AllInterviewsView({ dbState, onOpenSubtopic, onUpdateDb }: AllInterviewsViewProps) {
  const { topics, subtopics } = dbState;
  const interviews = dbState.interviews || [];

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<'all' | 'junior' | 'mid' | 'senior'>('all');

  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form states for global add
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [newLevel, setNewLevel] = useState<'junior' | 'mid' | 'senior'>('mid');
  const [newSubtopicId, setNewSubtopicId] = useState('');

  const getSubtopicPath = (subtopicId: string) => {
    const sub = subtopics.find(s => s.id === subtopicId);
    const topic = sub ? topics.find(t => t.id === sub.topicId) : null;
    return { sub, topic };
  };

  const handleDeleteItem = (itemId: string) => {
    const updated = interviews.filter(i => i.id !== itemId);
    onUpdateDb({ interviews: updated });
  };

  const handleCopyAnswer = (idStr: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(idStr);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const toggleAnswer = (idStr: string) => {
    setRevealedAnswers(prev => ({
      ...prev,
      [idStr]: !prev[idStr]
    }));
  };

  const handleAddInterviewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim() || !newAnswer.trim() || !newSubtopicId) return;

    const newItem: InterviewItem = {
      id: `int-${Date.now()}`,
      subtopicId: newSubtopicId,
      question: newQuestion.trim(),
      answer: newAnswer.trim(),
      level: newLevel,
      createdAt: new Date().toISOString()
    };

    onUpdateDb({ interviews: [...interviews, newItem] });
    setNewQuestion('');
    setNewAnswer('');
  };

  // Filter lists
  const filteredInterviews = interviews.filter(item => {
    const { sub, topic } = getSubtopicPath(item.subtopicId);
    const query = searchTerm.toLowerCase();

    const matchesQuery = item.question.toLowerCase().includes(query) ||
      item.answer.toLowerCase().includes(query) ||
      (sub?.name.toLowerCase().includes(query) ?? false) ||
      (topic?.name.toLowerCase().includes(query) ?? false);

    const matchesTopic = selectedTopicId === 'all' || (sub?.topicId === selectedTopicId);
    const matchesLevel = selectedLevel === 'all' || item.level === selectedLevel;

    return matchesQuery && matchesTopic && matchesLevel;
  });

  const totalCount = interviews.length;
  const juniorCount = interviews.filter(i => i.level === 'junior').length;
  const midCount = interviews.filter(i => i.level === 'mid').length;
  const seniorCount = interviews.filter(i => i.level === 'senior').length;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-200 text-left">
      
      {/* Header section */}
      <div>
        <p className="text-xs font-bold text-slate-405 dark:text-slate-500 uppercase tracking-widest font-mono">
          Global Knowledge Deck
        </p>
        <h2 className="text-4xl font-extrabold text-slate-905 dark:text-white mt-1 tracking-tight flex items-center gap-2.5">
          <HelpCircle className="w-8 h-8 text-indigo-500 shrink-0" />
          <span>Technical QA Flashcards</span>
        </h2>
        <p className="text-sm font-medium text-slate-550 dark:text-slate-400 mt-2 font-sans">
          Prepare for hiring manager reviews and architect panels with high-yield mock QA questions. Filter by seniority grids, toggle reveals, and save review notes.
        </p>
      </div>

      {/* Seniority Badges metrics stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total stats */}
        <div className="p-4.5 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-850 rounded-2xl shadow-3xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-405 uppercase tracking-wide font-mono">Curated Q&A</span>
          <h4 className="text-2xl font-black text-slate-905 dark:text-white mt-1">{totalCount} flashcards</h4>
          <span className="text-[10px] text-slate-400 italic">Total Registered Items</span>
        </div>

        {/* Junior */}
        <div className="p-4.5 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-850 rounded-2xl shadow-3xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide font-mono">Junior Level</span>
            <h4 className="text-2.5xl font-black text-slate-900 mt-0.5">{juniorCount} questions</h4>
          </div>
          <span className="bg-blue-500/10 text-blue-605 text-xs font-bold px-2 py-1 rounded">Associate</span>
        </div>

        {/* Mid */}
        <div className="p-4.5 bg-white dark:bg-slate-905 border border-slate-205 dark:border-slate-850 rounded-2xl shadow-3xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-amber-550 uppercase tracking-wide font-mono">Mid Level</span>
            <h4 className="text-2.5xl font-black text-slate-900 mt-0.5">{midCount} questions</h4>
          </div>
          <span className="bg-amber-500/10 text-amber-600 text-xs font-bold px-2 py-1 rounded">Mid-Level</span>
        </div>

        {/* Senior */}
        <div className="p-4.5 bg-white dark:bg-slate-950/20 border border-slate-205 dark:border-slate-850 rounded-2xl shadow-3xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-violet-600 uppercase tracking-wide font-mono">Senior Level</span>
            <h4 className="text-2.5xl font-black text-slate-900 mt-0.5">{seniorCount} questions</h4>
          </div>
          <span className="bg-violet-500/10 text-violet-600 text-xs font-bold px-2 py-1 rounded">Architect</span>
        </div>
      </div>

      {/* Control Actions toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-850 shadow-3xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search interview question, answers, syllabus topics, seniority tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 rounded-xl text-xs text-slate-805 placeholder-slate-400 outline-hidden focus:border-indigo-500 font-sans"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Layers className="w-4 h-4 text-slate-405 shrink-0" />
          <select
            value={selectedTopicId}
            onChange={(e) => setSelectedTopicId(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs outline-hidden text-slate-700 dark:text-slate-300 focus:border-indigo-500"
          >
            <option value="all">All Topics (Default)</option>
            {topics.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value as any)}
            className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs outline-hidden text-slate-700 dark:text-slate-300 focus:border-indigo-500"
          >
            <option value="all">All Seniority</option>
            <option value="junior">🟦 Junior/Associate</option>
            <option value="mid">🟨 Mid-Level Engineer</option>
            <option value="senior">🟥 Staff/Senior Architect</option>
          </select>
        </div>
      </div>

      {/* Global Add Item Section */}
      <div className="p-5 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-250 dark:border-slate-855">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-3">
          <Plus className="w-4 h-4 text-indigo-500" />
          <span>Upload Technical Q&A Card Globally</span>
        </h4>
        <form onSubmit={handleAddInterviewItem} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <select
              value={newLevel}
              onChange={(e) => setNewLevel(e.target.value as any)}
              className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 focus:outline-none"
            >
              <option value="junior">Associate (Junior) Level</option>
              <option value="mid">Mid-Level (Core) Engineer</option>
              <option value="senior">Strategic (Senior/Staff) Architect</option>
            </select>
            <select
              required
              value={newSubtopicId}
              onChange={(e) => setNewSubtopicId(e.target.value)}
              className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 focus:outline-none"
            >
              <option value="">-- Choose Subtopic Path --</option>
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
            <input
              type="text"
              required
              placeholder="Question Title, e.g., How does V8 store floating element indexes internally?"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              className="w-full px-4 py-3 text-xs rounded-xl border border-slate-202 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-905 focus:outline-none"
            />
          </div>
          <div>
            <textarea
              required
              rows={3}
              placeholder="Study details or answer explanation guides here. Markdown features like **highlights**, list dots, or ``` code containers work beautifully."
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
              className="w-full p-4 text-xs rounded-xl border border-slate-202 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-indigo-650 hover:bg-indigo-550 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Publish Flashcard
          </button>
        </form>
      </div>

      {/* Main Flashcards lists rendering */}
      <div className="space-y-4">
        {filteredInterviews.map(item => {
          const { sub, topic } = getSubtopicPath(item.subtopicId);
          const isRevealed = revealedAnswers[item.id] ?? false;

          const levelBadgeColors = {
            junior: 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-500/20',
            mid: 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-500/10',
            senior: 'bg-violet-50 text-violet-600 dark:bg-violet-950/20 dark:text-violet-400 border border-violet-500/20'
          };

          return (
            <div 
              key={item.id}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-850 rounded-2xl overflow-hidden shadow-3xs"
            >
              {/* Question Row Header */}
              <div className="p-5 flex flex-wrap items-start justify-between gap-4 text-left border-b border-slate-100 dark:border-slate-855 bg-slate-50/10 dark:bg-slate-805/10">
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {sub && topic ? (
                      <button
                        onClick={() => onOpenSubtopic(topic.id, sub.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 text-blue-600 dark:text-blue-400 text-[10px] font-bold font-mono tracking-wide border border-blue-100/10 cursor-pointer animate-fade-in"
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: topic.color }} />
                        <span>{topic.name}</span>
                        <span className="text-slate-400 font-sans">➔</span>
                        <span className="underline">{sub.name}</span>
                        <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                      </button>
                    ) : (
                      <span className="text-[9px] text-slate-400 font-mono italic">QA Flashcard</span>
                    )}

                    <span className={`text-[9px] font-bold uppercase tracking-wider font-mono px-2 py-0.5 rounded ${levelBadgeColors[item.level]}`}>
                      {item.level} level
                    </span>
                  </div>

                  <h4 className="text-sm font-extrabold text-slate-905 dark:text-white leading-relaxed select-text">
                    {item.question}
                  </h4>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteItem(item.id)}
                  className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer shrink-0"
                  title="Remove Technical Q&A Flashcard card"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Reveal Section Toggle */}
              <div className="p-5 text-left space-y-4">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => toggleAnswer(item.id)}
                    className={`px-4.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all text-white border cursor-pointer ${
                      isRevealed 
                        ? 'bg-slate-800 hover:bg-slate-700 border-slate-700' 
                        : 'bg-indigo-600 hover:bg-indigo-505 border-indigo-600 shadow-3xs'
                    }`}
                  >
                    <span>{isRevealed ? 'Hide Interview Answer Details' : 'Reveal Expert Prepared Answer'}</span>
                  </button>

                  {isRevealed && (
                    <button
                      onClick={() => handleCopyAnswer(item.id, item.answer)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-mono text-[10px] inline-flex items-center gap-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span className="text-emerald-500 font-bold">Successfully Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Answer Details</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {isRevealed && (
                  <div className="p-4 bg-slate-50/50 dark:bg-slate-950/40 rounded-xl border border-slate-200/80 dark:border-slate-850 select-text leading-relaxed">
                    {renderSimpleMarkdown(item.answer)}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {filteredInterviews.length === 0 && (
          <div className="py-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-850 rounded-3xl bg-slate-50/10">
            <AlertCircle className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-sans font-medium text-sm">
              No hiring manager mock interview questions match the current filters.
            </p>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Add a mock challenge card above or browse custom subtopic tabs inside.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
