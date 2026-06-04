import React, { useState } from 'react';
import { 
  Award, Sparkles, Plus, Search, Trash2, ExternalLink, FileText, Globe, 
  Calendar, Flame, CheckCircle2, TrendingUp, X, Check, Edit3, HelpCircle,
  FileCode, Zap, BrainCircuit, Trophy, Star, LayoutGrid, List, Menu
} from 'lucide-react';
import { DatabaseState, AssignmentItem } from '../types';

interface AllAssignmentsViewProps {
  dbState: DatabaseState;
  onUpdateDb: (updates: Partial<DatabaseState>) => void;
}

export function AllAssignmentsView({ dbState, onUpdateDb }: AllAssignmentsViewProps) {
  const assignments = dbState.assignments || [];

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'compact'>('grid');
  
  // Creation modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [paperUrl, setPaperUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [status, setStatus] = useState<AssignmentItem['status']>('Awaiting Solution');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Editing state
  const [editingItem, setEditingItem] = useState<AssignmentItem | null>(null);

  // Motivational quote based on completion metrics
  const total = assignments.length;
  const completedCount = assignments.filter(a => a.status === 'Completed' || a.status === 'Perfected').length;
  const perfectedCount = assignments.filter(a => a.status === 'Perfected').length;
  const inProgressCount = assignments.filter(a => a.status === 'In Progress').length;
  const awaitingCount = assignments.filter(a => a.status === 'Awaiting Solution').length;

  const scorePct = total > 0 ? Math.round(((completedCount * 0.7 + perfectedCount * 0.3) / total) * 100) : 0;

  // Psychological coaching prompts
  let brainSlogan = "Synchronizing conceptual foundations with logical execution paths.";
  if (scorePct >= 80) {
    brainSlogan = "Elite comprehension levels achieved! Your cerebral matrix has consolidated these skills permanently.";
  } else if (scorePct >= 40) {
    brainSlogan = "Neurons are firing rapidly. Each solved challenge creates durable myelination layers around critical concepts.";
  } else if (awaitingCount > 0) {
    brainSlogan = "Unresolved quests detected. Prime your working memory, dive into the paper references, and start coding!";
  }

  // Handle addition
  const handleAddAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Assignment Quest name is required.');
      return;
    }

    const newAssignment: AssignmentItem = {
      id: `assignment-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      paperUrl: paperUrl.trim(),
      websiteUrl: websiteUrl.trim(),
      status,
      notes: notes.trim(),
      createdAt: new Date().toISOString()
    };

    onUpdateDb({
      assignments: [...assignments, newAssignment]
    });

    // Reset fields
    setTitle('');
    setDescription('');
    setPaperUrl('');
    setWebsiteUrl('');
    setStatus('Awaiting Solution');
    setNotes('');
    setErrorMsg('');
    setIsModalOpen(false);
  };

  // Handle Editing Save
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const updated = assignments.map(a => {
      if (a.id === editingItem.id) {
        return {
          ...a,
          title: editingItem.title.trim(),
          description: editingItem.description.trim(),
          paperUrl: editingItem.paperUrl.trim(),
          websiteUrl: editingItem.websiteUrl.trim(),
          status: editingItem.status,
          notes: editingItem.notes?.trim()
        };
      }
      return a;
    });

    onUpdateDb({ assignments: updated });
    setEditingItem(null);
  };

  // Change individual card status directly
  const handleChangeStatus = (id: string, nextStatus: AssignmentItem['status']) => {
    const updated = assignments.map(a => {
      if (a.id === id) {
        return { ...a, status: nextStatus };
      }
      return a;
    });
    onUpdateDb({ assignments: updated });
  };

  const handleDeleteItem = (id: string) => {
    const updated = assignments.filter(a => a.id !== id);
    onUpdateDb({ assignments: updated });
  };

  // Filter items matching search bar & filter selectors
  const filtered = assignments.filter(item => {
    const matchSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        item.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        (item.notes || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'all' || item.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-250">
      
      {/* Dynamic Psychologically Stimulating Heading & Stats Dashboard */}
      <div className="bg-linear-to-r from-rose-500/10 via-amber-500/5 to-emerald-500/5 dark:from-rose-500/5 dark:via-amber-550/5 dark:to-emerald-500/5 border border-rose-250/30 dark:border-rose-900/15 p-6 rounded-2xl relative overflow-hidden shadow-xs">
        {/* Floating gradient circles */}
        <div className="absolute right-0 top-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-12 bottom-0 w-24 h-24 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1 px-2.5 rounded-full bg-rose-500/10 dark:bg-rose-500/15 text-rose-650 dark:text-rose-450 font-bold font-mono tracking-wider text-[10px] uppercase inline-flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                Dopamine Loop Engine
              </span>
              <span className="p-1 px-2.5 rounded-full bg-blue-500/10 dark:bg-blue-500/15 text-blue-650 dark:text-blue-400 font-bold font-mono tracking-wider text-[10px] uppercase">
                Active Retrieval
              </span>
            </div>
            
            <h2 className="text-2xl font-bold font-sans text-slate-800 dark:text-white tracking-tight">
              Assignments Mission Control
            </h2>
            <p className="text-sm text-slate-550 dark:text-slate-400 max-w-xl mt-2 leading-relaxed">
              {brainSlogan}
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {/* Round Synaptic Meter */}
            <div className="flex items-center gap-3.5 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md px-4 py-3 rounded-xl border border-rose-200/50 dark:border-rose-950/40 shadow-xs">
              <div className="relative flex items-center justify-center">
                <svg className="w-12 h-12 transform -rotate-90">
                  <circle cx="24" cy="24" r="20" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="3" fill="transparent" />
                  <circle cx="24" cy="24" r="20" stroke="currentColor" className="text-rose-500 transition-all duration-500" strokeWidth="3.5" fill="transparent"
                    strokeDasharray={125.6}
                    strokeDashoffset={125.6 - (125.6 * scorePct) / 100}
                    strokeLinecap="round" />
                </svg>
                <span className="absolute text-[11px] font-mono font-bold text-slate-800 dark:text-white">{scorePct}%</span>
              </div>
              <div>
                <span className="block text-[10px] font-mono text-slate-400 tracking-wider uppercase font-bold">Synapse Map Rate</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {completedCount}/{total} Solved
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-3 bg-rose-600 hover:bg-rose-500 active:scale-98 text-white rounded-xl text-xs font-bold font-mono tracking-wider uppercase shadow-md transition-all flex items-center gap-2 cursor-pointer select-none"
              id="btn-add-assignment"
            >
              <Plus className="w-4.5 h-4.5" />
              <span>New Quest</span>
            </button>
          </div>
        </div>

        {/* Dynamic Metrics Cards Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-rose-200/40 dark:border-rose-900/10">
          <div className="bg-slate-50/50 dark:bg-slate-900/20 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/50">
            <span className="text-[10px] font-mono tracking-wider text-slate-400 block uppercase font-bold mb-1">Total Assignments</span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold text-slate-800 dark:text-white font-mono">{total}</span>
              <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded font-mono font-bold">QUESTS</span>
            </div>
          </div>

          <div className="bg-amber-50/50 dark:bg-amber-950/10 p-3.5 rounded-xl border border-amber-200/20 dark:border-amber-900/10">
            <span className="text-[10px] font-mono tracking-wider text-amber-500 block uppercase font-bold mb-1">Awaiting Solution</span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">{awaitingCount}</span>
              <span className="text-[9px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded font-mono font-bold">AWAITING</span>
            </div>
          </div>

          <div className="bg-rose-50/40 dark:bg-rose-950/10 p-3.5 rounded-xl border border-rose-200/20 dark:border-rose-900/10">
            <span className="text-[10px] font-mono tracking-wider text-rose-500 block uppercase font-bold mb-1">In Processing</span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold text-rose-600 dark:text-rose-450 font-mono">{inProgressCount}</span>
              <span className="text-[9px] bg-rose-500/10 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded font-mono font-bold">FIRING</span>
            </div>
          </div>

          <div className="bg-emerald-50/40 dark:bg-emerald-950/10 p-3.5 rounded-xl border border-emerald-250/20 dark:border-emerald-900/10">
            <span className="text-[10px] font-mono tracking-wider text-emerald-555 block uppercase font-bold mb-1">Mastery Complete</span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">{completedCount}</span>
              <span className="text-[9px] bg-emerald-550/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-mono font-bold">PERFECTED</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Search/Filters controls */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white dark:bg-slate-900/30 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search details, papers, notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-205 dark:border-slate-800 bg-white dark:bg-gray-950 text-gray-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto shrink-0">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold font-mono tracking-wider text-slate-400 uppercase hidden md:inline">Filter:</span>
            <div className="grid grid-cols-4 gap-1 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-850">
              {['all', 'Awaiting Solution', 'In Progress', 'Completed'].map((opt) => (
                <button
                  key={opt}
                  onClick={() => setFilterStatus(opt)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                    filterStatus === opt
                      ? 'bg-white dark:bg-slate-850 text-rose-600 dark:text-rose-400 shadow-2xs font-extrabold'
                      : 'text-slate-450 dark:text-slate-500 hover:text-slate-705 dark:hover:text-slate-300'
                  }`}
                >
                  {opt === 'all' ? 'All' : opt === 'Awaiting Solution' ? 'Awaiting' : opt === 'In Progress' ? 'Active' : 'Solved'}
                </button>
              ))}
            </div>
          </div>

          {/* Visual Divider on desktop */}
          <div className="hidden sm:block h-6 w-[1px] bg-slate-200 dark:bg-slate-800" />

          {/* View Layout Switcher */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold font-mono tracking-wider text-slate-400 uppercase hidden lg:inline">Layout:</span>
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-850">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-850 text-rose-600 dark:text-rose-400 shadow-2xs font-extrabold'
                    : 'text-slate-450 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
                title="Grid Layout"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-slate-850 text-rose-600 dark:text-rose-400 shadow-2xs font-extrabold'
                    : 'text-slate-450 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
                title="List Layout"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('compact')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'compact'
                    ? 'bg-white dark:bg-slate-850 text-rose-600 dark:text-rose-400 shadow-2xs font-extrabold'
                    : 'text-slate-450 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
                title="Compact Layout"
              >
                <Menu className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quest grid/list/compact listing */}
      <div className={
        viewMode === 'grid'
          ? "grid grid-cols-1 md:grid-cols-2 gap-6"
          : viewMode === 'list'
            ? "flex flex-col gap-6"
            : "flex flex-col gap-3"
      }>
        {filtered.map((item) => {
          let badgeColor = "bg-amber-500/10 text-amber-600 border-amber-500/20";
          let borderThick = "border-amber-400 dark:border-amber-500/40";
          let psyNote = "Cognitive block exists. Double click resources to build your scaffolding.";

          if (item.status === 'In Progress') {
            badgeColor = "bg-rose-500/10 text-rose-600 border-rose-500/20";
            borderThick = "border-rose-500 dark:border-rose-550/40";
            psyNote = "Synapses are forming. Dynamic engagement leads to accelerated deep retention.";
          } else if (item.status === 'Completed') {
            badgeColor = "bg-blue-500/10 text-blue-600 border-blue-500/20";
            borderThick = "border-blue-500 dark:border-blue-550/40";
            psyNote = "Encoding successfully consolidated. Practice active recall in 48 hours for intervals integration.";
          } else if (item.status === 'Perfected') {
            badgeColor = "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
            borderThick = "border-emerald-500 dark:border-emerald-550/40";
            psyNote = "Synaptic mastery unlocked! Perfect schema constructed. You can confidently explain this to a peer.";
          }

          // Compact View layout
          if (viewMode === 'compact') {
            return (
              <div 
                key={item.id}
                className={`bg-white dark:bg-slate-900 border-l-4 ${borderThick} rounded-xl border border-slate-200/70 dark:border-slate-800/60 py-2.5 px-4 shadow-2xs relative flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all duration-150 hover:bg-slate-50/50 dark:hover:bg-slate-850/20 group`}
              >
                {/* Left side: Status badge + Title */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-extrabold font-mono tracking-wide uppercase border shrink-0 ${badgeColor}`}>
                    {item.status === 'Awaiting Solution' ? 'Queue' : item.status === 'In Progress' ? 'solving' : item.status === 'Completed' ? 'solved' : 'Mastered'}
                  </span>
                  <h3 className="text-xs font-bold font-sans text-slate-800 dark:text-slate-100 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors tracking-tight truncate">
                    {item.title}
                  </h3>
                  {item.notes && (
                    <span className="text-[10px] text-amber-500 dark:text-amber-450 hidden lg:inline shrink-0 font-sans font-medium" title={item.notes}>
                      💡 Notes
                    </span>
                  )}
                </div>

                {/* Right side: Links, micro synapser selector, actions */}
                <div className="flex flex-wrap items-center gap-4 shrink-0 justify-between md:justify-end">
                  {/* Tiny links */}
                  <div className="flex items-center gap-1.5">
                    {item.paperUrl && (
                      <a
                        href={item.paperUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/15 rounded-md text-rose-600 dark:text-rose-400 transition"
                        title="View reference paper PDF"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {item.websiteUrl && (
                      <a
                        href={item.websiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/15 rounded-md text-emerald-600 dark:text-emerald-400 transition"
                        title="Open problems workspace"
                      >
                        <Globe className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>

                  {/* Micro synapser controller */}
                  <div className="flex items-center bg-slate-50 dark:bg-slate-950 p-0.5 rounded-lg border border-slate-200/50 dark:border-slate-850/50">
                    {([
                      { id: 'Awaiting Solution', label: 'Q' },
                      { id: 'In Progress', label: 'S' },
                      { id: 'Completed', label: 'C' },
                      { id: 'Perfected', label: 'M' }
                    ] as const).map((stage) => {
                      const isSelected = item.status === stage.id;
                      let activeBtnClass = "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-100";
                      if (isSelected) {
                        if (stage.id === 'In Progress') activeBtnClass = "bg-rose-650 text-white shadow-2xs";
                        else if (stage.id === 'Completed') activeBtnClass = "bg-blue-650 text-white shadow-2xs";
                        else if (stage.id === 'Perfected') activeBtnClass = "bg-emerald-650 text-white shadow-2xs";
                        else activeBtnClass = "bg-amber-650 text-white shadow-2xs";
                      }
                      return (
                        <button
                          key={stage.id}
                          type="button"
                          onClick={() => handleChangeStatus(item.id, stage.id)}
                          className={`w-5 h-5 text-[8px] rounded-md font-extrabold font-mono transition-all duration-150 cursor-pointer ${
                            isSelected ? activeBtnClass : 'text-slate-450 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-350'
                          }`}
                          title={`Switch to ${stage.id}`}
                        >
                          {stage.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 border-l border-slate-200 dark:border-slate-800 pl-2">
                    <button
                      onClick={() => setEditingItem(item)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-705 dark:hover:text-white transition cursor-pointer"
                      title="Edit Quest"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/25 text-slate-400 hover:text-rose-650 transition cursor-pointer"
                      title="Retire Quest"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            );
          }

          // List View layout (Single stretch column)
          if (viewMode === 'list') {
            return (
              <div 
                key={item.id}
                className={`bg-white dark:bg-slate-900 border-l-4 ${borderThick} rounded-2xl border-t border-r border-b border-slate-200/80 dark:border-slate-800/80 p-5 shadow-xs relative flex flex-col md:flex-row md:items-start justify-between gap-5 transition-all duration-200 hover:shadow-md group hover:translate-y-[-2px]`}
              >
                {/* Left Column: context */}
                <div className="flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold font-mono tracking-wider uppercase border ${badgeColor}`}>
                      {item.status}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">Created: {new Date(item.createdAt || '').toLocaleDateString()}</span>
                  </div>

                  <h3 className="text-lg font-extrabold font-sans text-slate-800 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors tracking-tight">
                    {item.title}
                  </h3>

                  {item.description && (
                    <p className="text-xs text-slate-505 dark:text-slate-400 leading-relaxed bg-slate-50/50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-850/50">
                      {item.description}
                    </p>
                  )}

                  {item.notes && (
                    <p className="text-[11px] font-sans bg-amber-500/5 dark:bg-amber-950/10 text-slate-650 dark:text-slate-350 px-3 py-2.5 rounded-xl border border-amber-500/10 dark:border-amber-500/20 leading-relaxed font-semibold">
                      💡 {item.notes}
                    </p>
                  )}
                </div>

                {/* Right Column: resources and actions */}
                <div className="w-full md:w-80 shrink-0 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase font-bold">Resources & Stage</span>
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => setEditingItem(item)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-450 hover:text-slate-700 dark:hover:text-white transition-all cursor-pointer"
                        title="Edit Quest Details"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/25 text-slate-400 hover:text-rose-650 transition-all cursor-pointer"
                        title="Retire Quest"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Links Row */}
                  {(item.paperUrl || item.websiteUrl) && (
                    <div className="flex flex-col gap-2">
                      {item.paperUrl && (
                        <a
                          href={item.paperUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2.5 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/15 dark:border-rose-500/20 rounded-xl flex items-center justify-between transition-all duration-150 group/btn shadow-xs hover:scale-[1.01]"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 text-rose-600 shrink-0" />
                            <span className="text-xs font-sans text-slate-650 dark:text-slate-300 font-semibold truncate">View Reference Paper</span>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                        </a>
                      )}

                      {item.websiteUrl && (
                        <a
                          href={item.websiteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2.5 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/15 dark:border-emerald-500/20 rounded-xl flex items-center justify-between transition-all duration-150 group/btn shadow-xs hover:scale-[1.01]"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Globe className="w-4 h-4 text-emerald-650 shrink-0" />
                            <span className="text-xs font-sans text-slate-655 dark:text-slate-300 font-semibold truncate">Problems Workspace portal</span>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Stage Switcher */}
                  <div className="p-1.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/60 dark:border-slate-850/50">
                    <span className="block text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-0.5">Synaptic Stage:</span>
                    <div className="grid grid-cols-4 gap-1">
                      {([
                        { id: 'Awaiting Solution', label: 'Queue' },
                        { id: 'In Progress', label: 'solving' },
                        { id: 'Completed', label: 'solved' },
                        { id: 'Perfected', label: 'Mastered' }
                      ] as const).map((stage) => {
                        const isSelected = item.status === stage.id;
                        let activeBtnClass = "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-100";
                        if (isSelected) {
                          if (stage.id === 'In Progress') activeBtnClass = "bg-rose-600 text-white shadow-xs";
                          else if (stage.id === 'Completed') activeBtnClass = "bg-blue-600 text-white shadow-xs";
                          else if (stage.id === 'Perfected') activeBtnClass = "bg-emerald-600 text-white shadow-xs";
                          else activeBtnClass = "bg-amber-600 text-white shadow-xs";
                        }

                        return (
                          <button
                            key={stage.id}
                            onClick={() => handleChangeStatus(item.id, stage.id)}
                            className={`py-1 rounded text-[9px] font-bold font-mono tracking-wide uppercase transition-all duration-155 cursor-pointer ${
                              isSelected ? `${activeBtnClass} scale-102 font-extrabold` : 'text-slate-450 dark:text-slate-500 hover:text-slate-705 dark:hover:text-slate-300'
                            }`}
                          >
                            {stage.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

              </div>
            );
          }

          // Default Grid View layout
          return (
            <div 
              key={item.id}
              className={`bg-white dark:bg-slate-900 border-l-4 ${borderThick} rounded-2xl border-t border-r border-b border-slate-200/80 dark:border-slate-800/80 p-5 shadow-xs relative flex flex-col justify-between transition-all duration-200 hover:shadow-md group hover:translate-y-[-2px]`}
            >
              {/* Header inside card */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold font-mono tracking-wider uppercase border ${badgeColor}`}>
                    {item.status}
                  </span>
                  
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setEditingItem(item)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all cursor-pointer"
                      title="Edit Quest Details"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-955/25 text-slate-400 hover:text-rose-650 transition-all cursor-pointer"
                      title="Retire Quest"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-extrabold font-sans text-slate-800 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors tracking-tight">
                  {item.title}
                </h3>
                
                {item.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-2 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-850/50">
                    {item.description}
                  </p>
                )}


                {/* Conditional Double Core Resources Link Section */}
                {(item.paperUrl || item.websiteUrl) && (
                  <div className={`grid gap-3 my-4 ${item.paperUrl && item.websiteUrl ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {item.paperUrl && (
                      <a
                        href={item.paperUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-3 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/15 dark:border-rose-500/20 rounded-xl flex items-center gap-3 transition-all duration-150 group/btn shadow-xs hover:scale-[1.01]"
                        title="Open study question paper PDF reference"
                      >
                        <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="block text-[9px] font-mono uppercase text-rose-500 dark:text-rose-455 font-extrabold tracking-wider">Reference Paper</span>
                          <span className="text-[11px] font-sans text-slate-650 dark:text-slate-300 font-semibold truncate block">View PDF paper</span>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-350 dark:text-slate-550 group-hover/btn:text-rose-550 ml-auto shrink-0 transition-colors" />
                      </a>
                    )}

                    {item.websiteUrl && (
                      <a
                        href={item.websiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-3 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/15 dark:border-emerald-500/20 rounded-xl flex items-center gap-3 transition-all duration-150 group/btn shadow-xs hover:scale-[1.01]"
                        title="Open questions provider website portal"
                      >
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-650 dark:text-emerald-400 shrink-0">
                          <Globe className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="block text-[9px] font-mono uppercase text-emerald-600 dark:text-emerald-455 font-extrabold tracking-wider">Website Portal</span>
                          <span className="text-[11px] font-sans text-slate-650 dark:text-slate-300 font-semibold truncate block">Go to problems</span>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-350 dark:text-slate-555 ml-auto shrink-0 transition-colors" />
                      </a>
                    )}
                  </div>
                )}

                {/* Personal Epiphany Notes */}
                {item.notes && (
                  <div className="space-y-1 mb-4 pt-1">
                    <span className="text-[9px] font-mono font-extrabold tracking-wider text-slate-455 uppercase block">Epiphany & Edge Cases:</span>
                    <p className="text-[11px] font-sans bg-amber-500/5 dark:bg-amber-950/10 text-slate-650 dark:text-slate-350 px-3 py-2.5 rounded-xl border border-amber-500/10 dark:border-amber-500/20 leading-relaxed font-medium">
                      💡 {item.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Status Switch Controller inside card */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 mt-2">
                <span className="block text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">Advance Synaptic Stage:</span>
                <div className="grid grid-cols-4 gap-1 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl">
                  {([
                    { id: 'Awaiting Solution', label: 'Queue' },
                    { id: 'In Progress', label: 'solving' },
                    { id: 'Completed', label: 'solved' },
                    { id: 'Perfected', label: 'Mastered' }
                  ] as const).map((stage) => {
                    const isSelected = item.status === stage.id;
                    let activeBtnClass = "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-100";
                    if (isSelected) {
                      if (stage.id === 'In Progress') activeBtnClass = "bg-rose-600 text-white shadow-xs";
                      else if (stage.id === 'Completed') activeBtnClass = "bg-blue-600 text-white shadow-xs";
                      else if (stage.id === 'Perfected') activeBtnClass = "bg-emerald-600 text-white shadow-xs";
                      else activeBtnClass = "bg-amber-600 text-white shadow-xs";
                    }

                    return (
                      <button
                        key={stage.id}
                        onClick={() => handleChangeStatus(item.id, stage.id)}
                        className={`py-1 rounded-lg text-[10px] font-bold font-mono tracking-wide uppercase transition-all duration-150 cursor-pointer ${
                          isSelected ? `${activeBtnClass} scale-102 font-extrabold` : 'text-slate-450 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
                        }`}
                      >
                        {stage.label}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-1 md:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-950 rounded-full flex items-center justify-center text-slate-400 mx-auto">
              <Award className="w-8 h-8 text-slate-350" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h4 className="font-bold font-sans text-slate-805 dark:text-slate-200">No Assignments Saved</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Add an assignment reference sheet, specify its papers details and online problem links to start practicing.
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-rose-600 to-rose-500 text-white text-xs font-bold font-mono tracking-wider uppercase rounded-xl shadow-md cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Launch First Quest</span>
            </button>
          </div>
        )}
      </div>

      {/* Pop-up modal screen to Create standard assignment quest */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-950/60 dark:bg-black/85 backdrop-blur-xs transition-opacity" />
          
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-98 duration-200">
            {/* Top decorative gradient ribbon */}
            <div className="h-2 w-full bg-linear-to-r from-rose-500 via-amber-500 to-emerald-500" />
            
            <div className="p-7 overflow-y-auto max-h-[85vh] space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
                      <Zap className="w-4.5 h-4.5 animate-pulse" />
                    </div>
                    <span className="text-[11px] font-mono font-extrabold uppercase tracking-widest text-rose-500 dark:text-rose-400">
                      Primary Quest
                    </span>
                  </div>
                  <h3 className="font-sans font-extrabold text-xl text-slate-800 dark:text-white leading-tight">
                    Add Assignment Quest
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Map standard worksheets and reference URLs to your working memory matrix.
                  </p>
                </div>
                
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 px-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all cursor-pointer select-none"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddAssignment} className="space-y-5">
                {errorMsg && (
                  <div className="bg-red-500/10 text-red-600 dark:text-red-450 font-mono text-xs font-bold p-3.5 rounded-xl border border-red-505/20 flex items-center gap-2 animate-bounce">
                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Section 1: Objective Definition */}
                <div className="space-y-4">
                  <span className="text-[10px] font-mono font-extrabold text-slate-450 tracking-wider uppercase block">
                    Step 1: Quest Profile
                  </span>

                  <div>
                    <label className="flex items-center gap-2 text-xs font-bold tracking-wide text-slate-700 dark:text-slate-350 mb-2">
                      <Award className="w-4 h-4 text-rose-550" />
                      Quest Title
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Stanford CS142: MapReduce Processing Node"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-550 focus:bg-white dark:focus:bg-slate-900 transition-all text-sm"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-xs font-bold tracking-wide text-slate-700 dark:text-slate-350 mb-2">
                      <BrainCircuit className="w-4 h-4 text-violet-500" />
                      Goal Statement & Focus Targets
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Master log appending, heartbeat intervals, and transition boundaries."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-550 focus:bg-white dark:focus:bg-slate-900 transition-all text-sm resize-none"
                    />
                  </div>
                </div>

                {/* Section 2: Neural Connections (Hyperlinks) */}
                <div className="space-y-4 pt-1">
                  <span className="text-[10px] font-mono font-extrabold text-slate-450 tracking-wider uppercase block">
                    Step 2: Resource Anchors
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/10 space-y-2">
                      <label className="flex items-center gap-1.5 text-xs font-bold font-sans text-rose-650 dark:text-rose-400">
                        <FileText className="w-4 h-4" />
                        PDF Question Paper Link
                      </label>
                      <input
                        type="url"
                        placeholder="https://stanford.edu/...pdf"
                        value={paperUrl}
                        onChange={(e) => setPaperUrl(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-rose-500/20 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                      />
                      <span className="text-[10px] text-rose-500/85 block leading-tight font-mono">
                        Loads the academic reference.
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 space-y-2">
                      <label className="flex items-center gap-1.5 text-xs font-bold font-sans text-emerald-650 dark:text-emerald-400">
                        <Globe className="w-4 h-4" />
                        Website Problem Portal Link
                      </label>
                      <input
                        type="url"
                        placeholder="https://leetcode.com/problems/..."
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-emerald-500/20 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-550/20 focus:border-emerald-550"
                      />
                      <span className="text-[10px] text-emerald-600/85 dark:text-emerald-400/85 block leading-tight font-mono">
                        Hosts the active workspace environment.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section 3: Cognitive Integration Status */}
                <div className="space-y-4 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-extrabold text-slate-450 tracking-wider uppercase block">
                      Step 3: Synaptic Alignment
                    </span>
                    <span className="text-[10px] text-rose-500 dark:text-rose-400 font-mono font-bold">
                      Determines active retention intervals
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-4 gap-2 bg-slate-50 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60">
                      {([
                        { id: 'Awaiting Solution', label: 'Queue', badge: 'bg-amber-500 text-white', desc: 'No solution yet' },
                        { id: 'In Progress', label: 'solving', badge: 'bg-rose-500 text-white', desc: 'Fires synapses' },
                        { id: 'Completed', label: 'solved', badge: 'bg-blue-600 text-white', desc: 'Working schema' },
                        { id: 'Perfected', label: 'Mastered', badge: 'bg-emerald-600 text-white', desc: 'Peer-explainable' }
                      ] as const).map((opt) => {
                        const isSelected = status === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setStatus(opt.id)}
                            className={`py-2 px-1 rounded-xl text-[10px] font-extrabold font-mono tracking-wider uppercase transition-all duration-155 flex flex-col items-center justify-center gap-1 cursor-pointer min-h-[52px] ${
                              isSelected
                                ? `${opt.badge} shadow-md scale-102`
                                : 'text-slate-450 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-350 hover:bg-white dark:hover:bg-slate-900 rounded-xl'
                            }`}
                          >
                            <span>{opt.label}</span>
                            <span className={`text-[8px] opacity-75 font-normal capitalize ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                              {opt.desc}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Dynamic psychological motivation banner according to selection */}
                    <div className="p-3 rounded-xl bg-orange-500/5 dark:bg-orange-550/5 border border-orange-500/10 text-[11px] text-slate-550 dark:text-slate-350 flex items-start gap-2 leading-relaxed">
                      <Trophy className="w-4 h-4 text-rose-505 dark:text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        {status === 'Awaiting Solution' && (
                          <span><strong>Deferred Mode:</strong> Pre-load the paper metadata in your subconscious. Prime memory nodes before tackling logic files.</span>
                        )}
                        {status === 'In Progress' && (
                          <span><strong>Arousal State Active:</strong> Real-time debugging builds fast cognitive maps. Avoid copy-pasting solutions; write step-by-step logic!</span>
                        )}
                        {status === 'Completed' && (
                          <span><strong>Schema Established:</strong> Test yourself in 48 hours to secure long-term myelination of concepts.</span>
                        )}
                        {status === 'Perfected' && (
                          <span><strong>Subconscious Consolidated:</strong> You are fully capable of implementing this architecture under high-stress conditions or explaining it instantly.</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>


                {/* Actions Frame */}
                <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4.5 py-2.5 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-xs font-mono uppercase tracking-wider transition-all select-none cursor-pointer"
                  >
                    Close Panel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-rose-600 dark:hover:bg-rose-500 text-white dark:text-white font-extrabold text-xs font-mono uppercase tracking-wider shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer select-none"
                  >
                    Begin Quest
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Editing dialog modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setEditingItem(null)} className="absolute inset-0 bg-slate-950/60 dark:bg-black/85 backdrop-blur-xs transition-opacity" />
          
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-98 duration-200">
            {/* Top decorative gradient ribbon */}
            <div className="h-2 w-full bg-linear-to-r from-violet-600 via-rose-500 to-emerald-500" />
            
            <div className="p-7 overflow-y-auto max-h-[85vh] space-y-6">
              <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-violet-500/10 dark:bg-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400">
                      <Edit3 className="w-4.5 h-4.5" />
                    </div>
                    <span className="text-[11px] font-mono font-extrabold uppercase tracking-widest text-violet-600 dark:text-violet-400">
                      Calibrate Matrix
                    </span>
                  </div>
                  <h3 className="font-sans font-extrabold text-xl text-slate-800 dark:text-white leading-tight">
                    Edit Assignment Quest
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Refining study objectives, resources connections, and cognitive tracking thresholds.
                  </p>
                </div>
                
                <button 
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="p-1 px-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-450 hover:text-slate-700 dark:hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-5">
                {/* Section 1: Objective Definition */}
                <div className="space-y-4">
                  <span className="text-[10px] font-mono font-extrabold text-slate-450 tracking-wider uppercase block">
                    Step 1: Quest Profile
                  </span>

                  <div>
                    <label className="flex items-center gap-2 text-xs font-bold tracking-wide text-slate-700 dark:text-slate-350 mb-2">
                      <Award className="w-4 h-4 text-violet-500" />
                      Quest Title
                    </label>
                    <input
                      type="text"
                      required
                      value={editingItem.title}
                      onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 focus:bg-white dark:focus:bg-slate-900 transition-all text-sm"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-xs font-bold tracking-wide text-slate-700 dark:text-slate-350 mb-2">
                      <BrainCircuit className="w-4 h-4 text-violet-400" />
                      Goal Statement & Focus Targets
                    </label>
                    <textarea
                      rows={2}
                      value={editingItem.description}
                      onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 focus:bg-white dark:focus:bg-slate-900 transition-all text-sm resize-none"
                    />
                  </div>
                </div>

                {/* Section 2: Neural Connections */}
                <div className="space-y-4 pt-1">
                  <span className="text-[10px] font-mono font-extrabold text-slate-450 tracking-wider uppercase block">
                    Step 2: Resource Anchors
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/10 space-y-2">
                      <label className="flex items-center gap-1.5 text-xs font-bold font-sans text-rose-650 dark:text-rose-450">
                        <FileText className="w-4 h-4" />
                        PDF Question Paper Link
                      </label>
                      <input
                        type="url"
                        value={editingItem.paperUrl}
                        onChange={(e) => setEditingItem({ ...editingItem, paperUrl: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-rose-500/20 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                      />
                    </div>

                    <div className="p-4 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 space-y-2">
                      <label className="flex items-center gap-1.5 text-xs font-bold font-sans text-emerald-650 dark:text-emerald-450">
                        <Globe className="w-4 h-4" />
                        Website Problem Portal Link
                      </label>
                      <input
                        type="url"
                        value={editingItem.websiteUrl}
                        onChange={(e) => setEditingItem({ ...editingItem, websiteUrl: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-emerald-500/20 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-550/20 focus:border-emerald-550"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Cognitive Integration Status */}
                <div className="space-y-4 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-extrabold text-slate-450 tracking-wider uppercase block">
                      Step 3: Synaptic Alignment
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-4 gap-2 bg-slate-50 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60">
                      {([
                        { id: 'Awaiting Solution', label: 'Queue', badge: 'bg-amber-500 text-white', desc: 'No solution yet' },
                        { id: 'In Progress', label: 'solving', badge: 'bg-rose-500 text-white', desc: 'Fires synapses' },
                        { id: 'Completed', label: 'solved', badge: 'bg-blue-600 text-white', desc: 'Working schema' },
                        { id: 'Perfected', label: 'Mastered', badge: 'bg-emerald-600 text-white', desc: 'Peer-explainable' }
                      ] as const).map((opt) => {
                        const isSelected = editingItem.status === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setEditingItem({ ...editingItem, status: opt.id })}
                            className={`py-2 px-1 rounded-xl text-[10px] font-extrabold font-mono tracking-wider uppercase transition-all duration-155 flex flex-col items-center justify-center gap-1 cursor-pointer min-h-[52px] ${
                              isSelected
                                ? `${opt.badge} shadow-md scale-102`
                                : 'text-slate-450 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-350 hover:bg-white dark:hover:bg-slate-900 rounded-xl'
                            }`}
                          >
                            <span>{opt.label}</span>
                            <span className={`text-[8px] opacity-75 font-normal capitalize ${isSelected ? 'text-white' : 'text-slate-440'}`}>
                              {opt.desc}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>


                {/* Actions Frame */}
                <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="px-4.5 py-2.5 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-xs font-mono uppercase tracking-wider transition-all select-none cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl bg-violet-650 hover:bg-violet-600 text-white font-extrabold text-xs font-mono uppercase tracking-wider shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer select-none"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
