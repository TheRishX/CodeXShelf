import React, { useState } from 'react';
import { 
  Play, Search, Filter, Video, ExternalLink, Trash2, 
  Sparkles, Plus, AlertCircle, RefreshCw, Layers 
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

  // New video input state
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoSubtopicId, setNewVideoSubtopicId] = useState('');

  // Find subtopic and topic details
  const getSubtopicPath = (subtopicId: string) => {
    const sub = subtopics.find(s => s.id === subtopicId);
    const topic = sub ? topics.find(t => t.id === sub.topicId) : null;
    return { sub, topic };
  };

  const handleDeleteItem = (itemId: string) => {
    const updated = videos.filter(v => v.id !== itemId);
    onUpdateDb({ videos: updated });
  };

  const handleAddVideoItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVideoTitle.trim() || !newVideoUrl.trim() || !newVideoSubtopicId) return;

    const isYoutube = newVideoUrl.includes('youtube.com') || newVideoUrl.includes('youtu.be');
    
    const newVid: VideoItem = {
      id: `vid-${Date.now()}`,
      subtopicId: newVideoSubtopicId,
      title: newVideoTitle.trim(),
      url: newVideoUrl.trim(),
      platform: isYoutube ? 'youtube' : 'generic',
      createdAt: new Date().toISOString()
    };

    onUpdateDb({ videos: [...videos, newVid] });
    setNewVideoTitle('');
    setNewVideoUrl('');
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
      
      {/* Header section */}
      <div>
        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">
          Global Media Vault
        </p>
        <h2 className="text-4xl font-extrabold text-slate-905 dark:text-white mt-1 tracking-tight flex items-center gap-2.5">
          <Video className="w-8 h-8 text-red-550 shrink-0" />
          <span>Curated Educational Videos</span>
        </h2>
        <p className="text-sm font-medium text-slate-550 dark:text-slate-400 mt-2 font-sans">
          Browse, watch, and search video reference resources uploaded across all subtopics in your platform. Play lectures and view related visual context inside the system canvas.
        </p>
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

      {/* Add New Video Globally form */}
      <div className="p-5 bg-slate-50/70 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-3">
          <Plus className="w-4 h-4 text-red-500" />
          <span>Upload curator video resource globally</span>
        </h4>
        <form onSubmit={handleAddVideoItem} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="text"
            required
            placeholder="Video Title, e.g., SetTimeout vs SetImmediate Microtask Loop Logic"
            value={newVideoTitle}
            onChange={(e) => setNewVideoTitle(e.target.value)}
            className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
          />
          <input
            type="url"
            required
            placeholder="HTTPS Video URL (YouTube, Vimeo, etc.)"
            value={newVideoUrl}
            onChange={(e) => setNewVideoUrl(e.target.value)}
            className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-905 dark:text-white focus:outline-none"
          />
          <select
            required
            value={newVideoSubtopicId}
            onChange={(e) => setNewVideoSubtopicId(e.target.value)}
            className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="">-- Select Subtopic Page --</option>
            {subtopics.map(sub => {
              const parent = topics.find(t => t.id === sub.topicId);
              return (
                <option key={sub.id} value={sub.id}>
                  {parent ? `${parent.name} ➔ ` : ''}{sub.name}
                </option>
              );
            })}
          </select>
          <button
            type="submit"
            className="w-full px-4 py-2 bg-red-650 hover:bg-red-550 text-white rounded-xl text-xs font-bold font-sans transition-colors cursor-pointer shrink-0"
          >
            Publish Video Link
          </button>
        </form>
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
          const ytId = getYoutubeId(vid.url);
          const thumbUrl = ytId 
            ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
            : 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600&auto=format&fit=crop&q=80';

          return (
            <div 
              key={vid.id}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-850 rounded-3xl overflow-hidden group hover:border-slate-300 dark:hover:border-slate-800 shadow-3xs hover:shadow-xs transition-colors flex flex-col text-left"
            >
              {/* Thumbnail Play Section */}
              <div className="relative aspect-video bg-slate-100 overflow-hidden shrink-0">
                <img 
                  src={thumbUrl} 
                  alt={vid.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  referrerPolicy="no-referrer"
                />
                
                {/* Visual Glass backdrop dark layer overlay */}
                <div className="absolute inset-0 bg-slate-950/20 group-hover:bg-slate-950/40 transition-colors" />

                {/* Circle Center video trigger */}
                <button
                  onClick={() => {
                    setActiveVideoUrl(vid.url);
                    window.scrollTo({ top: 350, behavior: 'smooth' });
                  }}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-red-650/95 text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all scale-100 cursor-pointer"
                  title="Play video resource in preview screen"
                >
                  <Play className="w-5.5 h-5.5 fill-current ml-0.5" />
                </button>

                <span className="absolute bottom-3.5 right-3.5 bg-black/70 backdrop-blur-xs text-[9px] font-mono tracking-wider font-bold text-white px-2 py-0.5 rounded uppercase">
                  {vid.platform === 'youtube' ? 'YouTube' : 'Web Video'}
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
                  <a
                    href={vid.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-mono tracking-widest text-[#4d4d4d] dark:text-slate-450 hover:text-blue-650 font-bold uppercase transition-colors"
                  >
                    <span>Source link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  <button
                    onClick={() => handleDeleteItem(vid.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
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
              Add a reference URL above to publish it across the platform deck.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
