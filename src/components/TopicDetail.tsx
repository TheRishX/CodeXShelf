import React, { useState } from 'react';
import { 
  ArrowLeft, Edit3, Trash2, Plus, Sparkles, ChevronRight, X,
  GraduationCap, Code, Database, Cloud, Cpu, Layers, Atom, Terminal, Globe, Coffee, Lock
} from 'lucide-react';
import { Topic, Subtopic } from '../types';

interface TopicDetailProps {
  topic: Topic;
  subtopics: Subtopic[];
  onBack: () => void;
  onOpenSubtopic: (subtopicId: string) => void;
  onAddSubtopic: (name: string, description: string) => void;
  onUpdateTopic: (name: string, description: string) => void;
  onDeleteTopic: () => void;
  onDeleteSubtopic: (subtopicId: string) => void;
}

const AVAILABLE_ICONS = [
  { name: 'graduation-cap', icon: GraduationCap },
  { name: 'code', icon: Code },
  { name: 'database', icon: Database },
  { name: 'cloud', icon: Cloud },
  { name: 'cpu', icon: Cpu },
  { name: 'layers', icon: Layers },
  { name: 'atom', icon: Atom },
  { name: 'terminal', icon: Terminal },
  { name: 'globe', icon: Globe },
  { name: 'coffee', icon: Coffee },
  { name: 'lock', icon: Lock }
];

export function TopicDetail({
  topic,
  subtopics,
  onBack,
  onOpenSubtopic,
  onAddSubtopic,
  onUpdateTopic,
  onDeleteTopic,
  onDeleteSubtopic
}: TopicDetailProps) {
  const [newSubModalOpen, setNewSubModalOpen] = useState(false);
  const [editTopicModalOpen, setEditTopicModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [subtopicToDelete, setSubtopicToDelete] = useState<Subtopic | null>(null);

  // Form states for Subtopic creation
  const [subName, setSubName] = useState('');
  const [subDesc, setSubDesc] = useState('');

  // Form states for Topic edit
  const [editName, setEditName] = useState(topic.name);
  const [editDesc, setEditDesc] = useState(topic.description || '');

  const handleCreateSubtopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName.trim()) return;

    onAddSubtopic(subName, subDesc);

    // Reset forms
    setSubName('');
    setSubDesc('');
    setNewSubModalOpen(false);
  };

  const handleSaveTopicEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;

    onUpdateTopic(editName, editDesc);
    setEditTopicModalOpen(false);
  };

  // Find corresponding topic icon
  const iconItem = AVAILABLE_ICONS.find(i => i.name === topic.icon) || AVAILABLE_ICONS[0];
  const TopicIconComp = iconItem.icon;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-200">
      
      {/* Upper breadcrumbs row */}
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Dashboard</span>
        </button>
      </div>

      {/* Main header row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-150 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <div 
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm"
            style={{ backgroundColor: topic.color }}
          >
            <TopicIconComp className="w-7 h-7" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-mono tracking-widest text-slate-400 dark:text-slate-500 font-bold">
              Topic
            </p>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1 leading-none tracking-tight font-sans">
              {topic.name}
            </h2>
            {topic.description && (
              <p className="text-xs text-slate-555 dark:text-slate-400 mt-2 max-w-xl font-sans">
                {topic.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setEditName(topic.name);
              setEditDesc(topic.description);
              setEditTopicModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-705 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-xs uppercase tracking-wider font-mono transition-all cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Edit</span>
          </button>
          <button
            onClick={() => setDeleteConfirmOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100/55 dark:bg-red-955/20 dark:hover:bg-red-955/35 text-red-650 dark:text-red-400 border border-red-200/50 dark:border-red-900/30 rounded-xl font-semibold text-xs uppercase tracking-wider font-mono transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Subtopics Listing Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white font-sans">
            Subtopics
          </h3>
          <button
            onClick={() => setNewSubModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider font-mono shadow active:scale-98 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>New subtopic</span>
          </button>
        </div>

        {/* Subtopic Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subtopics.map(sub => (
            <div
              key={sub.id}
              onClick={() => onOpenSubtopic(sub.id)}
              className="bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow hover:border-slate-300 dark:hover:border-slate-705 hover:scale-[1.01] transition-all cursor-pointer flex flex-col justify-between min-h-[140px]"
            >
              <div>
                <div className="flex items-start justify-between gap-4">
                  <h4 className="text-lg font-bold font-sans text-slate-900 dark:text-white tracking-tight">
                    {sub.name}
                  </h4>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSubtopicToDelete(sub);
                    }}
                    className="p-1 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-all cursor-pointer"
                    title="Delete subtopic"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {sub.description && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                    {sub.description}
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4 flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-blue-400">
                <span className="uppercase tracking-wider font-mono text-[10px] text-slate-400 font-bold">Open resources</span>
                <ChevronRight className="w-4.5 h-4.5" />
              </div>
            </div>
          ))}

          {subtopics.length === 0 && (
            <div className="col-span-full py-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6 bg-slate-50/40 dark:bg-slate-900/10">
              <Sparkles className="w-8 h-8 text-blue-500/30 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-900 dark:text-white">No subtopics registered</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1 leading-relaxed">
                Click "+ New subtopic" on the right to start defining curriculum units.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New Subtopic Modal Popup */}
      {newSubModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setNewSubModalOpen(false)} className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs" />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-4">
              New subtopic
            </h3>
            <form onSubmit={handleCreateSubtopic} className="space-y-4">
              <div>
                <label className="block text-xs font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-2 font-mono">
                  Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Closures & Scope"
                  value={subName || ''}
                  onChange={(e) => setSubName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-202 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans"
                />
              </div>
              <div>
                <label className="block text-xs font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-2 font-mono">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="optional"
                  value={subDesc || ''}
                  onChange={(e) => setSubDesc(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-202 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setNewSubModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-805 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-550 text-white text-sm font-semibold shadow-md active:scale-98 transition-all"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Topic Modal Popup */}
      {editTopicModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setEditTopicModalOpen(false)} className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs" />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-4">
              Edit topic
            </h3>
            <form onSubmit={handleSaveTopicEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-2 font-mono">
                  Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Topic name"
                  value={editName || ''}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-202 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans"
                />
              </div>
              <div>
                <label className="block text-xs font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-2 font-mono">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Topic summary"
                  value={editDesc || ''}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-202 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-808">
                <button
                  type="button"
                  onClick={() => setEditTopicModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-555 hover:bg-slate-50 dark:hover:bg-slate-805 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-550 text-white text-sm font-semibold shadow-md transition-all"
                >
                  Save changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setDeleteConfirmOpen(false)} className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs" />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-2xl shrink-0 shadow-sm">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-lg text-slate-900 dark:text-white leading-tight">
                  Delete "{topic.name}"?
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2.5 leading-relaxed">
                  Are you absolutely sure you want to delete this topic? Deleting this topic will permanently remove all of its nested subtopics, study notes, PDFs, quizzes, and other study resources. This operation cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-4 mt-5 border-t border-slate-105 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-55 dark:hover:bg-slate-805 text-xs font-semibold uppercase tracking-wider font-mono transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  onDeleteTopic();
                }}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold uppercase tracking-wider font-mono shadow-md transition-all cursor-pointer active:scale-95"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subtopic Deletion Confirmation Modal */}
      {subtopicToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setSubtopicToDelete(null)} className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs" />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-55 dark:bg-red-955/20 text-red-650 dark:text-red-400 rounded-2xl shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-lg text-slate-950 dark:text-white leading-tight">
                  Delete subtopic?
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2.5 leading-relaxed">
                  Are you absolutely sure you want to delete <strong className="text-slate-900 dark:text-slate-100">"{subtopicToDelete.name}"</strong>? Deleting this unit will permanently remove all associated notes, PDFs, quizzes, videos and study resources. This operation cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-4 mt-5 border-t border-slate-105 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSubtopicToDelete(null)}
                className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-55 dark:hover:bg-slate-805 text-xs font-semibold uppercase tracking-wider font-mono transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteSubtopic(subtopicToDelete.id);
                  setSubtopicToDelete(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold uppercase tracking-wider font-mono shadow-md transition-all cursor-pointer active:scale-95"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
