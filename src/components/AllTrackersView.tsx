import React, { useState } from 'react';
import { 
  ClipboardCheck, Search, Check, Circle, Edit3, Trash2, 
  ExternalLink, Sparkles, AlertCircle, Plus, X, BarChart3,
  BookOpen, Star, Sparkle, RefreshCw, Calendar, ArrowRight, ArrowLeft
} from 'lucide-react';
import { DatabaseState, TrackerItem, Subtopic } from '../types';

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

  // Simple Step-by-Step popup wizard state for adding/editing items
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TrackerItem | null>(null);
  const [currentStep, setCurrentStep] = useState(1); // 1, 2, or 3

  // Form states for creating & editing tracker items
  const [title, setTitle] = useState('');
  const [subtopicId, setSubtopicId] = useState('');
  const [notes, setNotes] = useState('');
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [revised, setRevised] = useState(false);
  const [confidence, setConfidence] = useState(30);
  const [isPerfect, setIsPerfect] = useState(false);
  const [formError, setFormError] = useState('');

  // Dialog confirmation overlays
  const [itemToDelete, setItemToDelete] = useState<{ id: string; title: string } | null>(null);

  // Helper: Find subtopic and topic information
  const getSubtopicPath = (subId: string) => {
    const sub = subtopics.find(s => s.id === subId);
    const topic = sub ? topics.find(t => t.id === sub.topicId) : null;
    return { sub, topic };
  };

  // Reset core states
  const resetForm = () => {
    setTitle('');
    setSubtopicId('');
    setNotes('');
    setStarted(false);
    setCompleted(false);
    setRevised(false);
    setConfidence(30);
    setIsPerfect(false);
    setFormError('');
    setCurrentStep(1);
  };

  const handleOpenAdd = () => {
    resetForm();
    setEditingItem(null);
    if (subtopics.length > 0) {
      setSubtopicId(subtopics[0].id);
    }
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: TrackerItem) => {
    resetForm();
    setEditingItem(item);
    setTitle(item.title);
    setSubtopicId(item.subtopicId);
    setNotes(item.notes || '');
    setStarted(item.started);
    setCompleted(item.completed);
    setRevised(item.revised);
    setConfidence(item.confidence || 0);
    setIsPerfect(item.isPerfect);
    setIsModalOpen(true);
  };

  const validateStep1 = () => {
    if (!title.trim()) {
      setFormError('Please enter a concept or title.');
      return false;
    }
    setFormError('');
    return true;
  };

  const validateStep2 = () => {
    if (!subtopicId) {
      setFormError('Please choose a valid subject path.');
      return false;
    }
    setFormError('');
    return true;
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (validateStep1()) setCurrentStep(2);
    } else if (currentStep === 2) {
      if (validateStep2()) setCurrentStep(3);
    }
  };

  const handlePrevStep = () => {
    setFormError('');
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!title.trim() || !subtopicId) {
      setFormError('Please fill out the prior details before saving.');
      return;
    }

    if (editingItem) {
      // Update item logic
      const updatedList = trackers.map(t => {
        if (t.id === editingItem.id) {
          return {
            ...t,
            title: title.trim(),
            subtopicId,
            notes: notes.trim() || undefined,
            started,
            completed,
            revised,
            confidence,
            isPerfect
          };
        }
        return t;
      });
      onUpdateDb({ trackers: updatedList });
    } else {
      // Create item logic
      const newItem: TrackerItem = {
        id: `tr-${Date.now()}`,
        subtopicId,
        title: title.trim(),
        started: started || completed,
        completed,
        revised,
        confidence,
        isPerfect,
        notes: notes.trim() || undefined,
        createdAt: new Date().toISOString()
      };
      onUpdateDb({ trackers: [...trackers, newItem] });
    }

    setIsModalOpen(false);
    resetForm();
  };

  const handleDeleteItem = (itemId: string) => {
    const item = trackers.find(t => t.id === itemId);
    if (item) {
      setItemToDelete({ id: itemId, title: item.title });
    }
  };

  const confirmDeleteItem = () => {
    if (itemToDelete) {
      const updatedList = trackers.filter(t => t.id !== itemToDelete.id);
      onUpdateDb({ trackers: updatedList });
      setItemToDelete(null);
    }
  };

  const handleSimpleToggleCompletion = (itemId: string) => {
    const updated = trackers.map(t => {
      if (t.id === itemId) {
        const nextCompleted = !t.completed;
        return {
          ...t,
          completed: nextCompleted,
          started: nextCompleted ? true : t.started
        };
      }
      return t;
    });
    onUpdateDb({ trackers: updated });
  };

  // Filter trackers
  const filteredTrackers = trackers.filter(tr => {
    const { sub, topic } = getSubtopicPath(tr.subtopicId);
    const query = searchTerm.toLowerCase();
    
    const matchesQuery = tr.title.toLowerCase().includes(query) || 
      (tr.notes?.toLowerCase() || '').includes(query) ||
      (sub?.name.toLowerCase() || '').includes(query) ||
      (topic?.name.toLowerCase() || '').includes(query);

    const matchesTopic = selectedTopicId === 'all' || (sub?.topicId === selectedTopicId);

    let matchesStatus = true;
    if (statusFilter === 'completed') matchesStatus = tr.completed;
    else if (statusFilter === 'started') matchesStatus = tr.started && !tr.completed;
    else if (statusFilter === 'not-started') matchesStatus = !tr.started;

    return matchesQuery && matchesTopic && matchesStatus;
  });

  // Simple statistics
  const totalCount = trackers.length;
  const completedCount = trackers.filter(t => t.completed).length;
  const startedCount = trackers.filter(t => t.started && !t.completed).length;
  const notStartedCount = trackers.filter(t => !t.started).length;

  const averageConfidence = totalCount > 0 
    ? Math.round(trackers.reduce((acc, t) => acc + (t.confidence || 0), 0) / totalCount)
    : 0;

  const completionPercentage = totalCount > 0 
    ? Math.round((completedCount / totalCount) * 100) 
    : 0;

  // Confidence category translation
  const getConfidenceLevel = (score: number) => {
    if (score < 30) return { label: 'Learning 📖', color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/20 dark:text-rose-400' };
    if (score <= 60) return { label: 'Good 👍', color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400' };
    if (score <= 90) return { label: 'Confident 💪', color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/20 dark:text-blue-400' };
    return { label: 'Mastered 🏆', color: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400' };
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-150 text-left">
      
      {/* Dynamic simplified minimal heading */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-105 dark:border-slate-800/60 pb-5">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <ClipboardCheck className="w-8 h-8 text-blue-600 shrink-0" />
            <span>My Study Tracker</span>
          </h2>
          <p className="text-sm font-semibold text-slate-400 dark:text-slate-500 mt-1 font-sans">
            A super friendly checklist to keep track of what you learn and how confident you feel.
          </p>
        </div>

        <div>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-sm rounded-2xl transition-all shadow-md active:scale-95 cursor-pointer font-sans"
          >
            <Plus className="w-5 h-5" />
            <span>Add Checklist Item</span>
          </button>
        </div>
      </div>

      {/* Simplified visually clean stats gauges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Progress Circular Gauge */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850/80 flex items-center gap-4 shadow-xs">
          <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
            <svg className="absolute w-full h-full transform -rotate-90">
              <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4.5" fill="transparent" className="text-slate-100 dark:text-slate-800" />
              <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4.5" fill="transparent" strokeDasharray="125.6" strokeDashoffset={125.6 - (125.6 * completionPercentage) / 100} className="text-emerald-500 transition-all duration-300" />
            </svg>
            <span className="text-[11px] font-mono font-black text-slate-800 dark:text-slate-200">{completionPercentage}%</span>
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-mono">My Progress</span>
            <h4 className="text-lg font-black text-slate-905 dark:text-white leading-none mt-1">{completedCount} of {totalCount} Done</h4>
          </div>
        </div>

        {/* Avg Confidence */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850/80 flex items-center gap-4 shadow-xs">
          <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
            <svg className="absolute w-full h-full transform -rotate-90">
              <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4.5" fill="transparent" className="text-slate-100 dark:text-slate-800" />
              <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4.5" fill="transparent" strokeDasharray="125.6" strokeDashoffset={125.6 - (125.6 * averageConfidence) / 100} className="text-amber-500 transition-all duration-300" />
            </svg>
            <span className="text-[11px] font-mono font-black text-slate-800 dark:text-slate-200">{averageConfidence}%</span>
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-mono">My Confidence</span>
            <h4 className="text-lg font-black text-slate-905 dark:text-white leading-none mt-1">Average: {averageConfidence}%</h4>
          </div>
        </div>

        {/* Pending Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850/80 shadow-xs flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center text-amber-550 shrink-0">
            <RefreshCw className="w-6 h-6 animate-spin-slow text-amber-500" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-mono">In Progress</span>
            <h4 className="text-lg font-black text-slate-905 dark:text-white leading-none mt-1">{startedCount} items playing</h4>
          </div>
        </div>

        {/* Total stats breakdown */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850/80 shadow-xs flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center text-blue-550 shrink-0">
            <BookOpen className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-mono">To-Do Left</span>
            <h4 className="text-lg font-black text-slate-905 dark:text-white leading-none mt-1">{notStartedCount} items left</h4>
          </div>
        </div>
      </div>

      {/* Control Actions bar: Search + Category Selector */}
      <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-205 dark:border-slate-800/80 flex flex-col md:flex-row justify-between gap-3 items-center">
        {/* Simple search bar */}
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Type code, category name, or topic to find..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-955 rounded-xl text-sm placeholder-slate-400 font-sans focus:outline-none focus:border-blue-500 text-slate-800 dark:text-slate-200 animate-none"
          />
        </div>

        {/* Big drop-down selectors & buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <select
            value={selectedTopicId}
            onChange={(e) => setSelectedTopicId(e.target.value)}
            className="w-full md:w-auto px-4 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-xl text-xs font-bold text-slate-750 dark:text-slate-200 outline-none"
          >
            <option value="all">📁 All Categories</option>
            {topics.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          {/* Simple state filters (All, Not Started, In Progress, Completed) */}
          <div className="flex rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-1">
            {(['all', 'not-started', 'started', 'completed'] as const).map(option => {
              const label = option === 'all' 
                ? 'All' 
                : option === 'not-started' 
                  ? 'To-Do' 
                  : option === 'started' 
                    ? 'Doing' 
                    : 'Done';

              return (
                <button
                  key={option}
                  onClick={() => setStatusFilter(option)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === option
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-801 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Checklist card rendering */}
      <div className="space-y-3">
        {filteredTrackers.map(tr => {
          const { sub, topic } = getSubtopicPath(tr.subtopicId);
          const confidenceInfo = getConfidenceLevel(tr.confidence || 0);

          return (
            <div
              key={tr.id}
              className={`p-4 rounded-2xl bg-white dark:bg-slate-905 border transition-all flex flex-col sm:flex-row items-center sm:items-stretch justify-between gap-4 shadow-xs ${
                tr.completed 
                  ? 'border-emerald-250 dark:border-emerald-900 bg-emerald-500/[0.01]' 
                  : 'border-slate-201 dark:border-slate-850 hover:border-blue-400 dark:hover:border-slate-750'
              }`}
            >
              {/* Checkbox trigger block: Touch Target 44px (11) */}
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleSimpleToggleCompletion(tr.id)}
                  className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-all border-2 cursor-pointer outline-none focus:ring-4 focus:ring-blue-500/20 ${
                    tr.completed 
                      ? 'bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-600 hover:border-emerald-600 scale-105 shadow-sm' 
                      : 'border-slate-350 dark:border-slate-700 bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-300 dark:text-slate-700 hover:text-slate-400 hover:border-blue-400'
                  }`}
                  title={tr.completed ? "Mark incomplete" : "Mark as completed"}
                >
                  {tr.completed ? (
                    <Check className="w-5.5 h-5.5 stroke-[3]" />
                  ) : (
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                  )}
                </button>

                <div className="min-w-0 flex-1 text-left space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {topic && sub ? (
                      <button
                        onClick={() => onOpenSubtopic(topic.id, sub.id)}
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 text-blue-600 dark:text-blue-400 text-[10px] font-black font-sans transition-all border border-blue-100/30 cursor-pointer"
                        title="View subtopic"
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: topic.color }} />
                        <span>{topic.name} ➔ {sub.name}</span>
                        <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                      </button>
                    ) : (
                      <span className="text-[9px] text-slate-400 uppercase font-mono tracking-wider bg-slate-50 dark:bg-slate-850 px-2 py-0.5 rounded">
                        General
                      </span>
                    )}

                    {/* Metadata Badges */}
                    {tr.isPerfect && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-400/10 text-amber-600 dark:text-amber-400 border border-amber-500/10 flex items-center gap-0.5 uppercase tracking-wide">
                        ⭐ Perfect
                      </span>
                    )}

                    {tr.revised && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/20 uppercase tracking-wide">
                        🔄 Revised
                      </span>
                    )}

                    {/* Show simple confidence level indicator label */}
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase border border-transparent ${confidenceInfo.color}`}>
                      {confidenceInfo.label}
                    </span>
                  </div>

                  <h3 className={`text-sm sm:text-base font-extrabold leading-snug tracking-tight text-slate-850 dark:text-white transition-all ${tr.completed ? 'line-through opacity-60 text-slate-400' : ''}`}>
                    {tr.title}
                  </h3>

                  {tr.notes && (
                    <p className="text-xs text-slate-500 dark:text-slate-405 italic leading-relaxed pt-0.5">
                      💡 {tr.notes}
                    </p>
                  )}
                </div>
              </div>

              {/* Edit Actions Side */}
              <div className="flex items-center gap-2 justify-end w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-850/60 shrink-0">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(tr)}
                  className="px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Tune settings"
                >
                  <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Configure</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteItem(tr.id)}
                  className="p-2 border border-transparent hover:border-red-200 dark:hover:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl text-slate-350 hover:text-red-500 transition-all cursor-pointer"
                  title="Remove checklist item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}

        {filteredTrackers.length === 0 && (
          <div className="py-16 text-center border-2 border-dashed border-slate-205 dark:border-slate-855 rounded-3xl bg-slate-50/10 dark:bg-transparent">
            <AlertCircle className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
            <p className="text-slate-550 dark:text-slate-400 font-sans font-medium text-sm">
              Your tracking checklist is clear!
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Click "+ Add Checklist Item" at the top to secure a study plan.
            </p>
          </div>
        )}
      </div>

      {/* Step-by-Step wizard Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-202 dark:border-slate-805 w-full max-w-lg shadow-2xl p-6 relative animate-in zoom-in-95 duration-150 text-left">
            
            {/* Modal header */}
            <div className="flex items-center justify-between border-b pb-3 mb-5 border-slate-100 dark:border-slate-805">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  {editingItem ? 'Tune Tracking Details' : 'Add Tracking Checklist Item'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 cursor-pointer outline-none"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Step Indicators */}
            <div className="flex items-center justify-center gap-1.5 mb-6">
              {[1, 2, 3].map(stepNum => (
                <div key={stepNum} className="flex items-center animate-none">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-all ${
                    currentStep === stepNum
                      ? 'bg-blue-600 text-white shadow-xs scale-105'
                      : currentStep > stepNum
                        ? 'bg-blue-100 text-blue-600 dark:bg-blue-950/45'
                        : 'bg-slate-100 dark:bg-slate-805 text-slate-400 dark:text-slate-500'
                  }`}>
                    {stepNum}
                  </div>
                  {stepNum < 3 && (
                    <div className={`w-12 h-0.5 mx-1 transition-colors ${currentStep > stepNum ? 'bg-blue-500' : 'bg-slate-100 d:bg-slate-800 dark:bg-slate-800'}`} />
                  )}
                </div>
              ))}
            </div>

            {/* Setup Form */}
            <form onSubmit={handleSaveItem} className="space-y-5 select-none">
              {formError && (
                <div className="flex items-center gap-2 p-3.5 bg-rose-50 text-rose-700 dark:bg-rose-955/20 dark:text-rose-300 text-xs font-semibold rounded-2xl border border-rose-102 dark:border-rose-900/30">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* STEP 1: Name and Description */}
              {currentStep === 1 && (
                <div className="space-y-4 animate-in slide-in-from-right-3 duration-100 text-left">
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-slate-800 dark:text-white">
                      1. What concept or problem are you studying? *
                    </h4>
                    <p className="text-xs text-slate-400 font-medium pb-1">Enter a short, clear name you understand</p>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Memory closures in JavaScript"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-slate-205 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-sm font-semibold outline-none focus:border-blue-500 text-slate-905 dark:text-white"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-slate-800 dark:text-white">
                      2. Add Quick Notes (Optional)
                    </h4>
                    <p className="text-xs text-slate-400 font-medium pb-1">Great for study tips, formulas, or short reminders</p>
                    <input
                      type="text"
                      placeholder="e.g. Watch out for nested loops scoping variables dynamically..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-slate-205 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-955 text-sm font-semibold outline-none focus:border-blue-500 text-slate-905 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* STEP 2: Subject Path */}
              {currentStep === 2 && (
                <div className="space-y-4 animate-in slide-in-from-right-3 duration-100 text-left">
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-slate-800 dark:text-white">
                      3. Where does this belong? *
                    </h4>
                    <p className="text-xs text-slate-400 font-medium pb-2">Assign this checklist item to one of your learning folders</p>
                    
                    <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
                      {subtopics.map(sub => {
                        const parent = topics.find(t => t.id === sub.topicId);
                        const isSelected = subtopicId === sub.id;

                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => setSubtopicId(sub.id)}
                            className={`px-4 py-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between text-xs gap-3 ${
                              isSelected
                                ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-202 text-slate-705 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300'
                            }`}
                          >
                            <span className="truncate font-bold">
                              {parent ? `${parent.name} ➔ ` : ''}{sub.name}
                            </span>
                            {isSelected && <Check className="w-4 h-4 shrink-0 text-white" />}
                          </button>
                        );
                      })}

                      {subtopics.length === 0 && (
                        <p className="text-xs text-slate-400 py-3 italic">
                          Please create a topic and subtopic folder inside your main Topicshelf before linking!
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: Confidence & Achievements */}
              {currentStep === 3 && (
                <div className="space-y-5 animate-in slide-in-from-right-3 duration-100 text-left">
                  
                  {/* Status buttons */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-black text-slate-805 dark:text-white">
                      4. What is your current status?
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-3 pb-1">
                      {/* Toggling completion */}
                      <button
                        type="button"
                        onClick={() => {
                          setCompleted(!completed);
                          if (!completed) setStarted(true);
                        }}
                        className={`p-3.5 border rounded-2xl transition-all cursor-pointer text-center flex flex-col items-center gap-1.5 ${
                          completed 
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-400 font-extrabold shadow-xs' 
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-205 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        <Check className="w-5 h-5 text-emerald-500" />
                        <span className="text-xs">Done / Completed</span>
                      </button>

                      {/* Toggling revision */}
                      <button
                        type="button"
                        onClick={() => setRevised(!revised)}
                        className={`p-3.5 border rounded-2xl transition-all cursor-pointer text-center flex flex-col items-center gap-1.5 ${
                          revised 
                            ? 'bg-purple-500/10 border-purple-500 text-purple-700 dark:text-purple-300 font-extrabold shadow-xs' 
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-205 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        <RefreshCw className="w-5 h-5 text-purple-500" />
                        <span className="text-xs">Needs Revision</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 pt-1">
                      {/* Toggling Perfect */}
                      <button
                        type="button"
                        onClick={() => {
                          const nextPerfect = !isPerfect;
                          setIsPerfect(nextPerfect);
                          if (nextPerfect) {
                            setConfidence(100);
                            setCompleted(true);
                            setStarted(true);
                          }
                        }}
                        className={`p-3 border rounded-2xl transition-all cursor-pointer text-center flex items-center justify-center gap-2 ${
                          isPerfect 
                            ? 'bg-amber-400/10 border-amber-500 text-amber-600 dark:text-amber-400 font-extrabold shadow-xs' 
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-205 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        <Star className="w-5 h-5 fill-amber-400 text-amber-550" />
                        <span className="text-xs">Mark as Absolutely Perfected ⭐</span>
                      </button>
                    </div>
                  </div>

                  {/* Confidence Slider */}
                  <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-850 pt-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-black text-slate-805 dark:text-white">
                        5. How confident are you in this?
                      </h4>
                      <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                        {confidence}%
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                      Current Grade: <span className="text-blue-500 dark:text-blue-400">{getConfidenceLevel(confidence).label}</span>
                    </p>

                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={confidence}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setConfidence(val);
                        if (val === 100) {
                          setIsPerfect(true);
                          setCompleted(true);
                          setStarted(true);
                        } else {
                          setIsPerfect(false);
                        }
                      }}
                      className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-100 dark:bg-slate-800 rounded-lg"
                    />

                    <div className="flex justify-between text-[10px] text-slate-400 pt-1 font-mono uppercase font-black">
                      <span>Beginner (0%)</span>
                      <span>Novice (50%)</span>
                      <span>Guru (100%)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Wizard Nav Buttons on the footer */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="px-4 py-2.5 bg-slate-105 hover:bg-slate-200 text-slate-705 font-black rounded-xl text-xs transition-colors flex items-center gap-1 cursor-pointer dark:bg-slate-803 dark:text-slate-300"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                ) : (
                  <div />
                )}

                {currentStep < 3 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl text-xs transition-all flex items-center gap-1 cursor-pointer ml-auto"
                  >
                    <span>Next</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs transition-all flex items-center gap-1 cursor-pointer ml-auto"
                  >
                    <Check className="w-4 h-4" />
                    <span>{editingItem ? 'Save Changes' : 'Add to Tracker'}</span>
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clean deletion confirmation popup modal overlay */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-805 w-full max-w-sm shadow-2xl p-6 relative animate-in zoom-in-95 duration-120 text-center select-none">
            
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center text-rose-600 mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-rose-500" />
            </div>

            <h3 className="font-extrabold text-slate-905 dark:text-white text-base">
              Remove checklist item?
            </h3>
            <p className="text-xs text-slate-405 dark:text-slate-400 mt-2 font-medium leading-relaxed">
              Are you sure you want to remove <span className="font-bold text-slate-800 dark:text-slate-250">"{itemToDelete.title}"</span> from your study checklist? This cannot be undone.
            </p>

            <div className="flex gap-3 justify-center pt-5">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-4.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition-colors cursor-pointer dark:bg-slate-800 dark:text-slate-350"
              >
                No, cancel
              </button>

              <button
                type="button"
                onClick={confirmDeleteItem}
                className="px-5 py-2 rounded-xl bg-red-650 hover:bg-red-600 text-white font-black text-xs transition-colors cursor-pointer"
              >
                Yes, remove it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
