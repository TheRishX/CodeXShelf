import React, { useState, useRef } from 'react';
import { 
  FileText, Search, Plus, Trash2, ExternalLink, Download, Layers, 
  Sparkles, AlertCircle, Check, HelpCircle, X, ArrowLeft, ArrowRight, Upload, Link
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
  const [formError, setFormError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const getSubtopicPath = (subtopicId: string) => {
    const sub = subtopics.find(s => s.id === subtopicId);
    const topic = sub ? topics.find(t => t.id === sub.topicId) : null;
    return { sub, topic };
  };

  const handleDeleteItem = (itemId: string) => {
    const updated = pdfs.filter(p => p.id !== itemId);
    onUpdateDb({ pdfs: updated });
  };

  const handleOpenAddModal = () => {
    setFormTitle('');
    setFormFileName('');
    setFormFileSize('1.5 MB');
    setFormUrl('');
    setFormSubtopicId('');
    setSelectedFile(null);
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
      if (pdfType === 'link') {
        if (!formUrl.trim()) {
          setFormError('Please paste an external PDF document URL.');
          return;
        }
        if (!formTitle.trim()) {
          setFormError('Please enter a document title.');
          return;
        }
        
        // Auto-populate filename reference & estimated size for external links
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
      } else {
        if (!selectedFile) {
          setFormError('Please choose a local PDF file to publish.');
          return;
        }
        if (!formTitle.trim()) {
          setFormError('Please enter a document title.');
          return;
        }
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

    if (pdfType === 'link') {
      const newItem: PdfItem = {
        id: `pdf-${Date.now()}`,
        subtopicId: formSubtopicId,
        title: formTitle.trim(),
        fileName: formFileName.trim() || 'reference_document.pdf',
        fileSize: formFileSize.trim() || '1.2 MB',
        url: formUrl.trim(),
        createdAt: new Date().toISOString()
      };
      onUpdateDb({ pdfs: [...pdfs, newItem] });
      setIsModalOpen(false);
    } else {
      if (!selectedFile) {
        setFormError('Please select a file first.');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        const newItem: PdfItem = {
          id: `pdf-${Date.now()}`,
          subtopicId: formSubtopicId,
          title: formTitle.trim(),
          fileName: formFileName.trim() || selectedFile.name,
          fileSize: formFileSize,
          fileData: base64data,
          createdAt: new Date().toISOString()
        };
        onUpdateDb({ pdfs: [...pdfs, newItem] });
        setIsModalOpen(false);
      };
      reader.onerror = () => {
        setFormError('Failed to convert PDF binary file locally.');
      };
      reader.readAsDataURL(selectedFile);
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
            Index, download, and read PDF cheatsheets, RFC whitepapers, and academic citations uploaded to subtopic segments. Access base64 resource maps or open bookmarks directly.
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

                  <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-300 px-2 py-0.5 rounded">
                    {item.fileSize}
                  </span>
                </div>

                {/* File Title and Filename */}
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white leading-snug line-clamp-2">
                  {item.title}
                </h4>

                <p className="text-xs text-slate-450 dark:text-slate-400 truncate font-mono bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 rounded-lg border dark:border-slate-805">
                  📄 {item.fileName}
                </p>
              </div>

              {/* Interaction actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadOfflineData(item)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-sans text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{item.fileData ? 'Download Local' : 'Browse URL'}</span>
                  </button>

                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 text-slate-450 hover:text-blue-605 dark:text-slate-400 rounded-lg hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors"
                      title="Open bookmark external reference URL"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>

                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="p-1.5 text-slate-404 hover:text-red-500 rounded-lg hover:bg-slate-55 dark:hover:bg-slate-805 transition-colors cursor-pointer"
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

              {/* STEP 1: Method Picker & Inputs */}
              {currentStep === 1 && (
                <div className="space-y-4 animate-in slide-in-from-right-3 duration-100">
                  {/* Option Choice Toggles */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setPdfType('link');
                        setFormError('');
                      }}
                      className={`flex flex-col items-center gap-2 p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                        pdfType === 'link'
                          ? 'bg-slate-50 border-blue-500 shadow-3xs dark:bg-slate-850'
                          : 'bg-white hover:bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Link className={`w-5 h-5 ${pdfType === 'link' ? 'text-blue-500' : 'text-slate-400'}`} />
                      <div className="text-left select-none">
                        <span className="block text-xs font-black text-slate-855 dark:text-white">1. Link option</span>
                        <span className="block text-[10px] text-slate-400 font-medium">Remote PDF URL</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPdfType('upload');
                        setFormError('');
                      }}
                      className={`flex flex-col items-center gap-2 p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                        pdfType === 'upload'
                          ? 'bg-slate-50 border-blue-500 shadow-3xs dark:bg-slate-850'
                          : 'bg-white hover:bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Upload className={`w-5 h-5 ${pdfType === 'upload' ? 'text-blue-500' : 'text-slate-400'}`} />
                      <div className="text-left select-none">
                        <span className="block text-xs font-black text-slate-855 dark:text-white">2. Upload option</span>
                        <span className="block text-[10px] text-slate-400 font-medium">Store local file</span>
                      </div>
                    </button>
                  </div>

                  {/* Inputs for Link */}
                  {pdfType === 'link' ? (
                    <div className="space-y-3 pt-2">
                      <div className="space-y-1">
                        <h4 className="text-xs font-black text-slate-800 dark:text-white">
                          Copy & Paste Web PDF Link *
                        </h4>
                        <input
                          type="url"
                          placeholder="e.g. https://arxiv.org/pdf/1706.03762.pdf"
                          value={formUrl}
                          onChange={(e) => setFormUrl(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-xs font-semibold outline-none focus:border-blue-505 text-slate-905 dark:text-white"
                          autoFocus
                        />
                      </div>

                      {/* Filename Reference and Estimated Size fields removed to simplify layout */}
                    </div>
                  ) : (
                    /* Inputs for Upload */
                    <div className="space-y-3 pt-2">
                      <div className="space-y-1">
                        <h4 className="text-xs font-black text-slate-800 dark:text-white">
                          Select Local PDF Document *
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
                          className="w-full py-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-500 bg-slate-50/55 dark:bg-slate-950 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors"
                        >
                          <FileText className="w-8 h-8 text-slate-400" />
                          {selectedFile ? (
                            <div className="text-center px-4">
                              <p className="text-xs font-black text-slate-700 dark:text-slate-200 truncate max-w-xs">{selectedFile.name}</p>
                              <p className="text-[10px] font-mono text-slate-400 font-medium">{formFileSize}</p>
                            </div>
                          ) : (
                            <div className="text-center">
                              <p className="text-xs font-semibold text-slate-600 dark:text-slate-350">Click to import PDF from directory</p>
                              <p className="text-[10px] text-slate-400 font-medium">Standard PDF documents up to 50MB</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

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
                    />
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
