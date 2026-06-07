import React, { useState } from 'react';
import { 
  Folder, Search, Plus, Trash2, ArrowRight, Layers, FileText, 
  Video, Lightbulb, ClipboardCheck, BookOpen, Clock, Tag, SortAsc, HelpCircle, AlertCircle
} from 'lucide-react';
import { DatabaseState, Topic, Subtopic } from '../types';

interface AllTopicshelfViewProps {
  dbState: DatabaseState;
  onSelectView: (view: string) => void;
  onOpenSubtopic: (topicId: string, subtopicId: string) => void;
  onAddTopic: (topic: Omit<Topic, 'id' | 'createdAt'>) => void;
  onDeleteTopic: (topicId: string) => void;
  onUpdateDb?: (updates: Partial<DatabaseState>) => void;
}

// Map the stored icon names to lucide components
import { 
  GraduationCap, Code, Database, Cloud, Cpu, Atom, Terminal, Globe,
  BrainCircuit, Compass, Sparkles, Coffee, Lock, Server, Landmark,
  GripVertical
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  'graduation-cap': GraduationCap,
  'code': Code,
  'database': Database,
  'cloud': Cloud,
  'cpu': Cpu,
  'layers': Layers,
  'atom': Atom,
  'terminal': Terminal,
  'globe': Globe,
  'brain': BrainCircuit,
  'sparkle': Sparkles,
  'compass': Compass,
  'coffee': Coffee,
  'lock': Lock,
  'pdf': FileText,
  'server': Server,
  'landmark': Landmark
};

export function AllTopicshelfView({
  dbState,
  onSelectView,
  onOpenSubtopic,
  onAddTopic,
  onDeleteTopic,
  onUpdateDb
}: AllTopicshelfViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'manual' | 'name' | 'newest' | 'resources'>('manual');
  const [colorFilter, setColorFilter] = useState<string>('all');

  // Drag and drop states for Topicshelf cards
  const [draggedTopicId, setDraggedTopicId] = useState<string | null>(null);
  const [dragOverTopicId, setDragOverTopicId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    setDraggedTopicId(id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedTopicId !== id) {
      setDragOverTopicId(id);
    }
  };

  const handleDragLeave = () => {
    setDragOverTopicId(null);
  };

  const handleDragEnd = () => {
    setDraggedTopicId(null);
    setDragOverTopicId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedTopicId || draggedTopicId === targetId) return;

    const sourceIdx = topics.findIndex(t => t.id === draggedTopicId);
    const targetIdx = topics.findIndex(t => t.id === targetId);

    if (sourceIdx !== -1 && targetIdx !== -1) {
      const updated = [...topics];
      const [movedItem] = updated.splice(sourceIdx, 1);
      // find target index again after splice
      const newTargetIdx = updated.findIndex(t => t.id === targetId);
      updated.splice(newTargetIdx, 0, movedItem);
      if (onUpdateDb) {
        onUpdateDb({ topics: updated });
      }
    }

    setDraggedTopicId(null);
    setDragOverTopicId(null);
  };
  
  // Modal state for quick add topic 
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicDesc, setNewTopicDesc] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('code');
  const [selectedColor, setSelectedColor] = useState('#556b2f');

  const topics = dbState.topics || [];
  const subtopics = dbState.subtopics || [];

  const handleCreateTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicName.trim()) return;

    onAddTopic({
      name: newTopicName,
      description: newTopicDesc,
      icon: selectedIcon,
      color: selectedColor
    });

    setNewTopicName('');
    setNewTopicDesc('');
    setSelectedIcon('code');
    setSelectedColor('#556b2f');
    setIsAddModalOpen(false);
  };

  // Helper inside card: counts of nested subtopics and assets
  const getTopicMetrics = (topicId: string) => {
    const matchedSubs = subtopics.filter(s => s.topicId === topicId);
    const subIds = matchedSubs.map(s => s.id);

    const pdfCount = (dbState.pdfs || []).filter(p => subIds.includes(p.subtopicId)).length;
    const notesCount = (dbState.notes || []).filter(n => subIds.includes(n.subtopicId)).length;
    const videoCount = (dbState.videos || []).filter(v => subIds.includes(v.subtopicId)).length;
    const conceptCount = (dbState.concepts || []).filter(c => subIds.includes(c.subtopicId)).length;
    const quizCount = (dbState.quizzes || []).filter(q => subIds.includes(q.subtopicId)).length;
    const codingCount = (dbState.coding || []).filter(co => subIds.includes(co.subtopicId)).length;

    const totalResources = pdfCount + notesCount + videoCount + conceptCount + quizCount + codingCount;

    return {
      subtopicCount: subIds.length,
      pdfCount,
      notesCount,
      videoCount,
      conceptCount,
      quizCount,
      codingCount,
      totalResources,
      matchedSubs
    };
  };

  // Extract all unique color values used to populate filters
  const uniqueColors = Array.from(new Set(topics.map(t => t.color)));

  // Filter & Sort core
  const filteredTopics = topics
    .filter(topic => {
      const matchSearch = topic.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          topic.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchColor = colorFilter === 'all' || topic.color === colorFilter;
      return matchSearch && matchColor;
    });

  if (sortBy === 'name') {
    filteredTopics.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortBy === 'resources') {
    filteredTopics.sort((a, b) => {
      const metA = getTopicMetrics(a.id).totalResources;
      const metB = getTopicMetrics(b.id).totalResources;
      return metB - metA; // descending
    });
  } else if (sortBy === 'newest') {
    filteredTopics.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
  }
  // Keep original order if sortBy === 'manual' (the manual drag sequence)

  // Global Shelf Statistics
  const totalGlobalResources = topics.reduce((acc, topic) => acc + getTopicMetrics(topic.id).totalResources, 0);
  const totalSubtopics = subtopics.length;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-200">
      
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="text-left">
          <p className="text-[10px] font-black text-blue-500 dark:text-blue-450 uppercase tracking-widest font-mono">
            VIRTUAL SHELF INVENTORY
          </p>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1 tracking-tight font-sans">
            Global Topicshelf
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-sans">
            Manage your high-level structured learning modules, check curriculum stats, and configure knowledge folders.
          </p>
        </div>

        <div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 border border-blue-500/20 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-xl transition-all cursor-pointer font-mono shadow-3xs flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>NEW TOPIC</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric Boards (Bento Shelf Stats) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-805 p-5 rounded-2xl text-left shadow-3xs">
          <p className="text-[9px] font-bold text-slate-405 dark:text-slate-505 uppercase tracking-widest font-mono">Cataloged Classes</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">{topics.length}</span>
            <span className="text-xs text-slate-400 font-sans">Modules Active</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-blue-500 h-full rounded-full" style={{ width: `${Math.min(100, (topics.length / 12) * 100)}%` }} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-805 p-5 rounded-2xl text-left shadow-3xs">
          <p className="text-[9px] font-bold text-slate-405 dark:text-slate-505 uppercase tracking-widest font-mono">Knowledge Folders</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">{totalSubtopics}</span>
            <span className="text-xs text-slate-400 font-sans">Subtopic Bundles</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, (totalSubtopics / 36) * 105)}%` }} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-805 p-5 rounded-2xl text-left shadow-3xs">
          <p className="text-[9px] font-bold text-slate-405 dark:text-slate-505 uppercase tracking-widest font-mono">Global Materials Index</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">{totalGlobalResources}</span>
            <span className="text-xs text-slate-400 font-sans">Total Assets Loaded</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-none mt-3.5 font-sans italic">
            Includes PDFs, code tests, interactive quiz matrices & videos.
          </p>
        </div>
      </div>

      {/* 3. Search and Sort Filter Bar */}
      <div className="bg-white dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-202 dark:border-slate-802/80 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search topic shelf..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-202 dark:border-slate-802 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          
          {/* SORT SELECT */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <SortAsc className="w-3.5 h-3.5" />
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-202 dark:border-slate-802 rounded-xl text-[11px] font-bold px-2 py-1.5 focus:outline-none cursor-pointer"
            >
              <option value="manual">Order: Custom Drag & Drop</option>
              <option value="newest">Order: Date Added</option>
              <option value="name">Order: Alphabetical</option>
              <option value="resources">Order: Asset Density</option>
            </select>
          </div>

          {/* PALETTE FILTER */}
          <div className="flex items-center gap-1.5">
            <select
              value={colorFilter}
              onChange={(e) => setColorFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-202 dark:border-slate-802 rounded-xl text-[11px] font-bold px-2.5 py-1.5 focus:outline-none cursor-pointer"
            >
              <option value="all">Themes: All Colors</option>
              {uniqueColors.map(color => (
                <option key={color} value={color} style={{ color: color }}>
                  Color Badge: {color}
                </option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* 4. Folder Shelf Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {filteredTopics.map(topic => {
          const metrics = getTopicMetrics(topic.id);
          const IconComponent = ICON_MAP[topic.icon] || GraduationCap;
          const isOver = dragOverTopicId === topic.id;
          const isDragged = draggedTopicId === topic.id;

          return (
            <div
              key={topic.id}
              draggable={sortBy === 'manual'}
              onDragStart={(e) => handleDragStart(e, topic.id)}
              onDragOver={(e) => handleDragOver(e, topic.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, topic.id)}
              onDragEnd={handleDragEnd}
              className={`group bg-white dark:bg-slate-900 border rounded-3xl overflow-hidden shadow-2xs hover:shadow-md transition-all duration-200 text-left flex flex-col justify-between select-none ${
                isOver ? 'border-dashed border-blue-500 bg-blue-50/10 dark:bg-blue-950/20 translate-y-1 scale-[1.01]' : 'border-slate-205 dark:border-slate-805'
              } ${isDragged ? 'opacity-30' : ''}`}
            >
              <div className="p-6 space-y-4">
                
                {/* Upper folder label tab layout */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {sortBy === 'manual' && (
                      <div 
                        className="cursor-grab active:cursor-grabbing p-1 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-lg text-slate-400 dark:text-slate-600 transition-colors" 
                        title="Drag to reorder topic"
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>
                    )}
                    <div 
                      className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-200"
                      style={{ backgroundColor: `${topic.color}15`, color: topic.color }}
                    >
                      <IconComponent className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full" style={{ backgroundColor: `${topic.color}15`, color: topic.color }}>
                      {metrics.subtopicCount} Subtopics
                    </span>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Are you sure you want to delete "${topic.name}" and all associated resource indexes?`)) {
                          onDeleteTopic(topic.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
                      title="Delete topic folder"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Info block */}
                <div>
                  <h3 className="text-lg font-black text-slate-950 dark:text-white group-hover:text-blue-500 transition-colors leading-tight">
                    {topic.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-405 mt-1 line-clamp-2 leading-relaxed">
                    {topic.description || 'No customized description added for this topic module yet.'}
                  </p>
                </div>

                {/* Embedded dynamic nested assets grids */}
                <div className="grid grid-cols-3 gap-2 py-1">
                  
                  <div className="bg-slate-50 dark:bg-slate-950/40 p-2 rounded-xl text-center border border-slate-100 dark:border-slate-850/30">
                    <p className="text-[10px] font-black text-slate-400 uppercase font-mono tracking-wider">PDFs</p>
                    <p className="text-xs font-extrabold text-slate-800 dark:text-slate-205 font-mono mt-0.5">{metrics.pdfCount}</p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950/40 p-2 rounded-xl text-center border border-slate-100 dark:border-slate-850/30">
                    <p className="text-[10px] font-black text-slate-400 uppercase font-mono tracking-wider">Videos</p>
                    <p className="text-xs font-extrabold text-slate-800 dark:text-slate-205 font-mono mt-0.5">{metrics.videoCount}</p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950/40 p-2 rounded-xl text-center border border-slate-100 dark:border-slate-850/30">
                    <p className="text-[10px] font-black text-slate-400 uppercase font-mono tracking-wider">Trivia</p>
                    <p className="text-xs font-extrabold text-slate-800 dark:text-slate-205 font-mono mt-0.5">{metrics.quizCount}</p>
                  </div>

                </div>

                {/* Subtopics folder micro-tags */}
                {metrics.matchedSubs.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">Index Preview</p>
                    <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto scrollbar-none">
                      {metrics.matchedSubs.slice(0, 4).map(sub => (
                        <button
                          key={sub.id}
                          onClick={() => onOpenSubtopic(topic.id, sub.id)}
                          className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 px-2.5 py-0.5 rounded-md border border-slate-150 dark:border-slate-800 truncate select-none cursor-pointer"
                        >
                          {sub.name}
                        </button>
                      ))}
                      {metrics.matchedSubs.length > 4 && (
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 font-mono self-center">
                          +{metrics.matchedSubs.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

              </div>

              {/* Card Footer action block */}
              <div className="px-6 py-4.5 bg-slate-50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1 font-mono">
                  <Clock className="w-3 h-3" />
                  {new Date(topic.createdAt || '').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>

                <button
                  onClick={() => onSelectView(topic.id)}
                  className="px-3.5 py-1.5 bg-white hover:bg-slate-50 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-100 border border-slate-200 dark:border-slate-800 text-[11px] font-bold font-mono rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>Open Shelf</span>
                  <ArrowRight className="w-3 h-3 text-slate-405 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

            </div>
          );
        })}

        {/* 5. ADD NEW TOPIC DASHED OPTION */}
        <div
          onClick={() => setIsAddModalOpen(true)}
          className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-500/55 rounded-3xl p-8 flex flex-col items-center justify-center text-center gap-2 group cursor-pointer transition-all min-h-[300px]"
        >
          <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-900 group-hover:bg-blue-500/10 flex items-center justify-center transition-colors shadow-3xs">
            <Plus className="w-6 h-6 text-slate-400 group-hover:text-blue-500 transition-colors" />
          </div>
          <div>
            <h4 className="text-md font-black text-slate-900 dark:text-white">Register Study Topic</h4>
            <p className="text-xs text-slate-500 dark:text-slate-405 mt-1 max-w-xs leading-relaxed">
              Begin a new module structure. Create customized icons, select a highlight topic theme, and begin organizing subtopics.
            </p>
          </div>
        </div>

      </div>

      {filteredTopics.length === 0 && (
        <div className="bg-white dark:bg-slate-900/35 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center max-w-lg mx-auto space-y-3">
          <AlertCircle className="w-10 h-10 text-slate-400 mx-auto" />
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Zero active records in shelf</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            There are no registered topics that match this query. Try choosing another color pallet or registering a new topic path.
          </p>
        </div>
      )}

      {/* Topicshelf Add Topic Modal Popup */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-md w-full rounded-2xl p-6 relative shadow-2xl animate-in zoom-in-95 duration-100 text-left">
            
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white font-sans tracking-tight">
              Create New Study Segment
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Add a brand new course container or technical framework category here on the Topicshelf.
            </p>

            <form onSubmit={handleCreateTopic} className="mt-5 space-y-4">
              
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase font-mono tracking-wider">Topic Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Docker & Kubernetes"
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase font-mono tracking-wider">Brief Concept Overview</label>
                <textarea
                  placeholder="Summarize key competencies, exam references, or curriculum objectives..."
                  value={newTopicDesc}
                  onChange={(e) => setNewTopicDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-805 rounded-xl text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all h-20 resize-none"
                />
              </div>

              {/* Icon selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase font-mono tracking-wider">Aesthetic Icon Representation</label>
                <div className="grid grid-cols-6 gap-2 max-h-28 overflow-y-auto border border-slate-100 dark:border-slate-805 p-2 rounded-xl bg-slate-50 dark:bg-slate-950 scrollbar-thin">
                  {Object.keys(ICON_MAP).map(iconKey => {
                    const VisualIcon = ICON_MAP[iconKey];
                    const isSelected = selectedIcon === iconKey;
                    return (
                      <button
                        key={iconKey}
                        type="button"
                        onClick={() => setSelectedIcon(iconKey)}
                        className={`aspect-square flex items-center justify-center rounded-xl border transition-all ${
                          isSelected 
                            ? 'bg-blue-500/10 text-blue-500 border-blue-500/60' 
                            : 'bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800 hover:text-slate-650'
                        }`}
                      >
                        <VisualIcon className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color picker selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase font-mono tracking-wider">Color Theme Tag</label>
                <div className="flex flex-wrap gap-2.5">
                  {[
                    '#556b2f', // Olive Drab
                    '#6b8243', // Olive Green
                    '#3b5220', // Forest Green
                    '#7a8c6a', // Sage Green
                    '#059669', // Emerald
                    '#84cc16', // Lime Mint
                    '#cd853f', // Earthy Amber
                    '#826c36', // Thick Bronze
                    '#3b82f6', // Bright Blue
                    '#8b5cf6', // Indigo Violet
                    '#f43f5e'  // Deep Rose
                  ].map(colorHex => {
                    const isSelected = selectedColor === colorHex;
                    return (
                      <button
                        key={colorHex}
                        type="button"
                        onClick={() => setSelectedColor(colorHex)}
                        style={{ backgroundColor: colorHex }}
                        className={`w-6 h-6 rounded-full transition-transform text-white flex items-center justify-center relative ${
                          isSelected ? 'scale-115 ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900 shadow-sm' : 'opacity-70 hover:opacity-100'
                        }`}
                        title={colorHex}
                      >
                        {isSelected && <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action operations buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-805">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-slate-500 hover:text-slate-805 text-xs font-bold font-mono transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black font-mono uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Create Topic
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
