import React, { useState } from 'react';
import { 
  Award, Sparkles, Plus, Search, Trash2, ExternalLink, FileText, Globe, 
  Calendar, Flame, CheckCircle2, TrendingUp, X, Check, Edit3, HelpCircle,
  FileCode, Zap, BrainCircuit, Trophy, Star, LayoutGrid, List, Menu,
  Pin, GripVertical, Download, Upload
} from 'lucide-react';
import { DatabaseState, AssignmentItem } from '../types';

interface AllAssignmentsViewProps {
  dbState: DatabaseState;
  onUpdateDb: (updates: Partial<DatabaseState>) => void;
  onSelectView?: (view: string) => void;
}

export function AllAssignmentsView({ dbState, onUpdateDb, onSelectView }: AllAssignmentsViewProps) {
  const assignments = dbState.assignments || [];

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'compact'>('grid');

  // Drag and drop states for manual layout ordering
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedId !== id) {
      setDragOverId(id);
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const sourceIdx = assignments.findIndex(a => a.id === draggedId);
    const targetIdx = assignments.findIndex(a => a.id === targetId);

    if (sourceIdx !== -1 && targetIdx !== -1) {
      const updated = [...assignments];
      const [movedItem] = updated.splice(sourceIdx, 1);
      const newTargetIdx = updated.findIndex(a => a.id === targetId);
      updated.splice(newTargetIdx, 0, movedItem);
      onUpdateDb({ assignments: updated });
    }

    setDraggedId(null);
    setDragOverId(null);
  };

  // Toggle Pinned status
  const handleTogglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = assignments.map(a => {
      if (a.id === id) {
        return { ...a, isPinned: !a.isPinned };
      }
      return a;
    });
    onUpdateDb({ assignments: updated });
  };

  // Set selected item as exclusive solving card (at any time only one is solving)
  const handleToggleSolving = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = assignments.map(a => {
      if (a.id === id) {
        const nextSolving = !a.isSolving;
        return { 
          ...a, 
          isSolving: nextSolving,
          status: nextSolving ? 'In Progress' as const : a.status
        };
      }
      return { 
        ...a, 
        isSolving: false 
      };
    });
    onUpdateDb({ assignments: updated });
  };
  
  // Creation modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [paperUrl, setPaperUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [status, setStatus] = useState<AssignmentItem['status']>('Awaiting Solution');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [enableLinkedNote, setEnableLinkedNote] = useState(false);

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

  // Local PDF states
  const [localPdfData, setLocalPdfData] = useState<string>('');
  const [localPdfName, setLocalPdfName] = useState<string>('');
  const [localPdfSize, setLocalPdfSize] = useState<string>('');
  const assignmentFileRef = React.useRef<HTMLInputElement>(null);
  const editAssignmentFileRef = React.useRef<HTMLInputElement>(null);

  const handleAssignmentFileChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setErrorMsg('Please select a valid PDF document.');
        return;
      }
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        if (isEdit && editingItem) {
          setEditingItem({
            ...editingItem,
            localPdfData: base64,
            localPdfName: file.name,
            localPdfSize: sizeMB
          });
        } else {
          setLocalPdfData(base64);
          setLocalPdfName(file.name);
          setLocalPdfSize(sizeMB);
        }
      };
      reader.onerror = () => {
        setErrorMsg('Failed to process local PDF.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownloadOfflineAssignment = (fileName: string, fileData: string) => {
    const link = document.createElement('a');
    link.href = fileData;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
      paperUrl: paperUrl.trim() || undefined,
      websiteUrl: websiteUrl.trim(),
      localPdfData: localPdfData || undefined,
      localPdfName: localPdfName || undefined,
      localPdfSize: localPdfSize || undefined,
      status,
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
      enableLinkedNote
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
    setEnableLinkedNote(false);
    setErrorMsg('');
    setLocalPdfData('');
    setLocalPdfName('');
    setLocalPdfSize('');
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
          paperUrl: editingItem.paperUrl?.trim() || undefined,
          websiteUrl: editingItem.websiteUrl.trim(),
          localPdfData: editingItem.localPdfData,
          localPdfName: editingItem.localPdfName,
          localPdfSize: editingItem.localPdfSize,
          status: editingItem.status,
          notes: editingItem.notes?.trim(),
          enableLinkedNote: editingItem.enableLinkedNote
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

  // Sort assignments: Active Solving comes absolutely first, Pinned second, and standard manual inventory sequence third
  const sortedFiltered = [...filtered].sort((a, b) => {
    if (a.isSolving && !b.isSolving) return -1;
    if (!a.isSolving && b.isSolving) return 1;

    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;

    const idxA = assignments.findIndex(item => item.id === a.id);
    const idxB = assignments.findIndex(item => item.id === b.id);
    return idxA - idxB;
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
        {sortedFiltered.map((item) => {
          const isSolving = !!item.isSolving;
          const isPinned = !!item.isPinned;

          let badgeColor = "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-400/10 dark:text-amber-400 dark:border-amber-400/20";
          let borderThick = "border-amber-400 dark:border-amber-500/40";
          let psyNote = "Cognitive block exists. Double click resources to build your scaffolding.";

          if (isSolving) {
            badgeColor = "bg-cyan-500/20 text-cyan-600 border-cyan-500/30 dark:bg-cyan-400/25 dark:text-cyan-400 dark:border-cyan-400/30";
            borderThick = "border-cyan-450 dark:border-cyan-400";
            psyNote = "Retrieval matrix online! Your neuronal structures are actively adapting right now.";
          } else if (item.status === 'In Progress') {
            badgeColor = "bg-rose-500/10 text-rose-600 border-rose-500/20 dark:bg-rose-455/15 dark:text-rose-400 dark:border-rose-455/20";
            borderThick = "border-rose-500 dark:border-rose-550/40";
            psyNote = "Synapses are forming. Dynamic engagement leads to accelerated deep retention.";
          } else if (item.status === 'Completed') {
            badgeColor = "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-450/15 dark:text-blue-400 dark:border-blue-450/20";
            borderThick = "border-blue-500 dark:border-blue-550/40";
            psyNote = "Encoding successfully consolidated. Practice active recall in 48 hours for intervals integration.";
          } else if (item.status === 'Perfected') {
            badgeColor = "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-450/15 dark:text-emerald-450 dark:border-emerald-450/20";
            borderThick = "border-emerald-500 dark:border-emerald-555/40";
            psyNote = "Synaptic mastery unlocked! Perfect schema constructed. You can confidently explain this to a peer.";
          }

          // Compact View layout
          if (viewMode === 'compact') {
            const cardBg = isSolving 
              ? "bg-gradient-to-r from-teal-50/70 via-cyan-50/60 to-blue-50/50 dark:from-teal-950/20 dark:via-cyan-950/25 dark:to-blue-950/20 border-cyan-300 dark:border-cyan-800 shadow-[0_4px_20px_rgba(6,182,212,0.08)] ring-2 ring-cyan-400/20"
              : "bg-white dark:bg-slate-900 border-slate-200/70 dark:border-slate-800/60";

            return (
              <div 
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, item.id)}
                onDragOver={(e) => handleDragOver(e, item.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, item.id)}
                onDragEnd={handleDragEnd}
                className={`${cardBg} border-l-4 ${borderThick} rounded-xl border py-2.5 px-4 relative flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all duration-200 select-none ${
                  dragOverId === item.id ? 'translate-y-1 scale-[1.01] border-dashed border-sky-400 dark:border-sky-500 bg-sky-50/20 dark:bg-sky-950/20' : ''
                } ${draggedId === item.id ? 'opacity-30' : ''}`}
              >
                {/* Left side: Drag Handle, Status, Title, Pin */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="shrink-0 p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-grab active:cursor-grabbing" title="Drag to reorder manually">
                    <GripVertical className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                  </div>

                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold font-mono tracking-wide uppercase border shrink-0 ${badgeColor}`}>
                    {isSolving ? 'Solving Now' : item.status === 'Awaiting Solution' ? 'Queue' : item.status === 'In Progress' ? 'solving' : item.status === 'Completed' ? 'solved' : 'Mastered'}
                  </span>
                  
                  <h3 className="text-xs font-bold font-sans text-slate-800 dark:text-slate-100 hover:text-cyan-600 dark:hover:text-cyan-450 transition-colors tracking-tight truncate flex items-center gap-1.5">
                    {item.title}
                    {isPinned && <span className="text-amber-500 font-bold text-[10px]">📌</span>}
                  </h3>
                </div>

                {/* Right side: Interactive Controls */}
                <div className="flex flex-wrap items-center gap-3 shrink-0 justify-between md:justify-end">
                  {/* Pin option */}
                  <button
                    onClick={(e) => handleTogglePin(item.id, e)}
                    className={`p-1 rounded transition-transform cursor-pointer ${isPinned ? 'text-amber-500 scale-110' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:scale-105'}`}
                    title={isPinned ? "Unpin paper" : "Pin paper to top"}
                  >
                    <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-current rotate-45' : ''}`} />
                  </button>

                  {/* Playful Solve Indicator */}
                  <button
                    onClick={(e) => handleToggleSolving(item.id, e)}
                    className={`px-2.5 py-1 text-[9px] rounded-lg font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      isSolving
                        ? 'bg-cyan-500 hover:bg-cyan-600 text-white shadow-xs animate-pulse'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {isSolving ? '✨ Solving' : '📖 Solve'}
                  </button>

                  {/* Tiny links */}
                  <div className="flex items-center gap-1.5 bg-white/50 dark:bg-slate-900/55 backdrop-blur-xs p-0.5 rounded-lg">
                    {item.localPdfData && (
                      <button
                        onClick={() => handleDownloadOfflineAssignment(item.localPdfName || 'document.pdf', item.localPdfData!)}
                        className="p-1 bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/15 rounded-md text-blue-600 dark:text-blue-400 transition cursor-pointer"
                        title={`Download offline PDF: ${item.localPdfName}`}
                      >
                        <FileText className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
                      </button>
                    )}
                    {item.paperUrl && (
                      <a
                        href={item.paperUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/15 rounded-md text-rose-600 dark:text-rose-450 transition"
                        title="View online PDF reference link"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-rose-500" />
                      </a>
                    )}
                    {item.websiteUrl && (
                      <a
                        href={item.websiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/15 rounded-md text-emerald-600 dark:text-emerald-400 transition"
                        title="Open problems workspace"
                      >
                        <Globe className="w-3.5 h-3.5 text-emerald-500" />
                      </a>
                    )}
                  </div>

                  {/* Stage Synapser Controller */}
                  <div className="flex items-center bg-slate-50 dark:bg-slate-950 p-0.5 rounded-lg border border-slate-200/50 dark:border-slate-850/50">
                    {([
                      { id: 'Awaiting Solution', label: 'Q' },
                      { id: 'In Progress', label: 'S' },
                      { id: 'Completed', label: 'C' },
                      { id: 'Perfected', label: 'M' }
                    ] as const).map((stage) => {
                      const isSelected = item.status === stage.id && !isSolving;
                      let activeBtnClass = "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-100";
                      if (isSelected) {
                        if (stage.id === 'In Progress') activeBtnClass = "bg-rose-500 text-white shadow-2xs";
                        else if (stage.id === 'Completed') activeBtnClass = "bg-blue-500 text-white shadow-2xs";
                        else if (stage.id === 'Perfected') activeBtnClass = "bg-emerald-500 text-white shadow-2xs";
                        else activeBtnClass = "bg-amber-550 text-white shadow-2xs";
                      }
                      return (
                        <button
                          key={stage.id}
                          type="button"
                          onClick={() => handleChangeStatus(item.id, stage.id)}
                          className={`w-5 h-5 text-[8px] rounded-md font-extrabold font-mono transition-all duration-150 cursor-pointer ${
                            isSelected ? activeBtnClass : 'text-slate-450 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-350'
                          }`}
                          title={`Switch status to ${stage.id}`}
                        >
                          {stage.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 border-l border-slate-200 dark:border-slate-800 pl-1.5">
                    <button
                      onClick={() => {
                        const updated = assignments.map(a => a.id === item.id ? { ...a, enableLinkedNote: !a.enableLinkedNote } : a);
                        onUpdateDb({ assignments: updated });
                      }}
                      className={`p-1 rounded-lg transition-all cursor-pointer ${
                        item.enableLinkedNote ? 'text-amber-550 bg-amber-500/10' : 'text-slate-400 hover:text-slate-700'
                      }`}
                      title={item.enableLinkedNote ? "Disable connected study note link" : "Enable connected study note link"}
                    >
                      🔗
                    </button>
                    {item.enableLinkedNote && (
                      <button
                        onClick={() => triggerLinkedNote(item.id, item.title, 'assignment')}
                        className="p-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-305/30 rounded-lg text-amber-600 dark:text-amber-400 transition cursor-pointer text-[10px] font-mono leading-none flex items-center shrink-0"
                        title="Open connected study note"
                      >
                        📝
                      </button>
                    )}
                    <button
                      onClick={() => setEditingItem(item)}
                      className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition cursor-pointer"
                      title="Edit Quest"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/25 text-slate-400 hover:text-rose-600 transition cursor-pointer"
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
            const cardBg = isSolving 
              ? "bg-gradient-to-r from-teal-50/50 via-cyan-50/40 to-indigo-50/30 dark:from-teal-950/15 dark:via-cyan-950/15 dark:to-indigo-950/10 border-cyan-455 dark:border-cyan-500 ring-3 ring-cyan-250/20 shadow-md"
              : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/80";

            return (
              <div 
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, item.id)}
                onDragOver={(e) => handleDragOver(e, item.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, item.id)}
                onDragEnd={handleDragEnd}
                className={`${cardBg} border-l-4 ${borderThick} rounded-2xl border-t border-r border-b p-5 relative flex flex-col md:flex-row md:items-start justify-between gap-5 transition-all duration-200 select-none ${
                  dragOverId === item.id ? 'translate-y-1 scale-[1.01] border-dashed border-sky-400 bg-sky-50/20 dark:bg-sky-955/20' : ''
                } ${draggedId === item.id ? 'opacity-30' : ''}`}
              >
                {/* Drag Watercolor Background spreads inside active solving card */}
                {isSolving && (
                  <div className="absolute inset-0 bg-gradient-to-tr from-pink-300/10 via-purple-300/5 to-cyan-300/10 pointer-events-none rounded-2xl blur-xs" />
                )}

                {/* Left Column: Context, Drag Handle, title, stats */}
                <div className="flex-1 space-y-3 relative z-10">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Drag Handle */}
                    <div className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-grab active:cursor-grabbing" title="Drag to reorder manual ranking">
                      <GripVertical className="w-4 h-4 text-slate-300 dark:text-slate-600 inline-block" />
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold font-mono tracking-wider uppercase border flex items-center gap-1 ${badgeColor}`}>
                      {isSolving && <Flame className="w-3 h-3 text-cyan-500 animate-pulse" />}
                      {isSolving ? 'CURRENT FOCUS SOLVING' : item.status}
                    </span>

                    {isPinned && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] bg-amber-500/10 text-amber-600 border border-amber-500/20 font-bold font-mono">
                        📌 PINNED
                      </span>
                    )}

                    <span className="text-[10px] font-mono text-slate-400 font-bold">Created: {new Date(item.createdAt || '').toLocaleDateString()}</span>
                  </div>

                  <h3 className="text-lg font-extrabold font-sans text-slate-800 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors tracking-tight flex items-center gap-2">
                    {item.title}
                  </h3>

                  {item.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50/50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-850/50">
                      {item.description}
                    </p>
                  )}

                  {item.notes && (
                    <p className="text-[11px] font-sans bg-amber-500/5 dark:bg-amber-955/10 text-slate-600 dark:text-slate-300 px-3 py-2.5 rounded-xl border border-amber-500/10 dark:border-amber-500/20 leading-relaxed font-semibold">
                      💡 {item.notes}
                    </p>
                  )}

                  {/* Motivational neurological micro note */}
                  <p className="text-[10px] font-mono text-slate-400 dark:text-slate-550 italic font-medium pt-1">
                    {psyNote}
                  </p>
                </div>

                {/* Right Column: resources, Pin icon & Solving states */}
                <div className="w-full md:w-80 shrink-0 space-y-4 relative z-10">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase font-bold">Quest Integration</span>
                    <div className="flex items-center gap-1">
                      {/* Toggle Pin */}
                      <button
                        onClick={(e) => handleTogglePin(item.id, e)}
                        className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                          isPinned 
                            ? 'text-amber-500 hover:text-amber-600 scale-110 drop-shadow-xs' 
                            : 'text-slate-400 dark:text-slate-550 hover:text-slate-700 dark:hover:text-white'
                        }`}
                        title={isPinned ? "Unpin paper" : "Pin paper to top"}
                      >
                        <Pin className={`w-4 h-4 ${isPinned ? 'fill-current rotate-45' : ''}`} />
                      </button>

                      <button
                        onClick={() => {
                          const updated = assignments.map(a => a.id === item.id ? { ...a, enableLinkedNote: !a.enableLinkedNote } : a);
                          onUpdateDb({ assignments: updated });
                        }}
                        className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                          item.enableLinkedNote ? 'text-amber-500 bg-amber-500/10' : 'text-slate-400 dark:text-slate-550'
                        }`}
                        title={item.enableLinkedNote ? "Disable connected study note link" : "Enable connected study note link"}
                      >
                        🔗
                      </button>
                      <button
                        onClick={() => setEditingItem(item)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-455 hover:text-slate-700 dark:hover:text-white transition-all cursor-pointer"
                        title="Edit Quest Details"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-955/25 text-slate-400 hover:text-rose-600 transition-all cursor-pointer"
                        title="Retire Quest"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {item.enableLinkedNote && (
                    <button
                      onClick={() => triggerLinkedNote(item.id, item.title, 'assignment')}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-300/40 text-amber-705 dark:text-amber-400 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs my-1 relative z-10"
                      title="Open connected study note"
                    >
                      <span>📝 Open Connected Quick Note</span>
                    </button>
                  )}

                  {/* Large Exclusive Solving Button */}
                  <button
                    onClick={(e) => handleToggleSolving(item.id, e)}
                    className={`w-full py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 ${
                      isSolving
                        ? 'bg-cyan-500 hover:bg-cyan-600 text-white shadow-md shadow-cyan-500/10 animate-pulse'
                        : 'bg-slate-100 hover:bg-slate-150 dark:bg-slate-800 dark:hover:bg-slate-755 text-slate-700 dark:text-slate-3 w-full border border-slate-205 dark:border-slate-700'
                    }`}
                  >
                    {isSolving ? (
                      <>
                        <Flame className="w-4 h-4 text-white animate-bounce" />
                        <span>ACTIVE COMPREHENSION BLOCK IN FOCUS</span>
                      </>
                    ) : (
                      <>
                        <BrainCircuit className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>FOCUS SOLVE THIS PAPER MODE</span>
                      </>
                    )}
                  </button>

                  {/* Links Row */}
                  {(item.paperUrl || item.localPdfData || item.websiteUrl) && (
                    <div className="flex flex-col gap-2">
                      {item.localPdfData && (
                        <button
                          onClick={() => handleDownloadOfflineAssignment(item.localPdfName || 'assignment_document.pdf', item.localPdfData!)}
                          className="p-2.5 bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/15 dark:border-blue-500/20 rounded-xl flex items-center justify-between transition-all duration-150 shadow-xs hover:scale-[1.01] text-left cursor-pointer w-full text-slate-700 dark:text-slate-300"
                          title="Download/Open local offline PDF document"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 text-blue-600 shrink-0 animate-pulse" />
                            <span className="text-xs font-sans font-semibold truncate">Offline PDF: {item.localPdfName}</span>
                          </div>
                          <Download className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                      )}

                      {item.paperUrl && (
                        <a
                          href={item.paperUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2.5 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/15 dark:border-rose-500/20 rounded-xl flex items-center justify-between transition-all duration-150 shadow-xs hover:scale-[1.01]"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <ExternalLink className="w-4 h-4 text-rose-600 shrink-0" />
                            <span className="text-xs font-sans text-slate-655 dark:text-slate-300 font-semibold truncate">Online PDF reference</span>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                        </a>
                      )}

                      {item.websiteUrl && (
                        <a
                          href={item.websiteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2.5 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/15 dark:border-emerald-500/20 rounded-xl flex items-center justify-between transition-all duration-150 shadow-xs hover:scale-[1.01]"
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
                    <span className="block text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-0.5">Advance Synaptic Stage:</span>
                    <div className="grid grid-cols-4 gap-1">
                      {([
                        { id: 'Awaiting Solution', label: 'Queue' },
                        { id: 'In Progress', label: 'solving' },
                        { id: 'Completed', label: 'solved' },
                        { id: 'Perfected', label: 'Mastered' }
                      ] as const).map((stage) => {
                        const isSelected = item.status === stage.id && !isSolving;
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

          // Default Grid View Layout with highly aesthetic, playful watercolor neon highlights
          const cardBgClass = isSolving 
            ? "border-cyan-400 dark:border-cyan-400 ring-4 ring-cyan-400/25 dark:ring-cyan-950 shadow-[0_4px_30px_rgba(6,182,212,0.18)] bg-gradient-to-tr from-rose-50/50 via-teal-50/30 to-sky-100/50 dark:from-rose-950/10 dark:via-cyan-950/15 dark:to-teal-950/10" 
            : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/80 shadow-sm";

          return (
            <div 
              key={item.id}
              draggable
              onDragStart={(e) => handleDragStart(e, item.id)}
              onDragOver={(e) => handleDragOver(e, item.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, item.id)}
              onDragEnd={handleDragEnd}
              className={`border rounded-2xl p-5 relative flex flex-col justify-between transition-all duration-250 select-none hover:shadow-md ${cardBgClass} ${
                dragOverId === item.id ? 'translate-y-1 scale-[1.01] border-dashed border-sky-400 bg-sky-50/20 dark:bg-sky-955/20' : ''
              } ${draggedId === item.id ? 'opacity-30' : ''}`}
            >
              {/* Playful watercolor blend blobs inside active solving card */}
              {isSolving && (
                <>
                  <div className="absolute -right-4 -top-4 w-32 h-32 bg-gradient-to-r from-cyan-400/30 dark:from-cyan-300/20 via-pink-400/10 to-transparent rounded-full blur-2xl pointer-events-none" />
                  <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-gradient-to-r from-indigo-400/20 dark:from-indigo-300/10 via-purple-300/5 to-transparent rounded-full blur-2xl pointer-events-none" />
                </>
              )}

              {/* Header inside card */}
              <div className="relative z-10">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5">
                    {/* Reorder drag node handle */}
                    <div className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-grab active:cursor-grabbing" title="Drag and Drop to change order">
                      <GripVertical className="w-4 h-4 text-slate-350 dark:text-slate-600" />
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold font-mono tracking-wider uppercase border flex items-center gap-1 ${badgeColor}`}>
                      {isSolving && <Sparkles className="w-3 h-3 text-cyan-600 animate-spin" />}
                      {isSolving ? 'Solving Mode' : item.status}
                    </span>

                    {isPinned && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] bg-amber-500/10 text-amber-600 border border-amber-500/20 font-bold font-mono">
                        Pinned 📌
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1 bg-white/50 dark:bg-slate-900/55 backdrop-blur-xs p-0.5 rounded-lg">
                    {/* Toggle Pin button */}
                    <button
                      onClick={(e) => handleTogglePin(item.id, e)}
                      className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                        isPinned 
                          ? 'text-amber-500 hover:text-amber-600 scale-110 drop-shadow-xs' 
                          : 'text-slate-400 dark:text-slate-550 hover:text-slate-700 dark:hover:text-white'
                      }`}
                      title={isPinned ? "Unpin paper" : "Pin paper to top"}
                    >
                      <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-current rotate-45' : ''}`} />
                    </button>

                    <button
                      onClick={() => {
                        const updated = assignments.map(a => a.id === item.id ? { ...a, enableLinkedNote: !a.enableLinkedNote } : a);
                        onUpdateDb({ assignments: updated });
                      }}
                      className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                        item.enableLinkedNote ? 'text-amber-500 bg-amber-500/10' : 'text-slate-400 dark:text-slate-550'
                      }`}
                      title={item.enableLinkedNote ? "Disable connected study note link" : "Enable connected study note link"}
                    >
                      🔗
                    </button>
                    <button
                      onClick={() => setEditingItem(item)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all cursor-pointer"
                      title="Edit Quest Details"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-955/25 text-slate-400 hover:text-rose-600 transition-all cursor-pointer"
                      title="Retire Quest"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {item.enableLinkedNote && (
                  <button
                    onClick={() => triggerLinkedNote(item.id, item.title, 'assignment')}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-300/40 text-amber-705 dark:text-amber-300 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs my-1 relative z-10"
                    title="Open connected study note"
                  >
                    <span>📝 Open Connected Note</span>
                  </button>
                )}

                <h3 className="text-base font-extrabold font-sans text-slate-800 dark:text-white hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors tracking-tight leading-snug">
                  {item.title}
                </h3>
                
                {item.description && (
                  <p className="text-xs text-slate-505 dark:text-slate-400 leading-relaxed mt-2 p-3 bg-slate-50/70 dark:bg-slate-950/70 rounded-xl border border-slate-100/70 dark:border-slate-850/50">
                    {item.description}
                  </p>
                )}
                    {/* Conditional Double Core Resources Link Section */}
                {(item.paperUrl || item.localPdfData || item.websiteUrl) && (
                  <div className="grid gap-2.5 my-3.5 grid-cols-1 sm:grid-cols-2">
                    {item.localPdfData && (
                      <button
                        onClick={() => handleDownloadOfflineAssignment(item.localPdfName || 'assignment_document.pdf', item.localPdfData!)}
                        className="p-2 bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/15 dark:border-blue-500/20 rounded-xl flex items-center gap-2 transition-all duration-150 hover:scale-[1.01] text-left cursor-pointer w-full"
                        title="Download/Open the local offline PDF document"
                      >
                        <div className="w-6.5 h-6.5 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="block text-[8px] font-mono uppercase text-blue-500 dark:text-blue-400 font-extrabold tracking-wider">Offline PDF</span>
                          <span className="text-[10px] font-sans text-slate-655 dark:text-slate-300 font-semibold truncate block">{item.localPdfName || 'View offline paper'}</span>
                        </div>
                      </button>
                    )}

                    {item.paperUrl && (
                      <a
                        href={item.paperUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/15 dark:border-rose-500/20 rounded-xl flex items-center gap-2 transition-all duration-150 hover:scale-[1.01] w-full"
                        title="Open external online PDF reference link"
                      >
                        <div className="w-6.5 h-6.5 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-450 shrink-0">
                          <ExternalLink className="w-3.5 h-3.5 text-rose-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="block text-[8px] font-mono uppercase text-rose-500 dark:text-rose-455 font-extrabold tracking-wider">Online Link</span>
                          <span className="text-[10px] font-sans text-slate-655 dark:text-slate-300 font-semibold truncate block">Remote reference</span>
                        </div>
                      </a>
                    )}

                    {item.websiteUrl && (
                      <a
                        href={item.websiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="col-span-full p-2 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/15 dark:border-emerald-500/20 rounded-xl flex items-center gap-2 transition-all duration-150 hover:scale-[1.01] w-full"
                        title="Open website problem portal connection"
                      >
                        <div className="w-6.5 h-6.5 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-650 dark:text-emerald-450 shrink-0">
                          <Globe className="w-3.5 h-3.5 text-emerald-500 animate-spin-slow" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="block text-[8px] font-mono uppercase text-emerald-600 dark:text-emerald-450 font-extrabold tracking-wider">Problem Portal Connection Link</span>
                          <span className="text-[10px] font-sans text-slate-655 dark:text-slate-300 font-semibold truncate block">{item.websiteUrl}</span>
                        </div>
                      </a>
                    )}
                  </div>
                )}

                {/* Personal Epiphany Notes */}
                {item.notes && (
                  <div className="space-y-1 mb-3 pt-0.5">
                    <span className="text-[9px] font-mono font-extrabold tracking-wider text-slate-455 uppercase block">Epiphany & Edge Cases:</span>
                    <p className="text-[11px] font-sans bg-amber-500/5 dark:bg-amber-950/15 text-slate-655 dark:text-slate-350 px-3 py-2 rounded-xl border border-amber-500/10 dark:border-amber-500/20 leading-relaxed font-semibold">
                      💡 {item.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Playful Interactive "Solve this Assignment" Trigger */}
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex flex-col gap-2.5 relative z-10">
                <button
                  onClick={(e) => handleToggleSolving(item.id, e)}
                  className={`w-full py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
                    isSolving
                      ? 'bg-cyan-500 hover:bg-cyan-600 text-white shadow-xs shadow-cyan-500/10 animate-pulse'
                      : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-350 border border-slate-200/60 dark:border-slate-850'
                  }`}
                >
                  {isSolving ? (
                    <>
                      <Flame className="w-3.5 h-3.5 text-white animate-bounce" />
                      <span>✨ SOLVING NOW (TOP PRIORITY)</span>
                    </>
                  ) : (
                    <>
                      <BrainCircuit className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>🎯 START SOLVING ACTIVE RETRIEVAL</span>
                    </>
                  )}
                </button>

                {/* Status stage advance controller bar inside card */}
                <div>
                  <span className="block text-[8px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-0.5">Advance Stage Progress:</span>
                  <div className="grid grid-cols-4 gap-1 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl">
                    {([
                      { id: 'Awaiting Solution', label: 'Queue' },
                      { id: 'In Progress', label: 'solving' },
                      { id: 'Completed', label: 'solved' },
                      { id: 'Perfected', label: 'Mastered' }
                    ] as const).map((stage) => {
                      const isSelected = item.status === stage.id && !isSolving;
                      let activeBtnClass = "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-100";
                      if (isSelected) {
                        if (stage.id === 'In Progress') activeBtnClass = "bg-rose-500 text-white shadow-xs";
                        else if (stage.id === 'Completed') activeBtnClass = "bg-blue-500 text-white shadow-xs";
                        else if (stage.id === 'Perfected') activeBtnClass = "bg-emerald-500 text-white shadow-xs";
                        else activeBtnClass = "bg-amber-550 text-white shadow-xs";
                      }

                      return (
                        <button
                          key={stage.id}
                          onClick={() => handleChangeStatus(item.id, stage.id)}
                          className={`py-1 rounded-lg text-[9px] font-bold font-mono tracking-wide uppercase transition-all duration-150 cursor-pointer ${
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

            </div>
          );
        })}

        {sortedFiltered.length === 0 && (
          <div className="col-span-1 md:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-950 rounded-full flex items-center justify-center text-slate-400 mx-auto">
              <Award className="w-8 h-8 text-slate-350" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h4 className="font-bold font-sans text-slate-855 dark:text-slate-200">No Assignments Saved</h4>
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* PDF Reference Card: Supports BOTH Online & Offline link */}
                    <div className="p-4 rounded-2xl bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/10 space-y-3.5 animate-pulse-once">
                      <label className="flex items-center gap-1.5 text-xs font-bold font-sans text-rose-650 dark:text-rose-450">
                        <FileText className="w-4 h-4 text-rose-500" />
                        PDF Question Paper (Online and/or Local)
                      </label>
                      
                      <div className="space-y-1.5">
                        <span className="text-[9px] uppercase font-mono font-bold text-slate-400 block">Option A: Online PDF Link</span>
                        <input
                          type="url"
                          placeholder="e.g. https://stanford.edu/...pdf"
                          value={paperUrl}
                          onChange={(e) => setPaperUrl(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-rose-500/20 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                        />
                      </div>

                      <div className="h-[1px] bg-rose-500/10" />

                      <div className="space-y-1.5">
                        <span className="text-[9px] uppercase font-mono font-bold text-slate-400 block">Option B: Local Assignment PDF</span>
                        <input
                          type="file"
                          ref={assignmentFileRef}
                          accept="application/pdf"
                          onChange={(e) => handleAssignmentFileChange(e, false)}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => assignmentFileRef.current?.click()}
                          className="w-full py-2 px-3 rounded-lg border border-dashed border-rose-500/30 hover:border-rose-500 hover:bg-rose-500/5 flex items-center justify-center gap-1.5 transition-colors text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5 text-rose-500" />
                          {localPdfName ? (
                            <span className="truncate max-w-[150px] font-bold text-emerald-600">{localPdfName} ({localPdfSize})</span>
                          ) : (
                            <span>Fetch Local PDF from laptop</span>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Portal Web Link Card */}
                    <div className="p-4 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 flex flex-col justify-between space-y-3.5">
                      <div>
                        <label className="flex items-center gap-1.5 text-xs font-bold font-sans text-emerald-650 dark:text-emerald-450 mb-2">
                          <Globe className="w-4 h-4 text-emerald-500" />
                          Website Problem Portal Link
                        </label>
                        <input
                          type="url"
                          placeholder="e.g. https://leetcode.com/problems/..."
                          value={websiteUrl}
                          onChange={(e) => setWebsiteUrl(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-emerald-500/20 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-550/20 focus:border-emerald-550"
                        />
                      </div>
                      
                      <span className="text-[10px] text-emerald-600/85 dark:text-emerald-400/85 block leading-normal font-mono">
                        Hosts the active workspace, IDE, or submission portal details connected to this assignment.
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

                {/* Connection Checkbox */}
                <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-amber-500/5 border border-amber-500/10 animate-in fade-in">
                  <input
                    type="checkbox"
                    id="assignmentEnableLinkedNote"
                    checked={enableLinkedNote}
                    onChange={(e) => setEnableLinkedNote(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 accent-amber-500 cursor-pointer shrink-0"
                  />
                  <label htmlFor="assignmentEnableLinkedNote" className="text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer select-none">
                    Enable Connected Quick Note 🔗
                    <span className="block text-[10px] font-normal text-slate-400 mt-0.5">Creates a handy floating Study note linkage for active assignment coding/solving.</span>
                  </label>
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/10 space-y-3.5">
                      <label className="flex items-center gap-1.5 text-xs font-bold font-sans text-rose-650 dark:text-rose-455">
                        <FileText className="w-4 h-4 text-rose-500" />
                        PDF Question Paper (Online and/or Local)
                      </label>
                      
                      <div className="space-y-1.5">
                        <span className="text-[9px] uppercase font-mono font-bold text-slate-450 block">Option A: Online PDF Link</span>
                        <input
                          type="url"
                          value={editingItem.paperUrl || ''}
                          onChange={(e) => setEditingItem({ ...editingItem, paperUrl: e.target.value })}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-rose-500/20 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                        />
                      </div>

                      <div className="h-[1px] bg-rose-505/10" />

                      <div className="space-y-1.5">
                        <span className="text-[9px] uppercase font-mono font-bold text-slate-450 block">Option B: Local Assignment PDF</span>
                        <input
                          type="file"
                          ref={editAssignmentFileRef}
                          accept="application/pdf"
                          onChange={(e) => handleAssignmentFileChange(e, true)}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => editAssignmentFileRef.current?.click()}
                          className="w-full py-2.5 px-3 rounded-lg border border-dashed border-rose-500/30 hover:border-rose-500 hover:bg-rose-500/5 flex items-center justify-center gap-1.5 transition-colors text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5 text-rose-500" />
                          {editingItem.localPdfName ? (
                            <span className="truncate max-w-[150px] font-bold text-emerald-600">{editingItem.localPdfName} ({editingItem.localPdfSize})</span>
                          ) : (
                            <span>Fetch Local PDF from laptop</span>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 flex flex-col justify-between space-y-3.5">
                      <div>
                        <label className="flex items-center gap-1.5 text-xs font-bold font-sans text-emerald-650 dark:text-emerald-450 mb-2">
                          <Globe className="w-4 h-4 text-emerald-500" />
                          Website Problem Portal Link
                        </label>
                        <input
                          type="url"
                          value={editingItem.websiteUrl}
                          onChange={(e) => setEditingItem({ ...editingItem, websiteUrl: e.target.value })}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-emerald-500/20 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-550/20 focus:border-emerald-550"
                        />
                      </div>
                      
                      <span className="text-[10px] text-emerald-600/85 dark:text-emerald-400/85 block leading-normal font-mono">
                        Hosts the active workspace, IDE, or submission portal details connected to this assignment.
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

                {/* Connection Checkbox */}
                <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-amber-500/5 border border-amber-500/10 animate-in fade-in">
                  <input
                    type="checkbox"
                    id="editAssignmentEnableLinkedNote"
                    checked={!!editingItem.enableLinkedNote}
                    onChange={(e) => setEditingItem({ ...editingItem, enableLinkedNote: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500 accent-amber-500 cursor-pointer shrink-0"
                  />
                  <label htmlFor="editAssignmentEnableLinkedNote" className="text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer select-none">
                    Enable Connected Quick Note 🔗
                    <span className="block text-[10px] font-normal text-slate-400 mt-0.5">Creates a handy floating Study note linkage for active assignment coding/solving.</span>
                  </label>
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
