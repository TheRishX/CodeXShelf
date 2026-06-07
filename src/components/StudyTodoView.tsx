import React, { useState } from 'react';
import { 
  Sparkles, CheckCircle2, Circle, Trash2, BrainCircuit, 
  Lightbulb, HelpCircle, FileText, Bookmark, BookOpen, Star, 
  Plus, Flame, ClipboardList, PenTool, CheckSquare, X, Info, Zap, ChevronDown, ChevronRight
} from 'lucide-react';
import { DatabaseState, StudyTodoItem } from '../types';

interface StudyTodoViewProps {
  dbState: DatabaseState;
  onUpdateDb: (updates: Partial<DatabaseState>) => void;
  onOpenSubtopic?: (topicId: string, subtopicId: string) => void;
  onBackToDashboard: () => void;
}

interface TagConfig {
  id: StudyTodoItem['category'];
  label: string;
  emoji: string;
  description: string;
  colorClass: string;
  badgeClass: string;
}

const PSYCHOLOGICAL_TAGS: TagConfig[] = [
  {
    id: 'active_recall',
    label: '🧠 Deep Focus Recall',
    emoji: '🧠',
    description: 'High-effort retrieval practice. Blocks all distractions to forge cognitive paths.',
    colorClass: 'from-amber-500/10 to-orange-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400',
    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
  },
  {
    id: 'coding_practice',
    label: '⚡ Low-Friction Sprint',
    emoji: '⚡',
    description: 'Quick 15-minute execution to get started immediately and break procrastination.',
    colorClass: 'from-emerald-500/10 to-teal-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
  },
  {
    id: 'blind_spot_clarify',
    label: '🔬 Blindspot Purge',
    emoji: '🔬',
    description: 'Surgical deep dive into tricky topics or concepts you are currently avoiding.',
    colorClass: 'from-rose-500/10 to-pink-500/10 border-rose-500/20 text-rose-600 dark:text-rose-450',
    badgeClass: 'bg-rose-500/10 text-rose-650 dark:text-rose-400 border border-rose-500/20'
  },
  {
    id: 'revision',
    label: '🔄 Spaced Recall Interval',
    emoji: '🔄',
    description: 'Reviewing previously learned cards to interrupt the forgetting curve.',
    colorClass: 'from-indigo-500/10 to-blue-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400',
    badgeClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
  },
  {
    id: 'concept_synthesize',
    label: '🎯 Feynman Synthesis',
    emoji: '🎯',
    description: 'Explaining a complex core architectural principle in humble, simple terms.',
    colorClass: 'from-sky-500/10 to-cyan-500/10 border-sky-500/20 text-sky-600 dark:text-sky-400',
    badgeClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20'
  }
];

export function StudyTodoView({ dbState, onUpdateDb, onBackToDashboard }: StudyTodoViewProps) {
  const todos = dbState.todos || [];
  
  // Modal State representation
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [selectedTag, setSelectedTag] = useState<StudyTodoItem['category']>('active_recall');
  
  // Local active animations / visual feedback
  const [celebrationMsg, setCelebrationMsg] = useState<string | null>(null);
  const [showCompletedList, setShowCompletedList] = useState(false);

  const activeTodos = todos.filter(t => t.status !== 'completed');
  const completedTodos = todos.filter(t => t.status === 'completed');

  const handleOpenModal = () => {
    setNewTodoTitle('');
    // Auto default to a tag or random tag for delight
    const randomTag = PSYCHOLOGICAL_TAGS[Math.floor(Math.random() * PSYCHOLOGICAL_TAGS.length)].id;
    setSelectedTag(randomTag);
    setIsModalOpen(true);
  };

  const handleCreateTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoTitle.trim()) return;

    // Under-the-hood map simple details back into standard StudyTodoItem schema
    const newTodo: StudyTodoItem = {
      id: `todo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: newTodoTitle.trim(),
      category: selectedTag,
      priority: selectedTag === 'blind_spot_clarify' ? 'critical_blocker' : 'learning_milestone',
      status: 'todo',
      createdAt: new Date().toISOString()
    };

    onUpdateDb({
      todos: [newTodo, ...todos]
    });

    setIsModalOpen(false);
    
    // Quick celebration
    setCelebrationMsg("🚀 Study commitment loaded to neural core!");
    setTimeout(() => setCelebrationMsg(null), 3050);
  };

  const handleToggleComplete = (todoId: string, currentStatus: StudyTodoItem['status']) => {
    const isNowCompleting = currentStatus !== 'completed';
    
    const updated = todos.map(t => {
      if (t.id === todoId) {
        return {
          ...t,
          status: (isNowCompleting ? 'completed' : 'todo') as StudyTodoItem['status'],
          completedAt: isNowCompleting ? new Date().toISOString() : undefined
        };
      }
      return t;
    });

    onUpdateDb({ todos: updated });

    if (isNowCompleting) {
      setCelebrationMsg("🎉 Retention reinforced! Streak entry logged!");
      setTimeout(() => setCelebrationMsg(null), 3500);
    }
  };

  const handleDeleteTodo = (todoId: string) => {
    onUpdateDb({
      todos: todos.filter(t => t.id !== todoId)
    });
  };

  const activeTagDetails = PSYCHOLOGICAL_TAGS.find(t => t.id === selectedTag) || PSYCHOLOGICAL_TAGS[0];

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-200">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-205 dark:border-slate-800 pb-5">
        <div className="text-left">
          <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest font-mono">
            Focus & Spacing Portal
          </p>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1 tracking-tight font-sans">
            Study Commitments
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl font-sans">
            Set simple, high-reward learning targets. Checking them off directly protects your retention matrix.
          </p>
        </div>

        <button
          onClick={onBackToDashboard}
          className="px-4 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer font-mono shadow-3xs"
          id="study-todos-back-btn"
        >
          ➔ CORE BOARD
        </button>
      </div>

      {/* Floating alert banner for psychological delight */}
      {celebrationMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 font-bold text-xs p-4 rounded-2xl shadow-xl flex items-center gap-2.5 animate-bounce font-sans border border-slate-800 dark:border-slate-300">
          <Sparkles className="w-4.5 h-4.5 text-amber-400" />
          <span>{celebrationMsg}</span>
        </div>
      )}

      {/* Primary Call to Action Module (Central Bento Grid Anchor) */}
      <div className="bg-slate-900 text-slate-100 rounded-3xl border border-slate-800 p-6 md:p-8 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-md text-left">
        <div className="absolute right-4 top-4 flex items-center gap-1 select-none opacity-20">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <div className="w-2 h-2 rounded-full bg-orange-500" />
        </div>

        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-1.5 text-amber-400 font-mono text-[10px] font-bold uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            <span>Psychology of Micro-Commitments</span>
          </div>
          <h3 className="text-xl font-extrabold text-white leading-snug tracking-tight font-sans">
            Starting is the hardest part. Defeat resistance with one simple goal.
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed font-sans">
            Commit to just 15 minutes of hyper-focused energy. Research shows once you begin a micro-target, complete task completion rates skyrocket by up to 80% due to the Zeigarnik momentum loop.
          </p>
        </div>

        <button
          onClick={handleOpenModal}
          className="px-6 py-4 rounded-xl bg-gradient-to-r from-amber-505 to-orange-505 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider select-none hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md flex items-center gap-2 cursor-pointer text-center whitespace-nowrap self-stretch md:self-auto justify-center"
          id="trigger-psychology-goal-btn"
        >
          <Plus className="w-5 h-5 stroke-[3px]" />
          <span>Commit To A New Goal</span>
        </button>
      </div>

      {/* Main Goal Canvas */}
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Active commitments board */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 text-[10px] font-mono font-bold tracking-wider">
            <span>ACTIVE STUDY COMMITMENTS ({activeTodos.length})</span>
            <span>INTENSITY PILL</span>
          </div>

          {activeTodos.length === 0 ? (
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 p-8 rounded-2xl text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto">
                <ClipboardList className="w-5 h-5" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                No active goals loaded.
              </p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto font-sans">
                Set a tiny, beautiful commitment today to increase focus and keep your daily learning streak alive!
              </p>
              <button
                onClick={handleOpenModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-300 dark:border-slate-700 hover:border-amber-500 dark:hover:border-amber-500 text-slate-700 dark:text-slate-300 hover:text-amber-500 dark:hover:text-amber-400 text-xs font-bold rounded-lg transition-all cursor-pointer font-sans"
              >
                <span>🚀 Set Your First Target</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {activeTodos.map(todo => {
                const tagConfig = PSYCHOLOGICAL_TAGS.find(pt => pt.id === todo.category) || PSYCHOLOGICAL_TAGS[0];
                return (
                  <div 
                    key={todo.id}
                    className="flex items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-905 hover:border-slate-305 dark:hover:border-slate-750 transition-all hover:translate-x-0.5"
                  >
                    <div className="flex items-center gap-3 text-left">
                      <button
                        onClick={() => handleToggleComplete(todo.id, todo.status)}
                        className="text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 transition-colors pointer-cursor"
                        title="Mark goal as consolidated"
                      >
                        <Circle className="w-5.5 h-5.5 stroke-[1.5px]" />
                      </button>
                      <div>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug font-sans break-all max-w-[280px] sm:max-w-md block">
                          {todo.title}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[9px] font-black uppercase font-mono tracking-tight px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-405`}>
                            {todo.category.replace('_', ' ')}
                          </span>
                          <span className="text-[9px] text-slate-400 font-sans">
                            Added {new Date(todo.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-mono font-bold uppercase tracking-wide px-2.5 py-1 rounded-full shrink-0 ${tagConfig.badgeClass}`}>
                        {tagConfig.label}
                      </span>
                      <button
                        onClick={() => handleDeleteTodo(todo.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Delete target"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Beautiful completed collapsible section */}
        {completedTodos.length > 0 && (
          <div className="border border-slate-205 dark:border-slate-800/80 rounded-2xl bg-slate-50/50 dark:bg-slate-900/10 overflow-hidden">
            <button
              onClick={() => setShowCompletedList(!showCompletedList)}
              className="w-full flex items-center justify-between p-4 text-left font-mono text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 select-none"
            >
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>COMPLETED AND CONSOLIDATED GOALS ({completedTodos.length})</span>
              </span>
              {showCompletedList ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>

            {showCompletedList && (
              <div className="border-t border-slate-200 dark:border-slate-800 p-2.5 space-y-2 max-h-60 overflow-y-auto">
                {completedTodos.map(todo => {
                  const tagConfig = PSYCHOLOGICAL_TAGS.find(pt => pt.id === todo.category) || PSYCHOLOGICAL_TAGS[0];
                  return (
                    <div 
                      key={todo.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-white/70 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-850"
                    >
                      <div className="flex items-center gap-2.5 text-left shrink-0">
                        <button
                          onClick={() => handleToggleComplete(todo.id, todo.status)}
                          className="text-emerald-500 hover:text-slate-400 transition-colors pointer-cursor"
                          title="Restore target"
                        >
                          <CheckCircle2 className="w-5 h-5" />
                        </button>
                        <span className="text-xs font-bold line-through text-slate-400 dark:text-slate-500 font-sans max-w-sm break-all">
                          {todo.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[8px] font-mono font-bold px-2 py-0.5 rounded-full ${tagConfig.badgeClass} opacity-60`}>
                          {tagConfig.emoji} {todo.category.toUpperCase().replace('_', ' ')}
                        </span>
                        <button
                          onClick={() => handleDeleteTodo(todo.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-500 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* FLOATING POP-UP MODAL (User Requested Feature) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop blur effect */}
          <div 
            onClick={() => setIsModalOpen(false)}
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity duration-300"
          />

          {/* Modal Container */}
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 md:p-8 animate-in zoom-in-95 duration-150 text-left space-y-6">
            
            {/* Close button top right */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 p-1.5 rounded-xl hover:bg-slate-105 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Title */}
            <div className="space-y-1">
              <span className="text-[10px] font-black text-amber-500 font-mono uppercase tracking-widest block">
                🧠 Load Study Objective
              </span>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Declare Your Intention
              </h3>
              <p className="text-xs text-slate-400">
                A simple study commitment clears procrastination and primes neural pathways.
              </p>
            </div>

            {/* Core Form */}
            <form onSubmit={handleCreateTodo} className="space-y-5">
              
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 font-mono uppercase">
                  WHAT ARE YOU LEARNING OR CONQUERING TODAY?
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Master React hooks, write double-linked list, review Closures cards..."
                  value={newTodoTitle}
                  onChange={(e) => setNewTodoTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 text-sm font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400/85 p-4 rounded-xl border border-slate-200 dark:border-slate-800 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all font-sans"
                />
              </div>

              {/* Psychological intention selector */}
              <div className="space-y-2.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 font-mono uppercase">
                  CHOOSE PSYCHOLOGICAL METHODOLOGY
                </label>
                
                {/* Horizontal scroll tags list */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PSYCHOLOGICAL_TAGS.map(tag => {
                    const isSelected = selectedTag === tag.id;
                    return (
                      <button
                        type="button"
                        key={tag.id}
                        onClick={() => setSelectedTag(tag.id)}
                        className={`p-3 rounded-xl border text-left transition-all relative select-none cursor-pointer flex flex-col justify-between h-20 ${
                          isSelected 
                            ? 'bg-slate-900 dark:bg-slate-100 border-slate-900 dark:border-slate-100 text-white dark:text-slate-950 shadow-3xs hover:scale-[1.01]'
                            : 'bg-slate-50 dark:bg-slate-955 border-slate-200 dark:border-slate-850 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-350'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-bold leading-tight truncate">
                            {tag.label}
                          </span>
                          {isSelected && (
                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                          )}
                        </div>
                        <span className={`text-[9px] font-sans mt-1 leading-tight ${isSelected ? 'text-slate-300 dark:text-slate-600' : 'text-slate-400'}`}>
                          {tag.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tag explanation info board */}
              <div className={`p-4 rounded-xl border flex gap-3 text-left transition-colors bg-gradient-to-r ${activeTagDetails.colorClass}`}>
                <Info className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="text-xs font-extrabold uppercase font-mono tracking-wider">
                    {activeTagDetails.label}
                  </p>
                  <p className="text-[11px] leading-relaxed font-sans font-medium opacity-90">
                    {activeTagDetails.description}
                  </p>
                </div>
              </div>

              {/* Submit CTA button */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 text-xs font-bold font-mono transition-all cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold font-mono tracking-wider uppercase transition-all shadow-md select-none cursor-pointer flex items-center gap-1.5"
                  id="modal-todo-submit-btn"
                >
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                  <span>Commit Intent ➔</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
