import React, { useState } from 'react';
import { 
  FileText, Search, Plus, Trash2, ExternalLink, Download, Layers, 
  Sparkles, AlertCircle, Check, HelpCircle 
} from 'lucide-react';
import { DatabaseState, PdfItem, Subtopic, Topic } from '../types';

interface AllPdfsViewProps {
  dbState: DatabaseState;
  onOpenSubtopic: (topicId: string, subtopicId: string) => void;
  onUpdateDb: (updates: Partial<DatabaseState>) => void;
}

export function AllPdfsView({ dbState, onOpenSubtopic, onUpdateDb }: AllPdfsViewProps) {
  const { topics, subtopics } = dbState;
  const pdfs = dbState.pdfs || [];

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('all');

  // Form states for adding globally
  const [newTitle, setNewTitle] = useState('');
  const [newFileName, setNewFileName] = useState('');
  const [newFileSize, setNewFileSize] = useState('1.5 MB');
  const [newUrl, setNewUrl] = useState('');
  const [newSubtopicId, setNewSubtopicId] = useState('');

  const getSubtopicPath = (subtopicId: string) => {
    const sub = subtopics.find(s => s.id === subtopicId);
    const topic = sub ? topics.find(t => t.id === sub.topicId) : null;
    return { sub, topic };
  };

  const handleDeleteItem = (itemId: string) => {
    const updated = pdfs.filter(p => p.id !== itemId);
    onUpdateDb({ pdfs: updated });
  };

  const handleAddPdfItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newFileName.trim() || !newSubtopicId) return;

    const newItem: PdfItem = {
      id: `pdf-${Date.now()}`,
      subtopicId: newSubtopicId,
      title: newTitle.trim(),
      fileName: newFileName.trim(),
      fileSize: newFileSize.trim() || '2.0 MB',
      url: newUrl.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    onUpdateDb({ pdfs: [...pdfs, newItem] });
    setNewTitle('');
    setNewFileName('');
    setNewFileSize('1.5 MB');
    setNewUrl('');
  };

  const handleDownloadOfflineData = (item: PdfItem) => {
    if (item.fileData) {
      // Create element link to trigger offline base64 buffer download
      const link = document.createElement('a');
      link.href = item.fileData;
      link.download = item.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (item.url) {
      window.open(item.url, '_blank');
    }
  };

  // Filter pdf items
  const filteredPdfs = pdfs.filter(p => {
    const { sub, topic } = getSubtopicPath(p.subtopicId);
    const query = searchTerm.toLowerCase();

    const matchesQuery = p.title.toLowerCase().includes(query) ||
      p.fileName.toLowerCase().includes(query) ||
      (p.url?.toLowerCase().includes(query) ?? false) ||
      (sub?.name.toLowerCase().includes(query) ?? false) ||
      (topic?.name.toLowerCase().includes(query) ?? false);

    const matchesTopic = selectedTopicId === 'all' || (sub?.topicId === selectedTopicId);

    return matchesQuery && matchesTopic;
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-200 text-left">
      
      {/* Header section */}
      <div>
        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">
          Global Reading Vault
        </p>
        <h2 className="text-4xl font-extrabold text-slate-900 mt-1 tracking-tight flex items-center gap-2.5">
          <FileText className="w-8 h-8 text-blue-500 shrink-0" />
          <span>Curriculum References & Whitepapers</span>
        </h2>
        <p className="text-sm font-medium text-slate-555 dark:text-slate-400 mt-2 font-sans">
          Index, download, and read PDF cheatsheets, RFC whitepapers, and academic citations uploaded to subtopic segments. Access base64 resource maps or open bookmarks directly.
        </p>
      </div>

      {/* Control Actions toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white dark:bg-slate-905 p-4 rounded-2xl border border-slate-200 dark:border-slate-850 shadow-3xs">
        {/* Search */}
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search reference books, filenames, bookmarks, academic category paths..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 font-sans"
          />
        </div>

        {/* Filters */}
        <div className="w-full sm:w-auto flex items-center gap-2">
          <Layers className="w-4 h-4 text-slate-405 shrink-0" />
          <select
            value={selectedTopicId}
            onChange={(e) => setSelectedTopicId(e.target.value)}
            className="w-full sm:w-auto px-4 py-2 border border-slate-202 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs outline-hidden text-slate-700 dark:text-slate-300 focus:border-blue-500 font-sans"
          >
            <option value="all">All Topics (Default)</option>
            {topics.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Global Add Item Section */}
      <div className="p-5 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-250 dark:border-slate-855">
        <h4 className="text-sm font-bold text-slate-905 dark:text-white flex items-center gap-1.5 mb-3">
          <Plus className="w-4 h-4 text-blue-500" />
          <span>Upload PDF Syllabus Document or Bookmark Link</span>
        </h4>
        <form onSubmit={handleAddPdfItem} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              required
              placeholder="Syllabus/PDF Title, e.g., ECMA-262 Specification Booklet"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-202 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-905 focus:outline-none"
            />
            <input
              type="text"
              required
              placeholder="Filename, e.g., ecma_spec_std.pdf"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-202 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-905 focus:outline-none"
            />
            <select
              required
              value={newSubtopicId}
              onChange={(e) => setNewSubtopicId(e.target.value)}
              className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-202 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 focus:outline-none"
            >
              <option value="">-- Attach to subtopic segment --</option>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Estimate File Size (e.g. 2.4 MB or 150 KB)"
              value={newFileSize}
              onChange={(e) => setNewFileSize(e.target.value)}
              className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-202 bg-white text-slate-905 focus:outline-none"
            />
            <input
              type="url"
              placeholder="External Reference Web link, e.g., HTTPS PDF paper bookmark (optional)"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-202 bg-white text-slate-905 focus:outline-none animate-fade-in"
            />
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 bg-blue-650 hover:bg-blue-555 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Publish Reference Log
          </button>
        </form>
      </div>

      {/* Main files rendering grid stack */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPdfs.map(item => {
          const { sub, topic } = getSubtopicPath(item.subtopicId);

          return (
            <div 
              key={item.id}
              className="bg-white dark:bg-slate-900 border border-slate-202 dark:border-slate-850 rounded-2xl p-5 flex flex-col justify-between gap-4 transition-colors hover:border-blue-400 dark:hover:border-slate-750 shadow-3xs text-left"
            >
              {/* Top metadata row */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-1">
                  {sub && topic ? (
                    <button
                      onClick={() => onOpenSubtopic(topic.id, sub.id)}
                      className="inline-flex items-center gap-1.5 text-slate-500 hover:text-blue-650 text-[10px] font-bold font-mono tracking-wide truncate transition-colors cursor-pointer"
                    >
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: topic.color }} />
                      <span>{topic.name}</span>
                      <span className="text-slate-400 font-sans">➔</span>
                      <span className="underline truncate">{sub.name}</span>
                    </button>
                  ) : (
                    <span className="text-[9px] text-slate-400 font-mono">Attachment</span>
                  )}

                  <span className="text-[10px] font-mono bg-slate-100 text-slate-650 px-2 py-0.5 rounded">
                    {item.fileSize}
                  </span>
                </div>

                {/* File Title and Filename */}
                <h4 className="text-sm font-extrabold text-slate-900 leading-snug line-clamp-2">
                  {item.title}
                </h4>

                <p className="text-xs text-slate-450 truncate font-mono bg-slate-50 px-2.5 py-1.5 rounded-lg border">
                  📄 {item.fileName}
                </p>
              </div>

              {/* Interaction actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadOfflineData(item)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-sans text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>

                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 text-slate-450 hover:text-blue-605 rounded-lg hover:bg-slate-100/60 transition-colors"
                      title="Open bookmark external reference URL"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>

                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="p-1.5 text-slate-404 hover:text-red-500 rounded-lg hover:bg-slate-55 transition-colors cursor-pointer"
                  title="Remove reference bookmark"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}

        {filteredPdfs.length === 0 && (
          <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-205 dark:border-slate-855 rounded-3xl bg-slate-50/10 animate-fade-in">
            <AlertCircle className="w-10 h-10 text-slate-450 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-sans font-medium text-sm">
              No attached documents, specifications or PDF bookmarks match selected parameters.
            </p>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Add a document bookmark above or load individual study topics inside.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
