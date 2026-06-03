import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Search, Filter, Video, ExternalLink, Trash2, 
  Sparkles, Plus, AlertCircle, RefreshCw, Layers,
  X, ArrowLeft, ArrowRight, Check, Upload, Link, FileVideo
} from 'lucide-react';
import { DatabaseState, VideoItem, Subtopic, Topic } from '../types';

interface AllVideosViewProps {
  dbState: DatabaseState;
  onOpenSubtopic: (topicId: string, subtopicId: string) => void;
  onUpdateDb: (updates: Partial<DatabaseState>) => void;
}

export function AllVideosView({ dbState, onOpenSubtopic, onUpdateDb }: AllVideosViewProps) {
  const { topics, subtopics } = dbState;
  const videos = dbState.videos || [];

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('all');
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);

  // 2-step beautiful modal wizard states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 1 or 2
  const [videoType, setVideoType] = useState<'link' | 'upload'>('link');
  const [formTitle, setFormTitle] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formSubtopicId, setFormSubtopicId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formError, setFormError] = useState('');

  // Local object URL resolution map for browser session
  const [resolvedVideoUrls, setResolvedVideoUrls] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // IndexedDB Utilities for strictly local storage of video binaries
  const openIndexedDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('codexshelf-local-media', 1);
      request.onupgradeneeded = (e) => {
        const db = (e.target as any).result;
        if (!db.objectStoreNames.contains('videos')) {
          db.createObjectStore('videos');
        }
      };
      request.onsuccess = (e) => resolve((e.target as any).result);
      request.onerror = () => reject(request.error);
    });
  };

  const saveVideoBlobLocal = async (id: string, file: File): Promise<void> => {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('videos', 'readwrite');
      const store = tx.objectStore('videos');
      store.put(file, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  };

  const getVideoBlobLocal = async (id: string): Promise<File | null> => {
    try {
      const db = await openIndexedDB();
      return new Promise((resolve) => {
        const tx = db.transaction('videos', 'readonly');
        const store = tx.objectStore('videos');
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  };

  const deleteVideoBlobLocal = async (id: string): Promise<void> => {
    try {
      const db = await openIndexedDB();
      return new Promise((resolve) => {
        const tx = db.transaction('videos', 'readwrite');
        const store = tx.objectStore('videos');
        store.delete(id);
        tx.oncomplete = () => resolve();
      });
    } catch {
      // ignore
    }
  };

  // Resolve object URLs for all local videos
  useEffect(() => {
    let active = true;
    const resolveAll = async () => {
      const urls: Record<string, string> = {};
      for (const vid of videos) {
        if (vid.url?.startsWith('local-video://')) {
          const file = await getVideoBlobLocal(vid.id);
          if (file && active) {
            urls[vid.id] = URL.createObjectURL(file);
          }
        }
      }
      if (active) {
        setResolvedVideoUrls(urls);
      }
    };
    resolveAll();
    return () => {
      active = false;
    };
  }, [videos]);

  // Find subtopic and topic details
  const getSubtopicPath = (subtopicId: string) => {
    const sub = subtopics.find(s => s.id === subtopicId);
    const topic = sub ? topics.find(t => t.id === sub.topicId) : null;
    return { sub, topic };
  };

  const handleDeleteItem = async (itemId: string) => {
    const updated = videos.filter(v => v.id !== itemId);
    onUpdateDb({ videos: updated });
    await deleteVideoBlobLocal(itemId);
  };

  const handleOpenAddModal = () => {
    setFormTitle('');
    setFormUrl('');
    setFormSubtopicId('');
    setSelectedFile(null);
    setVideoType('link');
    setFormError('');
    setCurrentStep(1);
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Pre-fill title if empty
      if (!formTitle) {
        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
        setFormTitle(cleanName);
      }
      setFormError('');
    }
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (videoType === 'link') {
        if (!formUrl.trim()) {
          setFormError('Please paste a video link (URL).');
          return;
        }
        if (!formTitle.trim()) {
          setFormError('Please enter a video title.');
          return;
        }
      } else {
        if (!selectedFile) {
          setFormError('Please select a local video file from storage.');
          return;
        }
        if (!formTitle.trim()) {
          setFormError('Please enter a video title.');
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

  const handleAddVideoItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formTitle.trim()) {
      setFormError('Please enter a video title.');
      return;
    }
    if (!formSubtopicId) {
      setFormError('Please associate this resource with a subtopic page.');
      return;
    }

    const newId = `vid-${Date.now()}`;
    let finalUrl = '';
    let platform: 'youtube' | 'generic' = 'generic';

    if (videoType === 'link') {
      if (!formUrl.trim()) {
        setFormError('Please enter a website link.');
        return;
      }
      finalUrl = formUrl.trim();
      const isYoutube = finalUrl.includes('youtube.com') || finalUrl.includes('youtu.be');
      platform = isYoutube ? 'youtube' : 'generic';
    } else {
      if (!selectedFile) {
        setFormError('Please choose a file to proceed.');
        return;
      }
      // Save locally to IndexedDB
      try {
        await saveVideoBlobLocal(newId, selectedFile);
        finalUrl = `local-video://${newId}`;
        platform = 'generic';
      } catch (err) {
        setFormError('Failed to access IndexedDB local storage engine.');
        return;
      }
    }

    const newVid: VideoItem = {
      id: newId,
      subtopicId: formSubtopicId,
      title: formTitle.trim(),
      url: finalUrl,
      platform,
      createdAt: new Date().toISOString()
    };

    onUpdateDb({ videos: [...videos, newVid] });
    setIsModalOpen(false);
  };

  // Extract Youtube ID helper
  const getYoutubeId = (urlStr: string) => {
    try {
      const url = new URL(urlStr);
      if (url.hostname === 'youtu.be') {
        return url.pathname.slice(1);
      }
      if (url.hostname.includes('youtube.com')) {
        return url.searchParams.get('v') || url.pathname.split('/').pop() || null;
      }
    } catch {
      // custom matching
      const match = urlStr.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
      return match ? match[1] : null;
    }
    return null;
  };

  // Filter videos
  const filteredVideos = videos.filter(vid => {
    const { sub, topic } = getSubtopicPath(vid.subtopicId);
    const query = searchTerm.toLowerCase();

    const matchesQuery = vid.title.toLowerCase().includes(query) ||
      vid.url.toLowerCase().includes(query) ||
      (sub?.name.toLowerCase().includes(query) ?? false) ||
      (topic?.name.toLowerCase().includes(query) ?? false);

    const matchesTopic = selectedTopicId === 'all' || (sub?.topicId === selectedTopicId);

    return matchesQuery && matchesTopic;
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-200 text-left">
      
      {/* Header section with inline action button */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">
            Global Media Vault
          </p>
          <h2 className="text-4xl font-extrabold text-slate-905 dark:text-white mt-1 tracking-tight flex items-center gap-2.5">
            <Video className="w-8 h-8 text-red-550 shrink-0" />
            <span>Curated Educational Videos</span>
          </h2>
          <p className="text-sm font-medium text-slate-550 dark:text-slate-400 mt-2 font-sans max-w-3xl">
            Browse, watch, and search video reference resources uploaded across all subtopics in your platform. Play lectures and view related visual context inside the system canvas.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-5 py-3 bg-red-600 hover:bg-red-555 text-white text-xs font-black rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer self-start md:self-center shrink-0"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>Add Video</span>
        </button>
      </div>

      {/* Control Actions toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-850 shadow-3xs">
        {/* Search */}
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search lectures, code walkthrough channels, subtopic categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 rounded-xl text-sm text-slate-850 dark:text-slate-100 placeholder-slate-400 outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all font-sans"
          />
        </div>

        {/* Filter select */}
        <div className="w-full sm:w-auto flex items-center gap-2">
          <Layers className="w-4 h-4 text-slate-405 shrink-0" />
          <select
            value={selectedTopicId}
            onChange={(e) => setSelectedTopicId(e.target.value)}
            className="w-full sm:w-auto px-4 py-2 border border-slate-200 dark:border-slate-800 bg-slate-55 dark:bg-slate-950 rounded-xl text-xs outline-hidden text-slate-705 dark:text-slate-300 font-sans focus:border-blue-500"
          >
            <option value="all">All Topics (Default)</option>
            {topics.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main interactive player if active */}
      {activeVideoUrl && (
        <div className="p-5 rounded-3xl bg-slate-950 text-white border border-slate-800 flex flex-col gap-3 relative animate-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-mono bg-red-500/25 text-red-400 px-2 py-0.5 rounded font-black">
              System Canvas Media Player
            </span>
            <button 
              onClick={() => setActiveVideoUrl(null)}
              className="text-xs text-slate-400 hover:text-white font-mono bg-slate-900 hover:bg-slate-800 px-3 py-1 rounded-xl cursor-pointer"
            >
              Close Screen
            </button>
          </div>
          
          <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-slate-900">
            {getYoutubeId(activeVideoUrl) ? (
              <iframe
                src={`https://www.youtube.com/embed/${getYoutubeId(activeVideoUrl)}?autoplay=1`}
                title="Curated Embedded Video Player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full object-cover border-0"
              />
            ) : (activeVideoUrl.startsWith('blob:') || activeVideoUrl.startsWith('data:') || activeVideoUrl.includes('local-video://')) ? (
              <video
                src={activeVideoUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center gap-3">
                <AlertCircle className="w-8 h-8 text-amber-500" />
                <p className="text-sm font-semibold max-w-md">Generic streaming not loadable in sandbox iframe constraints.</p>
                <a 
                  href={activeVideoUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="px-4 py-2 bg-slate-800/80 rounded-xl text-xs font-mono font-bold tracking-wider uppercase flex items-center gap-1.5 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  <span>Open Video in Secondary Tab</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Grid of gallery video cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {filteredVideos.map(vid => {
          const { sub, topic } = getSubtopicPath(vid.subtopicId);
          const isLocal = vid.url?.startsWith('local-video://');
          const playUrl = isLocal ? resolvedVideoUrls[vid.id] : vid.url;
          
          const ytId = getYoutubeId(vid.url);
          const thumbUrl = isLocal 
            ? 'placeholder'
            : (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600&auto=format&fit=crop&q=80');

          return (
            <div 
              key={vid.id}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-850 rounded-3xl overflow-hidden group hover:border-slate-300 dark:hover:border-slate-800 shadow-3xs hover:shadow-xs transition-colors flex flex-col text-left"
            >
              {/* Thumbnail Play Section */}
              <div className="relative aspect-video bg-slate-100 dark:bg-slate-950 overflow-hidden shrink-0 flex items-center justify-center text-center">
                {thumbUrl === 'placeholder' ? (
                  <div className="absolute inset-0 bg-gradient-to-tr from-slate-900 via-slate-850 to-red-950/90 flex flex-col items-center justify-center gap-1.5 p-4 text-white">
                    <FileVideo className="w-10 h-10 text-rose-500 opacity-90" />
                    <span className="text-[10px] font-mono opacity-80 tracking-wide font-bold uppercase">Local Video Asset</span>
                    <span className="text-[9px] font-mono opacity-40 truncate max-w-full">{(resolvedVideoUrls[vid.id] ? "Loaded Offline Ready" : "Loading binary...")}</span>
                  </div>
                ) : (
                  <img 
                    src={thumbUrl} 
                    alt={vid.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                )}
                
                {/* Visual Glass backdrop dark layer overlay */}
                <div className="absolute inset-0 bg-slate-950/20 group-hover:bg-slate-950/40 transition-colors" />

                {/* Circle Center video trigger */}
                <button
                  onClick={() => {
                    if (playUrl) {
                      setActiveVideoUrl(playUrl);
                      window.scrollTo({ top: 350, behavior: 'smooth' });
                    }
                  }}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-red-650/95 text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all scale-100 cursor-pointer"
                  title="Play video resource in preview screen"
                >
                  <Play className="w-5.5 h-5.5 fill-current ml-0.5" />
                </button>

                <span className="absolute bottom-3.5 right-3.5 bg-black/70 backdrop-blur-xs text-[9px] font-mono tracking-wider font-bold text-white px-2 py-0.5 rounded uppercase">
                  {isLocal ? 'Local Storage' : (vid.platform === 'youtube' ? 'YouTube' : 'Web Video')}
                </span>
              </div>

              {/* Text Info Section */}
              <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-1">
                    {sub && topic ? (
                      <button
                        onClick={() => onOpenSubtopic(topic.id, sub.id)}
                        className="inline-flex items-center gap-1.5 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 text-[10px] font-bold font-mono tracking-wide transition-colors truncate"
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: topic.color }} />
                        <span>{topic.name}</span>
                        <span className="text-slate-400 font-sans">➔</span>
                        <span className="underline truncate">{sub.name}</span>
                      </button>
                    ) : (
                      <span className="text-[9px] text-slate-400 font-mono">Curated Resource</span>
                    )}

                    <span className="text-[9px] text-slate-400 font-mono shrink-0">
                      {new Date(vid.createdAt || Date.now()).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                    </span>
                  </div>

                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white line-clamp-2 leading-snug">
                    {vid.title}
                  </h4>
                </div>

                <div className="flex items-center justify-between">
                  {isLocal ? (
                    <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-black">
                      Stored Locally Only
                    </span>
                  ) : (
                    <a
                      href={vid.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-mono tracking-widest text-[#4d4d4d] dark:text-slate-450 hover:text-blue-650 font-bold uppercase transition-colors"
                    >
                      <span>Source link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}

                  <button
                    onClick={() => handleDeleteItem(vid.id)}
                    className="p-1.5 text-slate-404 hover:text-red-500 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Remove Video resource card"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredVideos.length === 0 && (
          <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-205 dark:border-slate-855 rounded-3xl bg-slate-50/10">
            <AlertCircle className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-sans font-medium text-sm">
              No educational links or lecture guides match the current filters.
            </p>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Add a reference URL or local video file above to publish it across the platform deck.
            </p>
          </div>
        )}
      </div>

      {/* Pop-up Video Wizard Modal (condensed 2-step flow) */}
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
                  <Video className="w-5 h-5 text-red-550 shrink-0" />
                  <span>Curator Media Publishing Wizard</span>
                </h3>
                <p className="text-xs text-slate-405 font-medium">Associate reference guides to specific segment indices</p>
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
                      ? 'bg-red-600 text-white shadow-xs scale-105'
                      : currentStep > stepNum
                        ? 'bg-red-100 text-red-600 dark:bg-red-950/45'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}>
                    {stepNum}
                  </div>
                  {stepNum < 2 && (
                    <div className={`w-12 h-0.5 mx-1 transition-colors ${currentStep > stepNum ? 'bg-red-500' : 'bg-slate-100 dark:bg-slate-800'}`} />
                  )}
                </div>
              ))}
            </div>

            {/* Form Step flow */}
            <form onSubmit={handleAddVideoItem} className="space-y-4">
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
                        setVideoType('link');
                        setFormError('');
                      }}
                      className={`flex flex-col items-center gap-2 p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                        videoType === 'link'
                          ? 'bg-slate-50 border-red-500 shadow-3xs dark:bg-slate-850'
                          : 'bg-white hover:bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Link className={`w-5 h-5 ${videoType === 'link' ? 'text-red-500' : 'text-slate-400'}`} />
                      <div className="text-left select-none">
                        <span className="block text-xs font-black text-slate-850 dark:text-white">1. Link option</span>
                        <span className="block text-[10px] text-slate-400 font-medium">Remote Youtube URL</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setVideoType('upload');
                        setFormError('');
                      }}
                      className={`flex flex-col items-center gap-2 p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                        videoType === 'upload'
                          ? 'bg-slate-50 border-red-500 shadow-3xs dark:bg-slate-850'
                          : 'bg-white hover:bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Upload className={`w-5 h-5 ${videoType === 'upload' ? 'text-red-500' : 'text-slate-400'}`} />
                      <div className="text-left select-none">
                        <span className="block text-xs font-black text-slate-850 dark:text-white">2. Upload option</span>
                        <span className="block text-[10px] text-slate-400 font-medium">Save to local storage</span>
                      </div>
                    </button>
                  </div>

                  {/* Inputs for Link */}
                  {videoType === 'link' ? (
                    <div className="space-y-3 pt-2">
                      <div className="space-y-1">
                        <h4 className="text-xs font-black text-slate-800 dark:text-white">
                          Copy & Paste Web Video Link *
                        </h4>
                        <input
                          type="url"
                          placeholder="e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                          value={formUrl}
                          onChange={(e) => setFormUrl(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-xs font-semibold outline-none focus:border-red-500 text-slate-900 dark:text-white"
                          autoFocus
                        />
                      </div>
                    </div>
                  ) : (
                    /* Inputs for Upload */
                    <div className="space-y-3 pt-2">
                      <div className="space-y-1">
                        <h4 className="text-xs font-black text-slate-800 dark:text-white">
                          Select Local Video File (Stored only locally in IndexedDB) *
                        </h4>
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="video/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full py-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-red-500 bg-slate-50/50 dark:bg-slate-950 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors"
                        >
                          <FileVideo className="w-8 h-8 text-slate-400" />
                          {selectedFile ? (
                            <div className="text-center px-4">
                              <p className="text-xs font-black text-slate-700 dark:text-slate-200 truncate max-w-xs">{selectedFile.name}</p>
                              <p className="text-[10px] font-mono text-slate-400 font-medium">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                            </div>
                          ) : (
                            <div className="text-center">
                              <p className="text-xs font-semibold text-slate-600 dark:text-slate-350">Click to locate file from storage</p>
                              <p className="text-[10px] text-slate-400 font-medium">MP4, WebM or native video elements</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-slate-800 dark:text-white">
                      Custom Video Title *
                    </h4>
                    <input
                      type="text"
                      placeholder="e.g. Big O Notation Time Complexity explanation"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-xs font-semibold outline-none focus:border-red-500 text-slate-900 dark:text-white"
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
                    <p className="text-[10px] text-slate-400 font-medium">Associate video cards directly inside a curriculum subtask scope</p>
                    
                    <select
                      required
                      value={formSubtopicId}
                      onChange={(e) => setFormSubtopicId(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-red-500"
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
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl text-xs transition-all flex items-center gap-1 cursor-pointer ml-auto"
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
                    <span>Publish Video</span>
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
