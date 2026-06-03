import React, { useState } from 'react';
import { 
  ClipboardCheck, Search, Filter, CheckCircle2, Circle, Edit3, Trash2, 
  ExternalLink, Sparkles, BookOpen, Clock, AlertCircle, Plus 
} from 'lucide-react';
import { DatabaseState, TrackerItem, Subtopic, Topic } from '../types';

interface AllTrackersViewProps {
  dbState: DatabaseState;
  onOpenSubtopic: (topicId: string, subtopicId: string) => void;
  onUpdateDb: (updates: Partial<DatabaseState>) => void;
}

export function AllTrackersView({ dbState, onOpenSubtopic, onUpdateDb }: AllTrackersViewProps) {
  const { topics, subtopics } = dbState;
  const trackers = dbState.trackers || [];

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'started' | 'not-started'>('all');

  // New tracker item state for global adding
  const [newTrackerTitle, setNewTrackerTitle] = useState('');
  const [newTrackerSubtopicId, setNewTrackerSubtopicId] = useState('');
  const [newTrackerNotes, setNewTrackerNotes] = useState('');

  // Find subtopic and topic information
  const getSubtopicPath = (subtopicId: string) => {
    const sub = subtopics.find(s => s.id === subtopicId);
    const topic = sub ? topics.find(t => t.id === sub.topicId) : null;
    return { sub, topic };
  };

  const handleToggleField = (itemId: string, field: 'started' | 'completed' | 'revised' | 'isPerfect') => {
    const updated = trackers.map(t => {
      if (t.id === itemId) {
        const item = { ...t, [field]: !t[field] };
        if (field === 'isPerfect' && item.isPerfect) {
          item.confidence = 100;
          item.completed = true;
          item.started = true;
        }
        return item;
      }
      return t;
    });
    onUpdateDb({ trackers: updated });
  };

  const handleSliderChange = (itemId: string, val: number) => {
    const updated = trackers.map(t => {
      if (t.id === itemId) {
        return { ...t, confidence: val, isPerfect: val === 100 ? true : t.isPerfect };
      }
      return t;
    });
    onUpdateDb({ trackers: updated });
  };

  const handleDeleteItem = (itemId: string) => {
    const updated = trackers.filter(t => t.id !== itemId);
    onUpdateDb({ trackers: updated });
  };

  const handleAddTrackerItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrackerTitle.trim() || !newTrackerSubtopicId) return;

    const newTr: TrackerItem = {
      id: `tr-${Date.now()}`,
      subtopicId: newTrackerSubtopicId,
      title: newTrackerTitle.trim(),
      started: false,
      completed: false,
      revised: false,
      confidence: 30,
      isPerfect: false,
      notes: newTrackerNotes.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    onUpdateDb({ trackers: [...trackers, newTr] });
    setNewTrackerTitle('');
    setNewTrackerNotes('');
  };

  // Filter trackers
  const filteredTrackers = trackers.filter(tr => {
    const { sub, topic } = getSubtopicPath(tr.subtopicId);
    const query = searchTerm.toLowerCase();
    
    // Search query constraint
    const matchesQuery = tr.title.toLowerCase().includes(query) || 
      (tr.notes?.toLowerCase().includes(query) ?? false) ||
      (sub?.name.toLowerCase().includes(query) ?? false) ||
      (topic?.name.toLowerCase().includes(query) ?? false);

    // Topic constraint
    const matchesTopic = selectedTopicId === 'all' || (sub?.topicId === selectedTopicId);

    // Status constraint
    let matchesStatus = true;
    if (statusFilter === 'completed') matchesStatus = tr.completed;
    else if (statusFilter === 'started') matchesStatus = tr.started && !tr.completed;
    else if (statusFilter === 'not-started') matchesStatus = !tr.started;

    return matchesQuery && matchesTopic && matchesStatus;
  });

  // Calculate high-fidelity stats
  const totalCount = trackers.length;
  const completedCount = trackers.filter(t => t.completed).length;
  const startedCount = trackers.filter(t => t.started && !t.completed).length;
  const notStartedCount = trackers.filter(t => !t.started).length;
  const perfectCount = trackers.filter(t => t.isPerfect).length;

  const averageConfidence = totalCount > 0 
    ? Math.round(trackers.reduce((acc, t) => acc + (t.confidence || 0), 0) / totalCount)
    : 0;

  const completionPercentage = totalCount > 0 
    ? Math.round((completedCount / totalCount) * 100) 
    : 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-200 text-left">
      
      {/* Header section */}
      <div>
        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">
          Global Learning Vault
        </p>
        <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white mt-1 tracking-tight flex items-center gap-2.5">
          <ClipboardCheck className="w-8 h-8 text-blue-600 shrink-0" />
          <span>Topic Tracking Dashboard</span>
        </h2>
        <p className="text-sm font-medium text-slate-550 dark:text-slate-400 mt-2 font-sans">
          Manage, solve, and revise high-growth interview topics across all categories. Complete checklist milestones, monitor your confidence levels, and flag key scenarios.
        </p>
      </div>

      {/* Grid count stats panels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Completion Progress Gauge */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 flex items-center gap-4 shadow-3xs">
          <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
            {/* SVG circle track */}
            <svg className="absolute w-full h-full transform -rotate-90">
              <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-100 dark:text-slate-800" />
              <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray="150.7" strokeDashoffset={150.7 - (150.7 * completionPercentage) / 100} className="text-blue-600 transition-all duration-500" />
            </svg>
            <span className="text-xs font-black font-mono text-slate-905 dark:text-white">{completionPercentage}%</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Completion</span>
            <h5 className="text-xl font-extrabold text-slate-900 dark:text-white">{completedCount} / {totalCount}</h5>
            <span className="text-[10px] text-slate-400 italic">Topics Completed</span>
          </div>
        </div>

        {/* Avg Confidence */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 flex items-center gap-4 shadow-3xs">
          <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
            <svg className="absolute w-full h-full transform -rotate-90">
              <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-100 dark:text-slate-800" />
              <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray="150.7" strokeDashoffset={150.7 - (150.7 * averageConfidence) / 100} className="text-amber-550 transition-all duration-500" />
            </svg>
            <span className="text-xs font-black font-mono text-slate-905 dark:text-white">{averageConfidence}%</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Avg Confidence</span>
            <h5 className="text-xl font-extrabold text-slate-905 dark:text-white">{averageConfidence}%</h5>
            <span className="text-[10px] text-slate-400 italic">Self Evaluation Rating</span>
          </div>
        </div>

        {/* Active Checklist Items count */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 shadow-3xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Milestone Status</span>
          <div className="mt-2 flex items-baseline gap-2">
            <h5 className="text-3xl font-extrabold text-slate-850 dark:text-white">{startedCount}</h5>
            <span className="text-xs text-slate-500 font-medium">In Progress</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5 font-mono">
            <span>{notStartedCount} Not Started</span>
            <span className="text-slate-300">•</span>
            <span>{perfectCount} Perfected</span>
          </div>
        </div>

        {/* Sync or Database metrics */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 shadow-3xs flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Curriculum Coverage</span>
            <h5 className="text-xl font-extrabold text-slate-850 dark:text-white mt-1">{subtopics.length} Subtopics</h5>
          </div>
          <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20 px-2 py-0.5 rounded font-bold self-start mt-1">
            Across {topics.length} Categories
          </span>
        </div>
      </div>

      {/* Control Actions toolbar: Search, Topics Filter, Status */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-850 shadow-3xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search interview topics, notes, or category path tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 rounded-xl text-xs text-slate-805 placeholder-slate-400 outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all font-sans"
          />
        </div>

        {/* Topic select */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono hidden sm:inline">Category:</span>
          <select
            value={selectedTopicId}
            onChange={(e) => setSelectedTopicId(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs outline-hidden text-slate-700 dark:text-slate-300 font-sans focus:border-blue-500"
          >
            <option value="all">All Topics (Default)</option>
            {topics.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          {/* Status buttons */}
          <div className="flex rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-1">
            {(['all', 'completed', 'started', 'not-started'] as const).map(option => (
              <button
                key={option}
                onClick={() => setStatusFilter(option)}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold tracking-wide uppercase font-mono transition-all cursor-pointer ${
                  statusFilter === option
                    ? 'bg-white dark:bg-slate-800 text-slate-905 dark:text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                {option === 'started' ? 'Pending' : option.replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Global Add Item Section */}
      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/30 border border-dashed border-slate-250 dark:border-slate-850">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2 mb-3">
          <Plus className="w-4 h-4 text-blue-500" />
          <span>Add New Tracker Checklist Item Globally</span>
        </h4>
        <form onSubmit={handleAddTrackerItem} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <input
              type="text"
              required
              placeholder="e.g. Memory allocation closures pattern leaks"
              value={newTrackerTitle}
              onChange={(e) => setNewTrackerTitle(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-400"
            />
          </div>
          <div>
            <select
              required
              value={newTrackerSubtopicId}
              onChange={(e) => setNewTrackerSubtopicId(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-705 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Study Notes reminder (optional)..."
              value={newTrackerNotes}
              onChange={(e) => setNewTrackerNotes(e.target.value)}
              className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-400"
            />
            <button
              type="submit"
              disabled={!newTrackerTitle || !newTrackerSubtopicId}
              className="px-4 bg-blue-600 hover:bg-blue-550 disabled:opacity-50 text-white text-xs font-bold font-sans rounded-xl transition-colors shrink-0 cursor-pointer"
            >
              Add Item
            </button>
          </div>
        </form>
      </div>

      {/* Main Grid List rendering */}
      <div className="space-y-4">
        {filteredTrackers.map(tr => {
          const { sub, topic } = getSubtopicPath(tr.subtopicId);

          return (
            <div 
              key={tr.id}
              className={`p-5 rounded-2xl border transition-all relative flex flex-col md:flex-row items-stretch md:items-center justify-between gap-5 bg-white dark:bg-slate-900 shadow-3xs
                ${tr.isPerfect 
                  ? 'border-emerald-500/30 bg-emerald-500/[0.02] dark:bg-emerald-500/[0.01]' 
                  : 'border-slate-200/80 dark:border-slate-850 hover:border-blue-400 dark:hover:border-slate-750'
                }
              `}
            >
              {/* Left Side: Topic Title & Category Badge */}
              <div className="flex-1 space-y-2 text-left">
                <div className="flex flex-wrap items-center gap-2 select-none">
                  {sub && topic ? (
                    <button
                      onClick={() => onOpenSubtopic(topic.id, sub.id)}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 text-blue-600 dark:text-blue-400 text-[10px] font-bold font-mono tracking-wide transition-all border border-blue-100/30 cursor-pointer"
                      title="Jump to subtopic page"
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: topic.color }} />
                      <span>{topic.name}</span>
                      <span className="text-slate-400">/</span>
                      <span className="underline">{sub.name}</span>
                      <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                    </button>
                  ) : (
                    <span className="text-[9px] text-slate-400 uppercase font-mono tracking-wider bg-slate-50 dark:bg-slate-850 px-2 py-0.5 rounded">
                      No Path
                    </span>
                  )}
                  
                  {tr.isPerfect && (
                    <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded border border-emerald-500/20">
                      ⭐ Perfect
                    </span>
                  )}
                </div>

                <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug font-sans">
                  {tr.title}
                </h4>

                {tr.notes && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic font-sans pr-6">
                    "{tr.notes}"
                  </p>
                )}
              </div>

              {/* Middle Section: Checkbox Button States */}
              <div className="flex flex-wrap items-center gap-2 select-none">
                {/* Started Toggle */}
                <button
                  type="button"
                  onClick={() => handleToggleField(tr.id, 'started')}
                  className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                    tr.started 
                      ? 'bg-blue-600/10 border-blue-600/40 text-blue-600 dark:text-blue-400' 
                      : 'bg-slate-50 dark:bg-slate-950/40 text-slate-400 border-slate-205 dark:border-slate-800'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${tr.started ? 'bg-blue-600 animate-pulse' : 'bg-slate-300'}`} />
                  <span>Started</span>
                </button>

                {/* Completed Toggle */}
                <button
                  type="button"
                  onClick={() => handleToggleField(tr.id, 'completed')}
                  className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                    tr.completed 
                      ? 'bg-emerald-600/10 border-emerald-600/40 text-emerald-600 dark:text-emerald-400' 
                      : 'bg-slate-50 dark:bg-slate-950/40 text-slate-400 border-slate-205 dark:border-slate-800'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${tr.completed ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  <span>Completed</span>
                </button>

                {/* Revised Toggle */}
                <button
                  type="button"
                  onClick={() => handleToggleField(tr.id, 'revised')}
                  className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                    tr.revised 
                      ? 'bg-violet-600/10 border-violet-600/30 text-violet-600 dark:text-violet-400' 
                      : 'bg-slate-50 dark:bg-slate-950/40 text-slate-400 border-slate-205 dark:border-slate-800'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${tr.revised ? 'bg-violet-500' : 'bg-slate-300'}`} />
                  <span>Revised</span>
                </button>

                {/* Perfect Toggle */}
                <button
                  type="button"
                  onClick={() => handleToggleField(tr.id, 'isPerfect')}
                  className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                    tr.isPerfect 
                      ? 'bg-amber-500/15 border-amber-500/35 text-amber-550 dark:text-amber-400' 
                      : 'bg-slate-50 dark:bg-slate-950/40 text-slate-450 border-slate-205 dark:border-slate-800'
                  }`}
                >
                  <span>⭐ Perfect</span>
                </button>
              </div>

              {/* Right Side Slider Confidence & Actions */}
              <div className="flex flex-col sm:flex-row items-center gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                <div className="flex flex-col items-start w-32">
                  <span className="text-[9px] font-mono font-bold text-slate-405 uppercase tracking-wide mb-1">Confidence {tr.confidence || 0}%</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={tr.confidence || 0}
                    onChange={(e) => handleSliderChange(tr.id, parseInt(e.target.value, 10))}
                    className="w-full accent-blue-600 cursor-pointer h-1 bg-slate-200 dark:bg-slate-800 rounded-lg"
                  />
                </div>

                <div className="flex items-center gap-1 self-end sm:self-center">
                  <button
                    onClick={() => handleDeleteItem(tr.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors cursor-pointer"
                    title="Delete Tracker Item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredTrackers.length === 0 && (
          <div className="py-16 text-center border-2 border-dashed border-slate-205 dark:border-slate-855 rounded-3xl bg-slate-50/10">
            <AlertCircle className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-sans font-medium text-sm">
              No interview trackers match the selected search query, criteria, or status filters.
            </p>
            <p className="text-xs text-slate-450 font-mono mt-1">
              Add a study tracker item above or clear your filters to start studying.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
