import React, { useState, useRef } from 'react';
import { 
  FileText, Search, Plus, Trash2, ExternalLink, Download, Layers, 
  Sparkles, AlertCircle, Check, HelpCircle, X, ArrowLeft, ArrowRight, Upload, Link, GripVertical
} from 'lucide-react';
import { DatabaseState, PdfItem, Subtopic, Topic } from '../types';

interface AllPdfsViewProps {
  dbState: DatabaseState;
  onOpenSubtopic: (topicId: string, subtopicId: string) => void;
  onUpdateDb: (updates: Partial<DatabaseState>) => void;
  onSelectView?: (view: string) => void;
}

export function AllPdfsView({ dbState, onOpenSubtopic, onUpdateDb, onSelectView }: AllPdfsViewProps) {
  const { topics, subtopics } = dbState;
  const pdfs = dbState.pdfs || [];

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('all');

  // Drag and drop states for manual PDF reordering
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

    const sourceIdx = pdfs.findIndex(p => p.id === draggedId);
    const targetIdx = pdfs.findIndex(p => p.id === targetId);

    if (sourceIdx !== -1 && targetIdx !== -1) {
      const updated = [...pdfs];
      const [movedItem] = updated.splice(sourceIdx, 1);
      updated.splice(targetIdx, 0, movedItem);
      onUpdateDb({ pdfs: updated });
    }

    setDraggedId(null);
    setDragOverId(null);
  };

  // Pop-up Wizard states (condensed 2-step flow)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 1 or 2
  const [pdfType, setPdfType] = useState<'link' | 'upload'>('link');
  const [formTitle, setFormTitle] = useState('');
  const [formFileName, setFormFileName] = useState('');
  const [formFileSize, setFormFileSize] = useState('1.5 MB');
  const [formUrl, setFormUrl] = useState('');
  const [formSubtopicId, setFormSubtopicId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formEnableLinkedNote, setFormEnableLinkedNote] = useState(false);
  const [formError, setFormError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const getSubtopicPath = (subtopicId: string) => {
    const sub = subtopics.find(s => s.id === subtopicId);
    const topic = sub ? topics.find(t => t.id === sub.topicId) : null;
    return { sub, topic };
  };

  const handleDeleteItem = (itemId: string) => {
    const updated = pdfs.filter(p => p.id !== itemId);
    onUpdateDb({ pdfs: updated });
  };

  const markPdfAsReading = (pdfId: string) => {
    const updated = pdfs.map(p => {
      if (p.id === pdfId) {
        return {
          ...p,
          isReading: true,
          lastOpenedAt: new Date().toISOString(),
          status: (p.status === 'completed' ? 'completed' : 'reading') as 'unseen' | 'reading' | 'completed' | 'revision'
        };
      }
      return { ...p, isReading: false };
    });
    onUpdateDb({ pdfs: updated });
  };

  const updatePdfStatus = (pdfId: string, status: 'unseen' | 'reading' | 'completed' | 'revision') => {
    const updated = pdfs.map(p => {
      if (p.id === pdfId) {
        return {
          ...p,
          status,
          isCompleted: status === 'completed',
          needsRevision: status === 'revision',
          isReading: status === 'completed' ? false : p.isReading
        };
      }
      return p;
    });
    onUpdateDb({ pdfs: updated });
  };

  const handleOpenAddModal = () => {
    setFormTitle('');
    setFormFileName('');
    setFormFileSize('1.5 MB');
    setFormUrl('');
    setFormSubtopicId('');
    setSelectedFile(null);
    setFormEnableLinkedNote(false);
    setPdfType('link');
    setFormError('');
    setCurrentStep(1);
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setFormFileName(file.name);
      
      const estimated = file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${(file.size / 1024).toFixed(0)} KB`;
      setFormFileSize(estimated);

      if (!formTitle) {
        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
        setFormTitle(cleanName);
      }
      setFormError('');
    }
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!formUrl.trim() && !selectedFile) {
        setFormError('Please paste an online URL or select/upload a local PDF file.');
        return;
      }
      if (!formTitle.trim()) {
        setFormError('Please enter a document title.');
        return;
      }
      
      // If filename wasn't filled, parse it
      if (selectedFile) {
        setFormFileName(selectedFile.name);
      } else if (formUrl.trim()) {
        const urlStr = formUrl.trim();
        let extractedName = 'document.pdf';
        try {
          const pathname = new URL(urlStr).pathname;
          const filename = pathname.substring(pathname.lastIndexOf('/') + 1);
          if (filename && filename.includes('.') && filename.endsWith('.pdf')) {
            extractedName = filename;
          } else {
            extractedName = formTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_') + '.pdf';
          }
        } catch {
          extractedName = formTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_') + '.pdf';
        }
        setFormFileName(extractedName);
        setFormFileSize('External URL');
      }
      setFormError('');
      setCurrentStep(2);
    }
  };

  const handlePrevStep = () => {
    setFormError('');
    if (currentStep > 1) {
      setCurrentStep(1);
    }
  };

  const handleAddPdfItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formTitle.trim()) {
      setFormError('Please enter a document title.');
      return;
    }
    if (!formSubtopicId) {
      setFormError('Please associate with connected subtopic segment.');
      return;
    }

    const deliverItem = (base64data?: string) => {
      const newItem: PdfItem = {
        id: `pdf-${Date.now()}`,
        subtopicId: formSubtopicId,
        title: formTitle.trim(),
        fileName: base64data ? (selectedFile?.name || formFileName.trim() || 'local_document.pdf') : (formFileName.trim() || 'reference_document.pdf'),
        fileSize: base64data ? formFileSize : 'External URL',
        url: formUrl.trim() || undefined,
        fileData: base64data,
        createdAt: new Date().toISOString(),
        enableLinkedNote: formEnableLinkedNote
      };
      onUpdateDb({ pdfs: [...pdfs, newItem] });
      setIsModalOpen(false);
    };

    if (selectedFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        deliverItem(base64data);
      };
      reader.onerror = () => {
        setFormError('Failed to convert PDF binary file locally.');
      };
      reader.readAsDataURL(selectedFile);
    } else if (formUrl.trim()) {
      deliverItem();
    } else {
      setFormError('Please enter an online URL or select/upload a local PDF first.');
    }
  };

  const handleDownloadOfflineData = (item: PdfItem) => {
    if (item.fileData) {
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
      
      {/* Header section with inline CTA */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">
            Global Reading Vault
          </p>
          <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white mt-1 tracking-tight flex items-center gap-2.5">
            <FileText className="w-8 h-8 text-blue-500 shrink-0" />
            <span>Curriculum References & Whitepapers</span>
          </h2>
          <p className="text-sm font-medium text-slate-555 dark:text-slate-450 mt-2 font-sans max-w-3xl">
            Index, download, and read PDF cheatsheets, RFC whitepapers, and academic citations uploaded to subtopic segments. Drag and drop any reference card up, down, left, or right to customize your display sequence.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-5 py-3 bg-blue-600 hover:bg-blue-555 text-white text-xs font-black rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer self-start md:self-center shrink-0"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>Add PDF</span>
        </button>
      </div>

      {/* Control Actions toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-850 shadow-3xs">
        {/* Search */}
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-404" />
          <input
            type="text"
            placeholder="Search reference books, filenames, bookmarks, academic category paths..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 rounded-xl text-sm placeholder-slate-404 outline-hidden focus:border-blue-500 font-sans text-slate-900 dark:text-white"
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

      {/* Main files rendering grid stack */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPdfs.map(item => {
          const { sub, topic } = getSubtopicPath(item.subtopicId);
          const isReading = !!item.isReading;
          const status = item.status || 'unseen';

            // Decide border and background styles based on learning status
            let cardStyles = "border-slate-202 dark:border-slate-850 bg-white dark:bg-slate-900";
            let statusBadge = null;

            if (isReading) {
              cardStyles = "border-amber-400 dark:border-amber-500 bg-amber-50/[0.04] dark:bg-amber-955/[0.02] shadow-[0_0_15px_rgba(245,158,11,0.12)] ring-1 ring-amber-400/40";
            } else if (status === 'completed' || item.isCompleted) {
              cardStyles = "border-emerald-250 dark:border-emerald-900/60 bg-emerald-500/[0.005] dark:bg-emerald-950/[0.005]";
            } else if (status === 'revision' || item.needsRevision) {
              cardStyles = "border-indigo-250 dark:border-indigo-900/65 bg-indigo-500/[0.005] dark:bg-indigo-950/[0.005]";
            } else if (status === 'reading') {
              cardStyles = "border-amber-200 dark:border-amber-900/60 bg-amber-500/[0.005] dark:bg-amber-950/[0.005]";
            }

            switch (status) {
              case 'completed':
                statusBadge = <span className="text-[9px] font-black text-emerald-600 bg-emerald-100/60 dark:text-emerald-400 dark:bg-emerald-955/20 px-1.5 py-0.5 rounded">🎉 DONE</span>;
                break;
              case 'revision':
                statusBadge = <span className="text-[9px] font-black text-indigo-600 bg-indigo-100/60 dark:text-indigo-400 dark:bg-indigo-955/25 px-1.5 py-0.5 rounded">🔄 REVISE</span>;
                break;
              case 'reading':
                statusBadge = <span className="text-[9px] font-black text-amber-600 bg-amber-100/60 dark:text-amber-400 dark:bg-amber-955/20 px-1.5 py-0.5 rounded">📖 READING</span>;
                break;
              default:
                statusBadge = <span className="text-[9px] font-black text-slate-500 bg-slate-100 dark:text-slate-400 dark:bg-slate-800 px-1.5 py-0.5 rounded">⏳ UNREAD</span>;
            }

            return (
              <div 
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, item.id)}
                onDragOver={(e) => handleDragOver(e, item.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, item.id)}
                onDragEnd={handleDragEnd}
                onClick={() => markPdfAsReading(item.id)}
                className={`border rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all hover:border-blue-400 dark:hover:border-slate-700 shadow-3xs text-left cursor-grab active:cursor-grabbing ${cardStyles} ${
                  draggedId === item.id 
                    ? 'opacity-40 border-dashed border-blue-500 dark:border-blue-400 scale-95 shadow-sm bg-slate-50/50 dark:bg-slate-950/40' 
                    : ''
                } ${
                  dragOverId === item.id 
                    ? 'border-blue-500 dark:border-blue-400 scale-102 ring-2 ring-blue-500/20 bg-blue-50/10 dark:bg-blue-950/15' 
                    : ''
                }`}
              >
                {/* Top metadata row */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <GripVertical className="w-3.5 h-3.5 text-slate-400 shrink-0 cursor-grab hover:text-slate-600 dark:hover:text-slate-300" />
                      {sub && topic ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenSubtopic(topic.id, sub.id);
                          }}
                          className="inline-flex items-center gap-1.5 text-slate-505 hover:text-blue-650 text-[10px] font-bold font-mono tracking-wide truncate transition-colors cursor-pointer dark:hover:text-blue-450"
                        >
                          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: topic.color }} />
                          <span>{topic.name}</span>
                          <span className="text-slate-400 font-sans">➔</span>
                          <span className="underline truncate">{sub.name}</span>
                        </button>
                      ) : (
                        <span className="text-[9px] text-slate-400 font-mono">Attachment</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {statusBadge}
                      {isReading && (
                        <span className="text-[8px] font-black tracking-wider text-amber-605 bg-amber-500/15 px-1 py-0.5 rounded animate-pulse">
                          🔖 LAST READ
                        </span>
                      )}
                    </div>
                  </div>

                  {/* File Title and Filename */}
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white leading-snug line-clamp-2">
                    {item.title}
                  </h4>

                  <p className="text-xs text-slate-450 dark:text-slate-450 truncate font-mono bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 rounded-lg border dark:border-slate-805">
                    📄 {item.fileName} ({item.fileSize})
                  </p>
                </div>

                {/* Status Switcher segment */}
                <div className="flex items-center justify-between pb-1 pt-1 border-t border-b border-slate-100/60 dark:border-slate-805/60">
                  <span className="text-[9px] font-bold text-slate-400 font-mono uppercase">Status Selector:</span>
                  <div className="inline-flex bg-slate-100 dark:bg-slate-950 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); updatePdfStatus(item.id, 'unseen'); }}
                      className={`px-1.5 py-0.5 rounded text-[8px] font-bold cursor-pointer transition-all ${
                        status === 'unseen'
                          ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-3xs font-black'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Unread
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); updatePdfStatus(item.id, 'reading'); }}
                      className={`px-1.5 py-0.5 rounded text-[8px] font-bold cursor-pointer transition-all ${
                        status === 'reading'
                          ? 'bg-amber-500 text-white shadow-3xs font-black'
                          : 'text-slate-400 hover:text-amber-550'
                      }`}
                    >
                      Read
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); updatePdfStatus(item.id, 'completed'); }}
                      className={`px-1.5 py-0.5 rounded text-[8px] font-bold cursor-pointer transition-all ${
                        status === 'completed'
                          ? 'bg-emerald-600 text-white shadow-3xs font-black'
                          : 'text-slate-400 hover:text-emerald-555'
                      }`}
                    >
                      Done
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); updatePdfStatus(item.id, 'revision'); }}
                      className={`px-1.5 py-0.5 rounded text-[8px] font-bold cursor-pointer transition-all ${
                        status === 'revision'
                          ? 'bg-indigo-600 text-white shadow-3xs font-black'
                          : 'text-slate-400 hover:text-indigo-505'
                      }`}
                    >
                      Revise
                    </button>
                  </div>
                </div>

                {/* Interaction actions */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {item.fileData && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markPdfAsReading(item.id);
                          handleDownloadOfflineData(item);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-sans text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                        title="Open local offline PDF document"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>📁 Offline Option</span>
                      </button>
                    )}
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-750 dark:text-slate-200 font-sans text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                        title="Open external online reference link"
                        onClick={(e) => {
                          e.stopPropagation();
                          markPdfAsReading(item.id);
                        }}
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
                        <span>🌐 Online Option</span>
                      </a>
                    )}

                    {item.enableLinkedNote && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerLinkedNote(item.id, item.title, 'pdf');
                        }}
                        className="inline-flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-sans text-[10px] font-extrabold rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer border border-amber-500/20"
                        title="Open connected study note"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0 inline-block" />
                        <span>📝 Quick Note</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const updated = pdfs.map(p => p.id === item.id ? { ...p, enableLinkedNote: !p.enableLinkedNote } : p);
                        onUpdateDb({ pdfs: updated });
                      }}
                      className={`p-1 rounded-lg transition-colors cursor-pointer ${item.enableLinkedNote ? 'text-amber-500 bg-amber-500/10 hover:bg-amber-500/20' : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                      title={item.enableLinkedNote ? "Unlink Connected Note" : "Link Connected Note"}
                    >
                      <span className="text-[10px] font-extrabold leading-none">🔗</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteItem(item.id);
                      }}
                      className="p-1.5 text-slate-404 hover:text-red-500 rounded-lg hover:bg-slate-55 dark:hover:bg-slate-805 transition-colors cursor-pointer"
                      title="Remove reference bookmark"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
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

      {/* Pop-up Reference Wizard Modal (condensed 2-step flow) */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100"
        >
          {/* Modal box body */}
          <div 
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-lg shadow-2xl p-6 relative animate-in zoom-in-95 duration-150"
          >
            {/* Modal header details */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <FileText className="w-5 h-5 text-blue-500 shrink-0" />
                  <span>Curriculum PDF Reference Wizard</span>
                </h3>
                <p className="text-xs text-slate-405 font-medium">Link cheatsheets, specs or offline papers to syllabus</p>
              </div>

              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-404 cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Step progress indicators */}
            <div className="flex items-center justify-center gap-1.5 mb-6">
              {[1, 2].map(stepNum => (
                <div key={stepNum} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-all ${
                    currentStep === stepNum
                      ? 'bg-blue-600 text-white shadow-xs scale-105'
                      : currentStep > stepNum
                        ? 'bg-blue-100 text-blue-600 dark:bg-blue-950/45'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}>
                    {stepNum}
                  </div>
                  {stepNum < 2 && (
                    <div className={`w-12 h-0.5 mx-1 transition-colors ${currentStep > stepNum ? 'bg-blue-500' : 'bg-slate-100 dark:bg-slate-800'}`} />
                  )}
                </div>
              ))}
            </div>

            {/* Form Step flow */}
            <form onSubmit={handleAddPdfItemSubmit} className="space-y-4">
              {formError && (
                <div className="flex items-center gap-2 p-3.5 bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-300 text-xs font-semibold rounded-2xl border border-rose-105 dark:border-rose-900/30">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* STEP 1: Method Inputs */}
              {currentStep === 1 && (
                <div className="space-y-4 animate-in slide-in-from-right-3 duration-100">
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-slate-800 dark:text-white">
                      Custom Document Title *
                    </h4>
                    <input
                      type="text"
                      placeholder="e.g. Attention is All You Need Reference Book"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/55 dark:bg-slate-950 text-xs font-semibold outline-none focus:border-blue-500 text-slate-900 dark:text-white"
                      required
                    />
                  </div>

                  <div className="border border-slate-100 dark:border-slate-800 p-4 rounded-2xl bg-slate-50/40 dark:bg-slate-950/20 space-y-4">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-850 dark:text-slate-200 flex items-center gap-1.5 font-mono">
                        <Link className="w-4 h-4 text-emerald-500" />
                        <span>Option 1: Paste Online Document PDF Link (Online)</span>
                      </h4>
                      <input
                        type="url"
                        placeholder="e.g. https://arxiv.org/pdf/1706.03762.pdf"
                        value={formUrl}
                        onChange={(e) => setFormUrl(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium outline-none focus:border-blue-500 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <div className="h-[1px] bg-slate-200/50 dark:bg-slate-800/50 flex-1" />
                      <span className="px-3">AND / OR</span>
                      <div className="h-[1px] bg-slate-200/50 dark:bg-slate-800/50 flex-1" />
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-850 dark:text-slate-200 flex items-center gap-1.5 font-mono">
                        <Upload className="w-4 h-4 text-blue-500" />
                        <span>Option 2: Fetch Local PDF from laptop (Offline Cache)</span>
                      </h4>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="application/pdf"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-5 rounded-2xl border-2 border-dashed border-slate-205 dark:border-slate-805 hover:border-blue-500 bg-white dark:bg-slate-905 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors"
                      >
                        <FileText className="w-7 h-7 text-slate-400 animate-pulse" />
                        {selectedFile ? (
                          <div className="text-center px-4">
                            <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 truncate max-w-xs">{selectedFile.name}</p>
                            <p className="text-[10px] font-mono text-slate-400 font-medium">{formFileSize}</p>
                          </div>
                        ) : (
                          <div className="text-center">
                            <p className="text-xs font-semibold text-slate-600 dark:text-slate-350 hover:text-blue-550 transition-colors">Select local PDF file from laptop</p>
                            <p className="text-[10px] text-slate-400 font-medium">Any PDF document upload up to 50MB</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick Notes option checkbox */}
                  <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-amber-500/5 border border-amber-500/10 animate-in fade-in">
                    <input
                      type="checkbox"
                      id="pdfEnableLinkedNote"
                      checked={formEnableLinkedNote}
                      onChange={(e) => setFormEnableLinkedNote(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 accent-amber-500 cursor-pointer shrink-0"
                    />
                    <label htmlFor="pdfEnableLinkedNote" className="text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer select-none">
                      Enable Connected Quick Note 🔗
                      <span className="block text-[10px] font-normal text-slate-400 mt-0.5">Creates a handy floating Study note linkage for active reference reading.</span>
                    </label>
                  </div>

                </div>
              )}

              {/* STEP 2: Pick Subtopic Connection */}
              {currentStep === 2 && (
                <div className="space-y-3 animate-in slide-in-from-right-3 duration-100">
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-slate-800 dark:text-white">
                      Associate connected Subtopic segment *
                    </h4>
                    <p className="text-[10px] text-slate-400 font-medium">Associate document tags directly inside curriculum tasks</p>
                    
                    <select
                      required
                      value={formSubtopicId}
                      onChange={(e) => setFormSubtopicId(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-202 dark:border-slate-850 bg-white dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                    >
                      <option value="">-- Choose subtopic index --</option>
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
                </div>
              )}

              {/* Wizard Nav buttons on modal foot */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-105 dark:border-slate-800">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-705 font-black rounded-xl text-xs transition-colors flex items-center gap-1 cursor-pointer dark:bg-slate-800 dark:text-slate-300"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                ) : (
                  <div />
                )}

                {currentStep < 2 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-550 text-white font-black rounded-xl text-xs transition-all flex items-center gap-1 cursor-pointer ml-auto"
                  >
                    <span>Next</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-505 text-white font-black rounded-xl text-xs transition-all flex items-center gap-1 cursor-pointer ml-auto"
                  >
                    <Check className="w-4 h-4" />
                    <span>Publish PDF Document</span>
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
