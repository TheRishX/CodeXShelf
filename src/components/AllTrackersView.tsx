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
  const [viewGrouping, setViewGrouping] = useState<'flat' | 'topic'>('topic');
  const [collapsedTopics, setCollapsedTopics] = useState<Record<string, boolean>>({});

  const handleInlineConfidenceChange = (itemId: string, newConf: number) => {
    const updated = trackers.map(t => {
      if (t.id === itemId) {
        return {
          ...t,
          confidence: newConf,
          isPerfect: newConf === 100,
          completed: newConf === 100 ? true : t.completed,
          started: newConf > 0 ? true : t.started
        };
      }
      return t;
    });
    onUpdateDb({ trackers: updated });
  };

  const handleToggleRevisionInline = (itemId: string) => {
    const updated = trackers.map(t => {
      if (t.id === itemId) {
        return {
          ...t,
          revised: !t.revised
        };
      }
      return t;
    });
    onUpdateDb({ trackers: updated });
  };

  const toggleTopicCollapse = (topicId: string) => {
    setCollapsedTopics(prev => ({
      ...prev,
      [topicId]: !prev[topicId]
    }));
  };

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

  // Encouragement dynamic message based on progress
  const getEncouragementMsg = () => {
    if (totalCount === 0) {
      return "Welcome to your study tracker! Create a few checklist items below to map out your study targets and boost your learning confidence.";
    }
    if (completionPercentage === 100) {
      return "Fantastic study run! You've achieved 100% completion across all targets. Keep up the high level of execution! 🎉";
    }
    if (completionPercentage >= 75) {
      return `You're virtually there! ${completionPercentage}% completed. Just a few more targets to complete mastery. Double down on your low-confidence items! 🏆`;
    }
    if (completionPercentage >= 40) {
      return `Building serious momentum! ${completedCount} accomplished trackers. Review your 'Revision Needed' items regularly to anchor memory! 🚀`;
    }
    return `Let's take it task by task. Every item checked is a step closer to deep engineering competence. Focus first on completing current starters! 💪`;
  };

  const renderTrackerCard = (tr: TrackerItem) => {
    const { sub, topic } = getSubtopicPath(tr.subtopicId);
    const confidenceInfo = getConfidenceLevel(tr.confidence || 0);

    return (
      <div
        key={tr.id}
        className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs relative overflow-hidden ${
          tr.completed 
            ? 'border-emerald-250 dark:border-emerald-950/80 bg-emerald-500/[0.01]' 
            : 'border-slate-200 dark:border-slate-800/80 hover:border-blue-400 dark:hover:border-slate-705/80 hover:shadow-md'
        }`}
      >
        {/* Topic Accent Bar */}
        {topic && (
          <div className="absolute top-0 bottom-0 left-0 w-1.5 transition-all" style={{ backgroundColor: topic.color }} />
        )}

        <div className="flex flex-1 items-start gap-4 min-w-0 pl-1.5 md:pl-0">
          {/* Custom Checkbox touch-target 44px */}
          <button
            type="button"
            onClick={() => handleSimpleToggleCompletion(tr.id)}
            className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-all border-2 cursor-pointer outline-none focus:ring-4 focus:ring-blue-500/20 ${
              tr.completed 
                ? 'bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-600 hover:border-emerald-600 scale-105 shadow-md' 
                : 'border-slate-300 dark:border-slate-750 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-350 hover:border-blue-400'
            }`}
            title={tr.completed ? "Mark incomplete" : "Mark as completed"}
          >
            {tr.completed ? (
              <Check className="w-5.5 h-5.5 stroke-[3.5]" />
            ) : (
              <div className="w-2.5 h-2.5 rounded-full bg-slate-350 dark:bg-slate-700" />
            )}
          </button>

          <div className="flex-1 min-w-0 text-left space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              {topic && sub ? (
                <button
                  onClick={() => onOpenSubtopic(topic.id, sub.id)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-slate-650 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 text-[10px] font-extrabold font-sans transition-all border border-slate-200/50 dark:border-slate-700/50 cursor-pointer"
                  title="Hop onto resources list"
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: topic.color }} />
                  <span>{topic.name}</span>
                  <span className="text-slate-400 dark:text-slate-600">➔</span>
                  <span className="font-extrabold">{sub.name}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>
              ) : (
                <span className="text-[9px] text-slate-400 uppercase font-mono tracking-wider bg-slate-50 dark:bg-slate-850 px-2 py-0.5 rounded">
                  General Target
                </span>
              )}

              {/* Status Tags */}
              {tr.isPerfect && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-400/15 text-amber-600 dark:text-amber-400 border border-amber-500/10 flex items-center gap-0.5 uppercase tracking-wider">
                  ⭐ Perfect
                </span>
              )}

              {tr.revised && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/20 uppercase tracking-wider">
                  🔄 Revised
                </span>
              )}

              <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase border border-transparent ${confidenceInfo.color}`}>
                {confidenceInfo.label}
              </span>
            </div>

            <h3 className={`text-sm sm:text-base font-extrabold tracking-tight text-slate-850 dark:text-white leading-snug transition-all ${tr.completed ? 'line-through opacity-50 text-slate-400' : ''}`}>
              {tr.title}
            </h3>

            {tr.notes && (
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold italic">
                💡 {tr.notes}
              </p>
            )}

            {/* Quick Self-Assessment Confidence sliders inside the card */}
            <div className="pt-2">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-extrabold font-mono shrink-0">Click Score Self-Assess:</span>
                <div className="flex items-center gap-1.5">
                  {[20, 50, 80, 100].map(val => {
                    const isSelectedVal = tr.confidence === val;
                    let pillStyle = "bg-slate-50 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-850 hover:border-slate-350 dark:hover:border-slate-700 border-slate-200 dark:border-slate-850";
                    if (isSelectedVal) {
                      if (val <= 20) pillStyle = "bg-rose-500 text-white border-rose-500 shadow-xs";
                      else if (val <= 50) pillStyle = "bg-amber-500 text-white border-amber-500 shadow-xs";
                      else if (val <= 80) pillStyle = "bg-blue-600 text-white border-blue-600 shadow-xs";
                      else pillStyle = "bg-emerald-600 text-white border-emerald-600 shadow-xs";
                    }
                    return (
                      <button
                        type="button"
                        key={val}
                        onClick={() => handleInlineConfidenceChange(tr.id, val)}
                        className={`px-2.5 py-0.5 text-[10px] font-black font-mono tracking-wide rounded-md border cursor-pointer transition-all hover:scale-105 active:scale-95 ${pillStyle}`}
                      >
                        {val}% {val === 100 ? '🏆' : ''}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions side */}
        <div className="flex items-center gap-1.5 md:self-center justify-end w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800/60 pl-1.5 md:pl-0 shrink-0">
          <button
            type="button"
            onClick={() => handleToggleRevisionInline(tr.id)}
            className={`p-2 border rounded-xl transition-all cursor-pointer ${
              tr.revised 
                ? 'bg-purple-500/10 border-purple-400 text-purple-600 dark:text-purple-400' 
                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-400 hover:text-slate-650'
            }`}
            title="Toggle Revision Need"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => handleOpenEdit(tr)}
            className="px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 rounded-xl text-xs font-bold text-slate-605 dark:text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Configure settings"
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-400" />
            <span>Configure</span>
          </button>

          <button
            type="button"
            onClick={() => handleDeleteItem(tr.id)}
            className="p-2 border border-transparent hover:border-red-200 dark:hover:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl text-slate-350 hover:text-red-500 transition-all cursor-pointer"
            title="Remove item"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  // Find a suggested spotlight item that is waiting / incomplete with low confidence
  const recommendedFocusItem = filteredTrackers.find(tr => !tr.completed && !tr.isPerfect) || filteredTrackers.find(tr => tr.confidence < 85);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-150 text-left">
      
      {/* Header and Greeting Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 dark:from-slate-900/60 dark:to-indigo-950/15 p-6 md:p-8 rounded-3xl border border-blue-150/40 dark:border-slate-800/80 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-1.5">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
              <ClipboardCheck className="w-8 h-8 text-blue-600 dark:text-blue-500 shrink-0" />
              <span>Syllabus Progress Tracker</span>
            </h2>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
              {getEncouragementMsg()}
            </p>
          </div>

          <div>
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-sm rounded-2xl transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
              <span>Add Checklist Target</span>
            </button>
          </div>
        </div>
        
        {/* Progress horizontal status track */}
        <div className="mt-6 pt-5 border-t border-blue-150/30 dark:border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-xs font-black text-slate-400 dark:text-slate-500 uppercase font-mono mb-1.5">
              <span>Overall Track Record</span>
              <span className="text-blue-600 dark:text-blue-400">{completionPercentage}% Completed</span>
            </div>
            <div className="w-full bg-slate-200/60 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-blue-600 dark:bg-blue-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
          
          <div className="flex gap-4 sm:pl-6 text-center select-none font-sans shrink-0">
            <div>
              <span className="text-xl font-black text-slate-850 dark:text-white block leading-none">{completedCount}</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wide">Achieved</span>
            </div>
            <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800 align-middle self-center" />
            <div>
              <span className="text-xl font-black text-slate-850 dark:text-white block leading-none">{startedCount}</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wide">In Progress</span>
            </div>
            <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800 align-middle self-center" />
            <div>
              <span className="text-xl font-black text-slate-850 dark:text-white block leading-none">{notStartedCount}</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wide">To-Do</span>
            </div>
          </div>
        </div>
      </div>

      {/* Suggested Focus Target Spotlight Card (so they always know what they are doing and what's next!) */}
      {recommendedFocusItem && (
        <div className="bg-amber-400/[0.03] dark:bg-amber-400/[0.01] border-2 border-dashed border-amber-300 dark:border-amber-950 p-5 rounded-3xl relative overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="absolute top-2 right-2 flex items-center gap-0.5 text-amber-500 bg-amber-100/40 dark:bg-amber-950/20 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider font-mono">
            <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
            <span>Recommended Core Focus</span>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
            <div className="space-y-1.5 md:max-w-2xl">
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping inline-block mr-1" />
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-mono font-black uppercase tracking-wide">Your next step</span>
              </div>
              <h4 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                {recommendedFocusItem.title}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                You currently record a confidence score of <span className="font-bold text-amber-600 dark:text-amber-400">{recommendedFocusItem.confidence}%</span>. 
                Keep practicing this concept to build bulletproof familiarity! Tweak your self-assess rating inline or tap open to look up subtopic source notes.
              </p>
            </div>
            
            <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
              <button
                type="button"
                onClick={() => handleSimpleToggleCompletion(recommendedFocusItem.id)}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Mark Completed</span>
              </button>
              
              {/* Quickly trigger opening matching subtopic */}
              {(() => {
                const { sub, topic } = getSubtopicPath(recommendedFocusItem.subtopicId);
                if (topic && sub) {
                  return (
                    <button
                      onClick={() => onOpenSubtopic(topic.id, sub.id)}
                      className="px-3.5 py-2.5 border border-amber-500/20 bg-white dark:bg-slate-900 hover:bg-amber-400/5 text-amber-600 dark:text-amber-400 font-bold text-xs rounded-xl shadow-2xs transition-colors flex items-center gap-1"
                    >
                      <span>Study Notes ➔</span>
                    </button>
                  );
                }
                return null;
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Control Actions bar: Search, Filter Category, & Group Folders Toggler */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row justify-between gap-4 items-stretch lg:items-center shadow-xs">
        {/* Simple search bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Type code, keywords, folder name, or specific subject..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 rounded-xl text-sm placeholder-slate-400 font-semibold focus:outline-none focus:border-blue-500 focus:bg-white text-slate-850 dark:text-white"
          />
        </div>

        {/* Big drop-down selectors & buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-850">
            <button
              onClick={() => setViewGrouping('topic')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewGrouping === 'topic'
                  ? 'bg-white dark:bg-slate-850 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-450'
              }`}
              title="Organize into subject boards"
            >
              <span>📁 Folders</span>
            </button>
            <button
              onClick={() => setViewGrouping('flat')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewGrouping === 'flat'
                  ? 'bg-white dark:bg-slate-850 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-450'
              }`}
              title="Stream layout"
            >
              <span>📋 Flat List</span>
            </button>
          </div>

          <select
            value={selectedTopicId}
            onChange={(e) => setSelectedTopicId(e.target.value)}
            className="px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none"
          >
            <option value="all">📚 All Subjects</option>
            {topics.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          {/* Simple state filters (All, To-Do, Doing, Done) */}
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
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === option
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Checklist Card List Canvas */}
      <div className="space-y-4">
        {(() => {
          if (filteredTrackers.length === 0) {
            return (
              <div className="py-20 text-center border-2 border-dashed border-slate-200 dark:border-slate-850 rounded-3xl bg-slate-50/20 dark:bg-transparent">
                <AlertCircle className="w-11 h-11 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <h4 className="text-slate-800 dark:text-slate-300 font-extrabold text-sm mb-1">
                  Your tracking checklist is clear!
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Adjust your search keyword, subject filter, or click "+ Add Checklist Target" to specify a study target.
                </p>
              </div>
            );
          }

          // Case A: Grouped Folder Tree rendering (Satisfies clear visual progress per subject)
          if (viewGrouping === 'topic') {
            // Group trackers by topic
            const groupedMap: Record<string, TrackerItem[]> = {};
            filteredTrackers.forEach(tr => {
              const { topic } = getSubtopicPath(tr.subtopicId);
              const parentId = topic?.id || '_general';
              if (!groupedMap[parentId]) {
                groupedMap[parentId] = [];
              }
              groupedMap[parentId].push(tr);
            });

            // Order: topics matching topics list first, general/misc at end
            const folderIds = topics
              .map(t => t.id)
              .filter(id => id in groupedMap);
            
            if (groupedMap['_general']) {
              folderIds.push('_general');
            }

            return (
              <div className="space-y-4 select-none">
                {folderIds.map(folderId => {
                  const items = groupedMap[folderId];
                  const isGeneral = folderId === '_general';
                  const topicObj = isGeneral ? null : topics.find(t => t.id === folderId);
                  
                  const isCollapsed = !!collapsedTopics[folderId];
                  
                  // Calculate group metrics
                  const groupTotalCount = items.length;
                  const groupCompletedCount = items.filter(x => x.completed).length;
                  const groupAvgConfidence = Math.round(items.reduce((acc, x) => acc + (x.confidence || 0), 0) / groupTotalCount);
                  const groupPercentRatio = Math.round((groupCompletedCount / groupTotalCount) * 100);

                  return (
                    <div 
                      key={folderId} 
                      className="border border-slate-200 dark:border-slate-800/80 rounded-2xl bg-white dark:bg-slate-950 overflow-hidden"
                    >
                      {/* Collapsible folder header bar */}
                      <button
                        type="button"
                        onClick={() => toggleTopicCollapse(folderId)}
                        className="w-full px-5 py-4 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-50 dark:hover:bg-slate-900 border-b border-slate-100 dark:border-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left transition-all cursor-pointer outline-none focus:bg-slate-100/50 dark:focus:bg-slate-900"
                      >
                        <div className="flex items-center gap-3">
                          {topicObj ? (
                            <div 
                              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black bg-slate-100 dark:bg-slate-900 shrink-0 border"
                              style={{ borderColor: topicObj.color + '22', color: topicObj.color }}
                            >
                              <span>{topicObj.icon || '📁'}</span>
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black bg-slate-100 dark:bg-slate-900 text-slate-550 border shrink-0">
                              <span>📂</span>
                            </div>
                          )}

                          <div>
                            <h4 className="font-black text-slate-850 dark:text-white text-sm tracking-tight flex items-center gap-2">
                              <span>{topicObj ? topicObj.name : 'General Extra targets'}</span>
                              <span className="text-[11px] font-bold text-slate-400 font-sans border rounded-lg px-2 py-0.5 bg-slate-100 dark:bg-slate-950">
                                {groupCompletedCount}/{groupTotalCount} Done
                              </span>
                            </h4>
                            <p className="text-xs text-slate-400 mt-0.5">
                              Subject Track Rate: <span className="font-extrabold text-blue-600 dark:text-blue-400">{groupPercentRatio}%</span> • Avg Confidence: <span className="font-extrabold text-amber-550">{groupAvgConfidence}%</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 self-end sm:self-center">
                          {/* Folder progress horizontal bar */}
                          <div className="w-24 bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden shrink-0 hidden sm:block">
                            <div 
                              className="h-full rounded-full transition-all duration-300"
                              style={{ 
                                width: `${groupPercentRatio}%`,
                                backgroundColor: topicObj ? topicObj.color : '#3b82f6' 
                              }}
                            />
                          </div>

                          <div className="text-slate-400 text-xs font-semibold flex items-center gap-1 uppercase select-none font-mono">
                            <span>{isCollapsed ? 'Expand ➔' : 'Collapse'}</span>
                            <span className="text-[10px]">{isCollapsed ? '▼' : '▲'}</span>
                          </div>
                        </div>
                      </button>

                      {/* Folder Items Container */}
                      {!isCollapsed && (
                        <div className="p-4 space-y-3 bg-slate-50/10 dark:bg-transparent">
                          {items.map(tr => renderTrackerCard(tr))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          }

          // Case B: Flat checklist rendering stream
          return (
            <div className="space-y-3 select-none">
              {filteredTrackers.map(tr => renderTrackerCard(tr))}
            </div>
          );
        })()}
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
                      value={title || ''}
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
                      value={notes || ''}
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
