import React, { useState } from 'react';
import { 
  Code, Search, HelpCircle, Eye, EyeOff, Plus, Trash2, 
  ExternalLink, Layers, Copy, Check, ChevronDown, ChevronUp, AlertCircle 
} from 'lucide-react';
import { DatabaseState, CodingItem, Subtopic, Topic } from '../types';

interface AllCodingViewProps {
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
        <ul key={idx} className="list-disc pl-5 my-1.5 space-y-1 text-sm text-slate-650 dark:text-slate-350 text-left font-sans">
          <li>{renderInlineFormat(line.trim().slice(2))}</li>
        </ul>
      );
    }
    const numMatch = line.trim().match(/^(\d+)\.\s(.*)/);
    if (numMatch) {
      const startNum = parseInt(numMatch[1], 10);
      return (
        <ol key={idx} start={startNum} className="list-decimal pl-5 my-1.5 space-y-1 text-sm text-slate-650 dark:text-slate-355 text-left font-sans">
          <li>{renderInlineFormat(numMatch[2])}</li>
        </ol>
      );
    }
    if (line.trim() === '') return <div key={idx} className="h-1.5" />;

    return (
      <p key={idx} className="text-sm text-slate-700 dark:text-slate-305 leading-relaxed font-sans my-1.5 text-left">
        {renderInlineFormat(line)}
      </p>
    );
  });
}

export function AllCodingView({ dbState, onOpenSubtopic, onUpdateDb }: AllCodingViewProps) {
  const { topics, subtopics } = dbState;
  const codingItems = dbState.coding || [];

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');

  const [revealedSolutions, setRevealedSolutions] = useState<Record<string, boolean>>({});
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New coding items form
  const [newTitle, setNewTitle] = useState('');
  const [newDifficulty, setNewDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [newProblem, setNewProblem] = useState('');
  const [newStarter, setNewStarter] = useState('');
  const [newSolution, setNewSolution] = useState('');
  const [newSubtopicId, setNewSubtopicId] = useState('');

  // Path lookup helpers
  const getSubtopicPath = (subtopicId: string) => {
    const sub = subtopics.find(s => s.id === subtopicId);
    const topic = sub ? topics.find(t => t.id === sub.topicId) : null;
    return { sub, topic };
  };

  const handleDeleteItem = (itemId: string) => {
    const updated = codingItems.filter(c => c.id !== itemId);
    onUpdateDb({ coding: updated });
  };

  const handleCopyCode = (idStr: string, codeText: string) => {
    navigator.clipboard.writeText(codeText);
    setCopiedId(idStr);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const toggleSolution = (idStr: string) => {
    setRevealedSolutions(prev => ({ ...prev, [idStr]: !prev[idStr] }));
  };

  const toggleCard = (idStr: string) => {
    setExpandedCards(prev => ({ ...prev, [idStr]: !prev[idStr] }));
  };

  const handleAddCodingItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newProblem.trim() || !newSubtopicId) return;

    const newItem: CodingItem = {
      id: `code-${Date.now()}`,
      subtopicId: newSubtopicId,
      title: newTitle.trim(),
      difficulty: newDifficulty,
      problemStatement: newProblem.trim(),
      starterCode: newStarter.trim() || undefined,
      solution: newSolution.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    onUpdateDb({ coding: [...codingItems, newItem] });
    setNewTitle('');
    setNewProblem('');
    setNewStarter('');
    setNewSolution('');
  };

  // Filter coding challenge decks
  const filteredCoding = codingItems.filter(item => {
    const { sub, topic } = getSubtopicPath(item.subtopicId);
    const query = searchTerm.toLowerCase();

    const matchesQuery = item.title.toLowerCase().includes(query) ||
      item.problemStatement.toLowerCase().includes(query) ||
      (sub?.name.toLowerCase().includes(query) ?? false) ||
      (topic?.name.toLowerCase().includes(query) ?? false);

    const matchesTopic = selectedTopicId === 'all' || (sub?.topicId === selectedTopicId);
    const matchesDifficulty = selectedDifficulty === 'all' || item.difficulty === selectedDifficulty;

    return matchesQuery && matchesTopic && matchesDifficulty;
  });

  // Calculate stats
  const totalCount = codingItems.length;
  const easyCount = codingItems.filter(c => c.difficulty === 'easy').length;
  const mediumCount = codingItems.filter(c => c.difficulty === 'medium').length;
  const hardCount = codingItems.filter(c => c.difficulty === 'hard').length;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-200 text-left">
      
      {/* Header section */}
      <div>
        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">
          Global Sandbox Vault
        </p>
        <h2 className="text-4xl font-extrabold text-slate-905 dark:text-white mt-1 tracking-tight flex items-center gap-2.5">
          <Code className="w-8 h-8 text-amber-500 shrink-0" />
          <span>Algorithms Practice Arena</span>
        </h2>
        <p className="text-sm font-medium text-slate-550 dark:text-slate-400 mt-2 font-sans">
          Practice unique software engineering algorithms & coding patterns. Review problem statements, load skeletal starter structures, and write reference solution codes.
        </p>
      </div>

      {/* Grid count stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total challenges */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl shadow-3xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-405 uppercase tracking-wide font-mono">Code Decks</span>
          <h4 className="text-2xl font-black text-slate-900 dark:text-white">{totalCount} algorithms</h4>
          <span className="text-[10px] text-slate-400 italic">Total Practice Items</span>
        </div>

        {/* Easy Toggles */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-850 rounded-2xl shadow-3xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide font-mono">Easy Tier</span>
            <h4 className="text-2xl font-black text-slate-900 dark:text-white">{easyCount} cases</h4>
          </div>
          <span className="text-xs bg-emerald-500/10 text-emerald-600 font-bold px-2 py-1 rounded">Green</span>
        </div>

        {/* Medium Toggles */}
        <div className="p-4 bg-white dark:bg-slate-905 border border-slate-250 dark:border-slate-850 rounded-2xl shadow-3xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-amber-550 uppercase tracking-wide font-mono">Medium Tier</span>
            <h4 className="text-2xl font-black text-slate-900 dark:text-white">{mediumCount} cases</h4>
          </div>
          <span className="text-xs bg-amber-500/10 text-amber-550 font-bold px-2 py-1 rounded">Orange</span>
        </div>

        {/* Hard Toggles */}
        <div className="p-4 bg-white dark:bg-slate-950/20 border border-slate-250 dark:border-slate-850 rounded-2xl shadow-3xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wide font-mono">Hard Tier</span>
            <h4 className="text-2xl font-black text-slate-900 dark:text-white">{hardCount} cases</h4>
          </div>
          <span className="text-xs bg-rose-500/10 text-rose-600 font-bold px-2 py-1 rounded">Crimson</span>
        </div>
      </div>

      {/* Control Actions toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-850 shadow-3xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search problems, keywords, starter skeletal codes, category path tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-205 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 rounded-xl text-xs text-slate-850 placeholder-slate-400 outline-hidden font-sans focus:border-blue-500"
          />
        </div>

        {/* Filter selectors */}
        <div className="flex flex-wrap items-center gap-2">
          <Layers className="w-4 h-4 text-slate-405 shrink-0" />
          <select
            value={selectedTopicId}
            onChange={(e) => setSelectedTopicId(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs outline-hidden text-slate-700 dark:text-slate-300 focus:border-blue-500"
          >
            <option value="all">All Topics (Default)</option>
            {topics.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value as any)}
            className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs outline-hidden text-slate-700 dark:text-slate-300 focus:border-blue-500"
          >
            <option value="all">All Difficulties</option>
            <option value="easy">🟩 Easy</option>
            <option value="medium">🟨 Medium</option>
            <option value="hard">🟥 Hard</option>
          </select>
        </div>
      </div>

      {/* Global Add Item Section */}
      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/30 border border-dashed border-slate-250 dark:border-slate-850">
        <h4 className="text-sm font-bold text-slate-905 dark:text-white flex items-center gap-1.5 mb-3">
          <Plus className="w-4 h-4 text-amber-500" />
          <span>Upload unique algorithm challenge globally</span>
        </h4>
        <form onSubmit={handleAddCodingItem} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              required
              placeholder="Challenge Title, e.g. LRU Cache under O(1) limits"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-905 focus:outline-none"
            />
            <select
              value={newDifficulty}
              onChange={(e) => setNewDifficulty(e.target.value as any)}
              className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 focus:outline-none"
            >
              <option value="easy">🟩 Easy Mode</option>
              <option value="medium">🟨 Medium Mode</option>
              <option value="hard">🟥 Hard Mode</option>
            </select>
            <select
              required
              value={newSubtopicId}
              onChange={(e) => setNewSubtopicId(e.target.value)}
              className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 focus:outline-none"
            >
              <option value="">-- Choose Subtopic Category --</option>
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
              rows={3}
              placeholder="Explain the coding problem requirements clearly. Bullet constraints are parsed automatically."
              value={newProblem}
              onChange={(e) => setNewProblem(e.target.value)}
              className="w-full p-4 text-xs rounded-xl border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-950 text-slate-900 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <textarea
              rows={3}
              placeholder="Starter Skeletal Code Block (optional)"
              value={newStarter}
              onChange={(e) => setNewStarter(e.target.value)}
              className="w-full p-3 font-mono text-[11px] rounded-xl border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-950 text-slate-900 focus:outline-none placeholder:font-sans"
            />
            <textarea
              rows={3}
              placeholder="Reference Solution algorithm code (optional)"
              value={newSolution}
              onChange={(e) => setNewSolution(e.target.value)}
              className="w-full p-3 font-mono text-[11px] rounded-xl border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-950 text-slate-950 focus:outline-none placeholder:font-sans"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-50 text-white dark:text-gray-950 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Create Challenge Card
          </button>
        </form>
      </div>

      {/* Main challenges list accordion cards */}
      <div className="space-y-4">
        {filteredCoding.map(item => {
          const { sub, topic } = getSubtopicPath(item.subtopicId);
          const isExpanded = expandedCards[item.id] ?? false;
          const isRevealed = revealedSolutions[item.id] ?? false;

          const difficultyBadgeColors = {
            easy: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-450 border border-emerald-500/20',
            medium: 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-450 border border-amber-500/20',
            hard: 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-450 border border-rose-500/20'
          };

          return (
            <div 
              key={item.id}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-850 rounded-2xl overflow-hidden shadow-3xs"
            >
              {/* Card Header Accordion Trigger */}
              <div
                onClick={() => toggleCard(item.id)}
                className="p-4.5 flex flex-wrap items-center justify-between gap-4 cursor-pointer select-none bg-slate-50/30 dark:bg-slate-805/10 hover:bg-slate-50 dark:hover:bg-slate-805/20 transition-colors text-left"
              >
                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {sub && topic ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenSubtopic(topic.id, sub.id);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 text-blue-600 dark:text-blue-400 text-[9px] font-bold font-mono tracking-wide border border-blue-100/10"
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: topic.color }} />
                        <span>{topic.name}</span>
                        <span className="text-slate-400 font-sans">➔</span>
                        <span className="underline">{sub.name}</span>
                        <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                      </button>
                    ) : (
                      <span className="text-[9px] text-slate-400 font-mono italic">Coding Sandbox</span>
                    )}

                    <span className={`text-[9px] font-bold uppercase tracking-wider font-mono px-2 py-0.5 rounded ${difficultyBadgeColors[item.difficulty]}`}>
                      {item.difficulty}
                    </span>
                  </div>

                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white leading-snug truncate">
                    {item.title}
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteItem(item.id);
                    }}
                    className="p-1.5 text-slate-405 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-805/40 transition-colors"
                    title="Delete algorithm challenge card"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="p-1 text-slate-400 hover:text-slate-800 transition-colors">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {/* Expansion Details */}
              {isExpanded && (
                <div className="p-5 text-left border-t border-slate-100 dark:border-slate-850 space-y-4">
                  {/* Problem statement */}
                  <div className="p-4 bg-slate-50/50 dark:bg-slate-950/30 rounded-xl border border-slate-200 dark:border-slate-850">
                    <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest block mb-2">Problem Statement:</span>
                    <div className="prose prose-sm select-text">
                      {renderSimpleMarkdown(item.problemStatement)}
                    </div>
                  </div>

                  {/* Starter Skeletal Code Block */}
                  {item.starterCode && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wide">Skeletal Starter Solution</span>
                        <button
                          onClick={() => handleCopyCode(item.id + '-starter', item.starterCode || '')}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-205 text-slate-650 hover:text-slate-900 rounded-lg text-[10px] font-mono inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          {copiedId === item.id + '-starter' ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" />
                              <span className="text-emerald-500 font-bold">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy Starter code</span>
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="p-3 bg-slate-950 text-emerald-450 font-mono text-[11px] rounded-xl border border-slate-850 overflow-x-auto scrollbar-thin">
                        <code>{item.starterCode}</code>
                      </pre>
                    </div>
                  )}

                  {/* Revealable solution answer */}
                  {item.solution && (
                    <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-850">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => toggleSolution(item.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                            isRevealed 
                              ? 'bg-amber-500/10 border border-amber-500/30 text-amber-550 dark:text-amber-450' 
                              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-xs'
                          }`}
                        >
                          {isRevealed ? (
                            <>
                              <EyeOff className="w-3.5 h-3.5" />
                              <span>Conceal Solution Code</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3.5 h-3.5" />
                              <span>Reveal Reference Answer Algorithm</span>
                            </>
                          )}
                        </button>

                        {isRevealed && (
                          <button
                            onClick={() => handleCopyCode(item.id + '-solution', item.solution || '')}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-205 text-slate-600 hover:text-slate-900 rounded-lg text-[10px] font-mono inline-flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            {copiedId === item.id + '-solution' ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-500" />
                                <span className="text-emerald-500 font-bold">Successfully Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy Answer Algorithm</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      {isRevealed && (
                        <pre className="p-4 bg-slate-950 text-indigo-350 font-mono text-[11px] rounded-xl border border-slate-800 overflow-x-auto scrollbar-thin max-h-96 select-text">
                          <code>{item.solution}</code>
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filteredCoding.length === 0 && (
          <div className="py-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-850 rounded-3xl bg-slate-50/10">
            <AlertCircle className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-sans font-medium text-sm">
              No matching algorithms or skeletal practice cards match the selected parameters.
            </p>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Add a practice case card above or view other syllabus sections inside.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
