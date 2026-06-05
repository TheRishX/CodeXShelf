import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Search, Filter, Video, ExternalLink, Trash2, 
  Sparkles, Plus, AlertCircle, RefreshCw, Layers,
  X, ArrowLeft, ArrowRight, Check, Upload, Link, FileVideo,
  Star, Tv, Flame, Trophy, CheckCircle2, Award, Loader2, GripVertical,
  Eye, Clock, Calendar, Zap, AlertTriangle, ShieldCheck, ListMusic,
  Power, PauseCircle, PlayCircle, Settings, SlidersHorizontal, Info, CheckCircle,
  Radio, XCircle, History
} from 'lucide-react';
import { motion } from 'motion/react';
import { DatabaseState, VideoItem, Subtopic, Topic } from '../types';

interface AllVideosViewProps {
  dbState: DatabaseState;
  onOpenSubtopic: (topicId: string, subtopicId: string) => void;
  onUpdateDb: (updates: Partial<DatabaseState>) => void;
}

export function AllVideosView({ dbState, onOpenSubtopic, onUpdateDb }: AllVideosViewProps) {
  const { topics, subtopics } = dbState;
  const videos = dbState.videos || [];
  const youtubeSources = dbState.youtubeSources || [];

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('all');
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);

  // Enterprise filtering & sorting
  const [selectedDuration, setSelectedDuration] = useState<string>('all');
  const [selectedSort, setSelectedSort] = useState<string>('imported-desc');

  // Background sync tracking states
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [syncStatusMap, setSyncStatusMap] = useState<Record<string, 'idle' | 'syncing' | 'error' | 'success'>>({});

  // 2-step beautiful modal wizard states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 1 or 2
  const [videoType, setVideoType] = useState<'link' | 'upload' | 'playlist'>('link');
  const [formTitle, setFormTitle] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formSubtopicId, setFormSubtopicId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formError, setFormError] = useState('');

  // Playlist Importer Specific State
  const [importPlaylistUrl, setImportPlaylistUrl] = useState('');
  const [rangeMode, setRangeMode] = useState<'all' | 'custom'>('all');
  const [rangeStart, setRangeStart] = useState<number>(1);
  const [rangeEnd, setRangeEnd] = useState<number>(10);
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'err'>('idle');
  const [importError, setImportError] = useState('');
  const [importedPreview, setImportedPreview] = useState<{ playlistTitle: string, videos: any[] } | null>(null);
  
  // Tactical Drag & Drop state markers
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Psychologically rewarding watch-tracker metrics
  const totalVideos = videos.length;
  const completedVideos = videos.filter(v => v.isCompleted).length;
  const completionPercentage = totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0;
  const currentlyWatchingVideo = videos.find(v => v.isPlaying);
  const nextRecommendedVideo = videos.find(v => !v.isCompleted);

  // Local object URL resolution map for browser session
  const [resolvedVideoUrls, setResolvedVideoUrls] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Real-time Sync & Polling Engine ---
  const syncLocalAndRemoteStore = async () => {
    try {
      const res = await fetch('/api/data');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          onUpdateDb({
            youtubeSources: json.data.youtubeSources || [],
            youtubeJobs: json.data.youtubeJobs || [],
            videos: json.data.videos || []
          });
        }
      }
    } catch (e) {
      console.error('Error synchronizing client memory store is expected offline:', e);
    }
  };

  const pollJobs = async () => {
    try {
      const res = await fetch('/api/youtube/jobs');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.jobs) {
          setActiveJobs(json.jobs);
          
          // If any job transitions, trigger a silent database reload
          const activeOrJustDone = json.jobs.some((job: any) => 
            ['starting', 'importing', 'syncing'].includes(job.status) || 
            (job.status === 'completed' && Date.now() - new Date(job.updatedAt).getTime() < 5000)
          );
          if (activeOrJustDone) {
            await syncLocalAndRemoteStore();
          }
        }
      }
    } catch (e) {
      console.warn('Error fetching server jobs tracker context:', e);
    }
  };

  useEffect(() => {
    pollJobs();
    const interval = setInterval(pollJobs, 2000);
    return () => clearInterval(interval);
  }, []);

  // --- Enterprise Sync Operations Handlers ---
  const handleForceSyncNow = async (sourceId: string) => {
    setSyncStatusMap(prev => ({ ...prev, [sourceId]: 'syncing' }));
    try {
      const res = await fetch('/api/youtube/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSyncStatusMap(prev => ({ ...prev, [sourceId]: 'success' }));
        pollJobs();
        setTimeout(() => {
          setSyncStatusMap(prev => ({ ...prev, [sourceId]: 'idle' }));
        }, 3000);
      } else {
        setSyncStatusMap(prev => ({ ...prev, [sourceId]: 'error' }));
        alert(`Failed to trigger synchronization task: ${data.error || 'Server error occurred'}`);
      }
    } catch {
      setSyncStatusMap(prev => ({ ...prev, [sourceId]: 'error' }));
    }
  };

  const handleDeleteSource = async (sourceId: string, keepVideos: boolean) => {
    if (!confirm(`Are you sure you want to delete this YouTube sync source? This will stop automatic background syncs.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/youtube/source?sourceId=${encodeURIComponent(sourceId)}&keepVideos=${keepVideos}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await syncLocalAndRemoteStore();
      } else {
        alert(`Failed to delete tracked source: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      alert('Internal network transmission error during source removal.');
    }
  };

  const handleUpdateSourceSyncInterval = async (sourceId: string, interval: string) => {
    try {
      const res = await fetch('/api/youtube/source/interval', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId, interval })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await syncLocalAndRemoteStore();
      } else {
        alert(data.error || 'Failed to update schedule interval.');
      }
    } catch (e) {
      alert('Could not update synchronization interval due to connection timeout.');
    }
  };

  const handleToggleJobPause = async (jobId: string) => {
    try {
      const job = activeJobs.find(j => j.id === jobId);
      const nextAction = job?.status === 'paused' ? 'resume' : 'pause';
      const res = await fetch('/api/youtube/jobs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, action: nextAction })
      });
      if (res.ok) {
        pollJobs();
      }
    } catch (e) {
      console.error('Failed to change background job pause/active state', e);
    }
  };

  const handleCancelJob = async (jobId: string) => {
    try {
      const res = await fetch('/api/youtube/jobs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, action: 'cancel' })
      });
      if (res.ok) {
        pollJobs();
      }
    } catch (e) {
      console.error('Failed to cancel active synchronization task', e);
    }
  };

  // --- Visual Meta Formatting Helpers ---
  const formatDuration = (sec?: number) => {
    if (!sec) return '';
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatViews = (views?: number) => {
    if (!views) return '';
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M views`;
    }
    if (views >= 1000) {
      return `${(views / 1000).toFixed(0)}K views`;
    }
    return `${views} views`;
  };

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

  // Synchronize playing state with browser active url player
  useEffect(() => {
    const isPlayingVid = videos.find(v => v.isPlaying);
    if (isPlayingVid) {
      const targetUrl = isPlayingVid.url.startsWith('local-video://')
        ? resolvedVideoUrls[isPlayingVid.id]
        : isPlayingVid.url;
      if (targetUrl && activeVideoUrl !== targetUrl) {
        setActiveVideoUrl(targetUrl);
      }
    }
  }, [videos, resolvedVideoUrls, activeVideoUrl]);

  // Handle toggling completion with slide states
  const handleToggleComplete = (vidId: string) => {
    const updated = videos.map(v => {
      if (v.id === vidId) {
        return { ...v, isCompleted: !v.isCompleted };
      }
      return v;
    });
    onUpdateDb({ videos: updated });
  };

  // Handle setting a single video as active and playing
  const handlePlayAndMark = (vidId: string, playUrl?: string, openSource: boolean = false, sourceUrl?: string) => {
    const updated = videos.map(v => ({
      ...v,
      isPlaying: v.id === vidId
    }));
    onUpdateDb({ videos: updated });

    if (playUrl) {
      setActiveVideoUrl(playUrl);
      setTimeout(() => {
        const playerElem = document.getElementById('media-player-section');
        if (playerElem) {
          playerElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          window.scrollTo({ top: 350, behavior: 'smooth' });
        }
      }, 50);
    }

    if (openSource && sourceUrl) {
      window.open(sourceUrl, '_blank', 'noreferrer');
    }
  };

  // Utility to complete all or clear history
  const handleMarkAllVideosComplete = (complete: boolean) => {
    const updated = videos.map(v => ({
      ...v,
      isCompleted: complete
    }));
    onUpdateDb({ videos: updated });
  };

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
      } else if (videoType === 'playlist') {
        if (!importedPreview || importedPreview.videos.length === 0) {
          setFormError('Please successfully fetch your YouTube Playlist videos first.');
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

    if (videoType === 'playlist') {
      if (!importPlaylistUrl.trim()) {
        setFormError('Please enter a YouTube Channel, Playlist, or Video link.');
        return;
      }
      if (!formSubtopicId) {
        setFormError('Please associate this tracking source with a subtopic page.');
        return;
      }

      setImportStatus('loading');
      try {
        const res = await fetch('/api/youtube/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceUrl: importPlaylistUrl.trim(),
            subtopicId: formSubtopicId,
            rangeMode,
            rangeStart,
            rangeEnd
          })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setImportStatus('success');
          pollJobs();
          setIsModalOpen(false);
          setImportPlaylistUrl('');
          setImportStatus('idle');
          return;
        } else {
          setImportStatus('err');
          setFormError(data.error || 'Failed to initialize background sync tracking.');
          return;
        }
      } catch {
        setImportStatus('err');
        setFormError('Failed to establish connection with the automated sync engine.');
        return;
      }
    }

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

  const tryRssPlaylistImport = async (urlStr: string): Promise<{ playlistTitle: string; videos: any[] } | null> => {
    let playlistId = "";
    try {
      const url = new URL(urlStr);
      playlistId = url.searchParams.get("list") || "";
    } catch (e) {
      const match = urlStr.match(/[&?]list=([^&]+)/) || urlStr.match(/list=([^&]+)/);
      if (match) playlistId = match[1];
    }
    if (!playlistId && urlStr.match(/^PL[a-zA-Z0-9_-]+$/)) {
      playlistId = urlStr;
    }

    if (!playlistId) return null;

    // Use free, public, stable allorigins CORS proxy to fetch the RSS feed
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`;
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(feedUrl)}`;
    
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error("CORS proxy lookup failed.");
    const json = await res.json();
    const xmlString = json.contents;
    if (!xmlString) throw new Error("No XML payload returned from proxy.");

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");
    
    const titleNode = xmlDoc.querySelector("feed > title");
    const playlistTitle = titleNode ? (titleNode.textContent || "YouTube Playlist Course") : "YouTube Playlist Course";

    const entries = xmlDoc.querySelectorAll("entry");
    if (!entries || entries.length === 0) {
      throw new Error("No video entries found in the RSS feed XML.");
    }

    const parsedVideos: any[] = [];
    entries.forEach((entry) => {
      // safe extraction of videoId
      let videoId = "";
      const ytIdNode = entry.querySelector("videoId") || entry.getElementsByTagName("yt:videoId")[0];
      if (ytIdNode) {
        videoId = ytIdNode.textContent || "";
      } else {
        const nodes = Array.from(entry.children);
        const term = nodes.find(n => n.nodeName.includes("videoId"));
        if (term) videoId = term.textContent || "";
      }

      if (!videoId) {
        const idNode = entry.querySelector("id");
        if (idNode && idNode.textContent?.includes("video:")) {
          videoId = idNode.textContent.split("video:")[1] || "";
        }
      }

      if (!videoId) return;

      const titleNode = entry.querySelector("title");
      const title = titleNode ? (titleNode.textContent || "Untitled video") : "Untitled video";

      const url = `https://www.youtube.com/watch?v=${videoId}`;
      const thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

      let description = "Study notes and reference lecture step.";
      const descNode = entry.querySelector("description") || entry.getElementsByTagName("media:description")[0];
      if (descNode) {
        description = descNode.textContent || description;
      } else {
        const nodes = Array.from(entry.children);
        const group = nodes.find(n => n.nodeName.includes("group"));
        if (group) {
          const innerDesc = Array.from(group.children).find(c => c.nodeName.includes("description"));
          if (innerDesc) description = innerDesc.textContent || description;
        }
      }

      parsedVideos.push({
        videoId,
        title,
        url,
        thumbnail,
        description
      });
    });

    return {
      playlistTitle,
      videos: parsedVideos
    };
  };

  const handleFetchPlaylist = async () => {
    if (!importPlaylistUrl.trim()) {
      setImportError('Please enter a YouTube link (Channel, Playlist, or Video URL).');
      setImportStatus('err');
      return;
    }
    setImportStatus('loading');
    setImportError('');
    setImportedPreview(null);

    try {
      const res = await fetch('/api/youtube/playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playlistUrl: importPlaylistUrl.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setImportStatus('success');
        setImportedPreview({
          playlistTitle: data.playlistTitle || "YouTube Course Playlist",
          videos: data.videos || []
        });
        return;
      } else {
        setImportStatus('err');
        setImportError(data.error || 'Failed to fetch the YouTube Playlist. Please verify the URL.');
        return;
      }
    } catch {
      setImportStatus('err');
      setImportError('Failed to establish connection with the YouTube service.');
      return;
    }
  };



  const handleReorder = (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;
    const fromIndex = videos.findIndex(v => v.id === draggedId);
    const toIndex = videos.findIndex(v => v.id === targetId);
    if (fromIndex !== -1 && toIndex !== -1) {
      const updated = [...videos];
      const [movedItem] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, movedItem);
      onUpdateDb({ videos: updated });
    }
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

  // Filter & Sort videos
  const filteredVideos = videos.filter(vid => {
    const { sub, topic } = getSubtopicPath(vid.subtopicId);
    const query = searchTerm.toLowerCase().trim();

    // Support query lookup across titles, custom descriptions, custom channel title tags, URLs, subtopics etc.
    const matchesQuery = !query ||
      vid.title.toLowerCase().includes(query) ||
      vid.url.toLowerCase().includes(query) ||
      (vid.channelTitle?.toLowerCase().includes(query) ?? false) ||
      (vid.description?.toLowerCase().includes(query) ?? false) ||
      (vid.tags?.some(tag => tag.toLowerCase().includes(query)) ?? false) ||
      (sub?.name.toLowerCase().includes(query) ?? false) ||
      (topic?.name.toLowerCase().includes(query) ?? false);

    const matchesTopic = selectedTopicId === 'all' || (sub?.topicId === selectedTopicId);

    // Duration boundaries filter
    let matchesDuration = true;
    if (selectedDuration !== 'all' && vid.durationSeconds) {
      const sec = vid.durationSeconds;
      if (selectedDuration === 'short') matchesDuration = sec < 300;
      else if (selectedDuration === 'medium') matchesDuration = sec >= 300 && sec < 900;
      else if (selectedDuration === 'long') matchesDuration = sec >= 900 && sec < 2700;
      else if (selectedDuration === 'excessive') matchesDuration = sec >= 2700;
    }

    return matchesQuery && matchesTopic && matchesDuration;
  }).sort((a, b) => {
    if (selectedSort === 'imported-desc') {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    }
    if (selectedSort === 'published-desc') {
      const tA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const tB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return tB - tA;
    }
    if (selectedSort === 'published-asc') {
      const tA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const tB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return tA - tB;
    }
    if (selectedSort === 'views-desc') {
      return (b.views || 0) - (a.views || 0);
    }
    if (selectedSort === 'duration-desc') {
      return (b.durationSeconds || 0) - (a.durationSeconds || 0);
    }
    return 0;
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

      {/* Dynamic Psychological Mastery Progress Tracker */}
      <div className="bg-gradient-to-r from-red-555/10 via-amber-500/5 to-emerald-500/10 dark:from-red-950/20 dark:via-amber-950/10 dark:to-emerald-950/20 border-2 border-slate-205 dark:border-slate-805 rounded-[2rem] p-6 shadow-3xs flex flex-col md:flex-row gap-6 items-center">
        {/* Left Circular Gauge or big stat percentage */}
        <div className="relative flex items-center justify-center shrink-0 w-28 h-28">
          <svg className="w-full h-full -rotate-90">
            <circle
              cx="56"
              cy="56"
              r="46"
              className="stroke-slate-200 dark:stroke-slate-805"
              strokeWidth="7"
              fill="transparent"
            />
            <motion.circle
              cx="56"
              cy="56"
              r="46"
              className="stroke-emerald-500 dark:stroke-emerald-400"
              strokeWidth="7"
              fill="transparent"
              strokeDasharray="289"
              initial={{ strokeDashoffset: 289 }}
              animate={{ strokeDashoffset: 289 - (289 * completionPercentage) / 100 }}
              transition={{ duration: 1, ease: "easeOut" }}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center">
            <span className="text-2xl font-black text-slate-850 dark:text-white leading-none">
              {completionPercentage}%
            </span>
            <span className="text-[9px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500 font-bold mt-1">
              Complete
            </span>
          </div>
        </div>

        {/* Informational Center Block */}
        <div className="flex-1 space-y-3 text-center md:text-left">
          <div>
            <span className="text-[10px] uppercase font-mono font-black tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/25 px-2.5 py-1 rounded-full inline-flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span>Syllabus Progress Indicator</span>
            </span>
            <h3 className="text-lg font-black text-slate-850 dark:text-white mt-1.5 leading-snug">
              📝 Curated Watch Bench: {completedVideos} of {totalVideos} fully mastered
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {completionPercentage === 0 
                ? "Let's kickstart our focus loop! Play any video below or mark them complete to begin. 🚀"
                : completionPercentage < 50
                  ? "Fantastic start! Keep riding the momentum. You are building real memory paths now! 🧠🔥"
                  : completionPercentage < 100
                    ? "So close to absolute curriculum mastery! Complete the remaining videos to finish. 🌟"
                    : "Absolute mastery unlocked! You've watched every video reference. Outstanding work! 🏆🎓"
              }
            </p>
          </div>

          {/* Quick recommendations action shortcuts */}
          {nextRecommendedVideo && (
            <div className="pt-1.5 flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs">
              <span className="text-slate-400 dark:text-slate-500 font-black font-mono text-[10px] uppercase tracking-wider">Up Next:</span>
              <button
                onClick={() => {
                  const isLocal = nextRecommendedVideo.url?.startsWith('local-video://');
                  const playUrl = isLocal ? resolvedVideoUrls[nextRecommendedVideo.id] : nextRecommendedVideo.url;
                  handlePlayAndMark(nextRecommendedVideo.id, playUrl);
                }}
                className="px-3.5 py-1.5 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-855 dark:text-slate-300 font-bold rounded-xl flex items-center gap-2 shadow-3xs cursor-pointer transition-all hover:scale-[1.02]"
              >
                <Flame className="w-3.5 h-3.5 text-red-550 animate-pulse shrink-0" />
                <span className="truncate max-w-[200px] text-xs font-black">{nextRecommendedVideo.title}</span>
                <Play className="w-3 h-3 fill-current text-slate-500 shrink-0" />
              </button>
            </div>
          )}
        </div>

        {/* Global override keys */}
        {totalVideos > 0 && (
          <div className="shrink-0 flex flex-col sm:flex-row md:flex-col gap-2 w-full md:w-auto border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 pt-4 md:pt-0 md:pl-5">
            <button
              onClick={() => handleMarkAllVideosComplete(true)}
              className="px-4 py-2 text-[10px] font-black uppercase tracking-wider text-emerald-650 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-emerald-500/20"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Mark All Completed</span>
            </button>
            <button
              onClick={() => handleMarkAllVideosComplete(false)}
              className="px-4 py-2 text-[10px] font-black uppercase tracking-wider text-slate-505 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-400 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-transparent"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset Progress</span>
            </button>
          </div>
        )}
      </div>

      {/* Dynamic YouTube Tracker & Background Progress monitor panel */}
      {(youtubeSources.length > 0 || activeJobs.filter(j => j.status !== 'completed' && j.status !== 'cancelled').length > 0) && (
        <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-855 p-6 rounded-[2rem] space-y-6 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 dark:border-slate-850 pb-4">
            <div>
              <h3 className="text-lg font-black text-slate-905 dark:text-white flex items-center gap-2">
                <Radio className="w-5 h-5 text-red-500 animate-pulse shrink-0" />
                <span>Enterprise YouTube Sync Dashboard</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                SaaS-grade monitoring of synchronized learning courses, channel watch lists, and real-time extraction engines.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-left">
            {/* Column A: Tracked Sources */}
            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono flex items-center gap-1.5">
                <ListMusic className="w-4 h-4 text-slate-400" />
                <span>Active Channels / Playlists Synchronized ({youtubeSources.length})</span>
              </h4>
              
              {youtubeSources.length === 0 ? (
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-150 dark:border-slate-850 text-center text-xs font-medium text-slate-400 py-6">
                  No automated sources tracked yet. Paste a link under the "Sync" tab of any subtopic!
                </div>
              ) : (
                <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                  {youtubeSources.map(src => {
                    const status = syncStatusMap[src.id] || 'idle';
                    return (
                      <div key={src.id} className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-850 flex flex-col sm:flex-row md:items-center justify-between gap-4 hover:border-slate-300 dark:hover:border-slate-800 transition-all">
                        <div className="flex items-center gap-3 text-left min-w-0">
                          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-950 border border-slate-205 dark:border-slate-805 flex items-center justify-center shrink-0 overflow-hidden">
                            {src.thumbnailUrl ? (
                              <img src={src.thumbnailUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <Video className="w-5 h-5 text-red-505" />
                            )}
                          </div>
                          <div className="space-y-0.5 truncate flex-1 min-w-0">
                            <h5 className="text-xs font-extrabold text-slate-800 dark:text-white truncate flex items-center gap-1.5">
                              {src.title}
                            </h5>
                            <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-mono font-bold text-slate-405">
                              <span className={`px-1.5 py-0.2 rounded-md uppercase ${
                                src.type === 'channel' ? 'bg-red-50 text-red-650 dark:bg-red-500/10 dark:text-red-400' : 'bg-blue-50 text-blue-650 dark:bg-blue-500/10 dark:text-blue-400'
                              }`}>
                                {src.type}
                              </span>
                              <span>•</span>
                              <span>{src.totalImported || 0} Imported</span>
                              {src.lastSyncedAt && (
                                <>
                                  <span>•</span>
                                  <span className="truncate">Synced {new Date(src.lastSyncedAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0 select-none">
                          {/* Interval Dropdown */}
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <select
                              value={src.syncInterval}
                              onChange={(e) => handleUpdateSourceSyncInterval(src.id, e.target.value)}
                              className="px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-805 text-[10px] font-mono font-black uppercase text-slate-605 dark:text-slate-350 rounded-lg focus:outline-none focus:border-red-550 transition-colors"
                              title="Set auto-synchronization background frequency"
                            >
                              <option value="manual">Manual</option>
                              <option value="hourly">Hourly</option>
                              <option value="daily">Daily</option>
                              <option value="weekly">Weekly</option>
                            </select>
                          </div>

                          {/* Trigger Force Sync */}
                          <button
                            onClick={() => handleForceSyncNow(src.id)}
                            disabled={status === 'syncing'}
                            className="p-1 px-2.5 bg-slate-100 hover:bg-slate-205 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-[10px] font-black rounded-lg transition-all flex items-center gap-1 border border-slate-200 dark:border-slate-700 disabled:opacity-45 shrink-0 cursor-pointer"
                            title="Force Sync active delta changes right now"
                          >
                            <RefreshCw className={`w-3 h-3 ${status === 'syncing' ? 'animate-spin text-red-500' : ''}`} />
                            <span>{status === 'syncing' ? 'Syncing...' : 'Sync'}</span>
                          </button>

                          {/* Delete Menu Dropdown or Popovers options */}
                          <div className="relative group/delete">
                            <button className="p-1.5 hover:bg-red-50 hover:text-red-650 dark:hover:bg-red-950/30 text-slate-400 rounded-lg transition-colors border border-transparent cursor-pointer">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            {/* Keep or Wipe Dropdown option overlays absolute absolute position */}
                            <div className="absolute right-0 bottom-full mb-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg p-2.5 hidden group-hover/delete:flex flex-col gap-1.5 z-30 w-44 animate-in fade-in zoom-in-95 duration-100 text-left">
                              <span className="text-[9px] font-mono font-black text-slate-400 uppercase tracking-wider pb-1 italic border-b border-slate-100 dark:border-slate-800">Uninstall tracking?</span>
                              <button
                                onClick={() => handleDeleteSource(src.id, false)}
                                className="text-left text-[10px] font-extrabold text-red-550 hover:bg-red-50 dark:hover:bg-red-950/20 px-2 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer w-full text-red-600 dark:text-red-400"
                              >
                                <XCircle className="w-3.5 h-3.5 shrink-0" />
                                <span>Wipe source & videos</span>
                              </button>
                              <button
                                onClick={() => handleDeleteSource(src.id, true)}
                                className="text-left text-[10px] font-extrabold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 px-2 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer w-full"
                              >
                                <CheckCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>Remove source, keep vids</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Column B: Active/Historical Jobs Progress Cards */}
            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono flex items-center gap-1.5 font-sans">
                <History className="w-4 h-4 text-slate-400 font-sans" />
                <span>Extraction Engine & Background Jobs ({activeJobs.filter(j => j.status !== 'completed' && j.status !== 'cancelled').length} active)</span>
              </h4>

              {activeJobs.length === 0 ? (
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-150 dark:border-slate-850 text-center text-xs font-medium text-slate-400 py-6">
                  No active background extractions or sync jobs are running.
                </div>
              ) : (
                <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                  {activeJobs.map(job => {
                    const pct = job.totalVideos > 0 ? Math.round((job.importedVideosCount / job.totalVideos) * 100) : 0;
                    const isRunning = ['starting', 'importing', 'syncing'].includes(job.status);
                    
                    return (
                      <div key={job.id} className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-850 flex flex-col gap-3 relative overflow-hidden">
                        {/* Status top card lines */}
                        <div className="flex items-center justify-between gap-1 text-left min-w-0">
                          <div className="truncate flex-1 min-w-0">
                            <span className="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Job #{job.id.slice(0, 8)}</span>
                            <span className="text-xs font-extrabold text-slate-805 dark:text-white block truncate">{job.title || job.sourceUrl}</span>
                          </div>

                          <span className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-full select-none shrink-0 ${
                            job.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                              : job.status === 'error'
                                ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
                                : job.status === 'paused'
                                  ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                                  : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 animate-pulse'
                          }`}>
                            {job.status}
                          </span>
                        </div>

                        {/* Middle loader stats line */}
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            {/* Progress bar wrap container */}
                            <div className="w-full bg-slate-100 dark:bg-slate-950 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-red-600 h-1.5 rounded-full transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <div className="flex justify-between items-center text-[9px] font-mono font-bold text-slate-400 mt-1">
                              <span>{pct}% ({job.importedVideosCount} / {job.totalVideos || '...' }) videos</span>
                              {isRunning && job.etaSeconds && (
                                <span>ETA: ~{job.etaSeconds}s</span>
                              )}
                            </div>
                          </div>

                          {/* Control actions for Job block */}
                          {isRunning && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleToggleJobPause(job.id)}
                                className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
                                title="Pause Sync Job"
                              >
                                {job.status === 'paused' ? (
                                  <PlayCircle className="w-4 h-4 text-emerald-500" />
                                ) : (
                                  <PauseCircle className="w-4 h-4 text-amber-500" />
                                )}
                              </button>
                              <button
                                onClick={() => handleCancelJob(job.id)}
                                className="p-1 text-slate-400 hover:text-red-550 rounded-lg transition-colors cursor-pointer"
                                title="Cancel Job"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>

                        {job.errorMsg && (
                          <p className="text-[9px] text-red-500 leading-tight italic font-mono text-left">
                            ⚠️ {job.errorMsg}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Control Actions toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-[2rem] border border-slate-200 dark:border-slate-855 shadow-3xs">
        {/* Search */}
        <div className="relative w-full lg:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search titles, publisher channels, relative tags, short synopses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-805 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-hidden focus:border-red-500 transition-all font-sans font-semibold"
          />
        </div>

        {/* Filters Grouping */}
        <div className="w-full lg:w-auto flex flex-wrap sm:flex-nowrap items-center gap-2 select-none">
          {/* Topic */}
          <div className="w-full sm:w-auto flex items-center gap-1.5 bg-slate-50/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl">
            <Layers className="w-3.5 h-3.5 text-slate-405 shrink-0" />
            <select
              value={selectedTopicId}
              onChange={(e) => setSelectedTopicId(e.target.value)}
              className="bg-transparent text-xs font-bold font-sans outline-hidden text-slate-700 dark:text-slate-300 cursor-pointer min-w-[125px]"
            >
              <option value="all">All Topics (Default)</option>
              {topics.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Duration */}
          <div className="w-full sm:w-auto flex items-center gap-1.5 bg-slate-50/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl">
            <Clock className="w-3.5 h-3.5 text-slate-405 shrink-0" />
            <select
              value={selectedDuration}
              onChange={(e) => setSelectedDuration(e.target.value)}
              className="bg-transparent text-xs font-bold font-sans outline-hidden text-slate-700 dark:text-slate-300 cursor-pointer min-w-[110px]"
            >
              <option value="all">All Durations</option>
              <option value="short">Short (&lt; 5 mins)</option>
              <option value="medium">Medium (5-15 mins)</option>
              <option value="long">Long (15-45 mins)</option>
              <option value="excessive">In-Depth (45m+)</option>
            </select>
          </div>

          {/* Sort */}
          <div className="w-full sm:w-auto flex items-center gap-1.5 bg-slate-50/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-445 shrink-0" />
            <select
              value={selectedSort}
              onChange={(e) => setSelectedSort(e.target.value)}
              className="bg-transparent text-xs font-bold font-sans outline-hidden text-slate-700 dark:text-slate-300 cursor-pointer min-w-[140px]"
            >
              <option value="imported-desc">Imported: Newest</option>
              <option value="published-desc">Published: Newest</option>
              <option value="published-asc">Published: Oldest</option>
              <option value="views-desc">Views: Highest</option>
              <option value="duration-desc">Duration: Longest</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main interactive player if active */}
      {activeVideoUrl && (
        <div 
          id="media-player-section"
          className="p-6 rounded-[2.25rem] bg-slate-950 text-white border border-slate-800 flex flex-col gap-4 relative animate-in zoom-in-95 duration-150 shadow-2xl scroll-mt-24"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-mono bg-red-500/25 text-red-450 px-2.5 py-1 rounded-full font-black animate-pulse flex items-center gap-1 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <span>Now Playing inside System Canvas</span>
              </span>
              {currentlyWatchingVideo && (
                <span className="text-xs font-mono text-slate-300 font-bold truncate max-w-[280px] xs:max-w-xs md:max-w-md">
                   ➔  "{currentlyWatchingVideo.title}"
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2 self-end sm:self-auto">
              {currentlyWatchingVideo && (
                <button
                  onClick={() => handleToggleComplete(currentlyWatchingVideo.id)}
                  className={`px-3.5 py-1 text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer transition-colors ${
                    currentlyWatchingVideo.isCompleted 
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/30' 
                      : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{currentlyWatchingVideo.isCompleted ? 'Watched!' : 'Mark Completed'}</span>
                </button>
              )}
              
              <button 
                onClick={() => setActiveVideoUrl(null)}
                className="text-xs text-slate-400 hover:text-white font-mono bg-slate-900 hover:bg-slate-800 px-3 py-1 rounded-xl cursor-pointer transition-colors"
              >
                Close Screen
              </button>
            </div>
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
                  className="px-4 py-2 bg-slate-800/85 rounded-xl text-xs font-mono font-bold tracking-wider uppercase flex items-center gap-1.5 hover:bg-slate-700 hover:text-white transition-colors"
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
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", vid.id);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragOverId !== vid.id) {
                  setDragOverId(vid.id);
                }
              }}
              onDragLeave={() => {
                setDragOverId(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                const dId = e.dataTransfer.getData("text/plain");
                handleReorder(dId, vid.id);
                setDragOverId(null);
              }}
              className={`bg-white dark:bg-slate-900 border ${
                vid.isPlaying 
                  ? 'border-red-500/80 ring-3 ring-red-500/10' 
                  : dragOverId === vid.id
                    ? 'border-blue-500 ring-4 ring-blue-500/10 scale-[0.98]'
                    : vid.isCompleted 
                      ? 'border-emerald-500/30 dark:border-emerald-900/30 ring-3 ring-emerald-500/5'
                      : 'border-slate-205 dark:border-slate-855'
              } rounded-[2.1rem] overflow-hidden group hover:border-slate-350 dark:hover:border-slate-800 shadow-3xs hover:shadow-xs transition-all duration-300 flex flex-col text-left relative cursor-grab active:cursor-grabbing`}
            >
              <div className="absolute top-3.5 right-3.5 z-10 p-1 bg-black/50 hover:bg-black/75 text-white/80 rounded-md shadow-xs flex items-center gap-0.5 select-none transition-all duration-150" title="Drag card to reorder position in list">
                <GripVertical className="w-3 h-3 text-white/90" />
                <span className="text-[8px] font-mono font-black uppercase tracking-widest px-0.5">Move</span>
              </div>

              {vid.isPlaying && (
                <div className="absolute top-3.5 left-3.5 z-10 px-3 py-1 bg-red-655 text-white text-[9px] font-black uppercase tracking-wider rounded-full shadow-md animate-pulse flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  <span>Now Capturing</span>
                </div>
              )}

              {vid.isCompleted && !vid.isPlaying && (
                <span className="absolute top-3.5 left-3.5 z-10 px-3 py-1 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-wider rounded-full shadow-xs flex items-center gap-1 font-mono">
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  <span>Completed</span>
                </span>
              )}

              {/* Thumbnail Play Section */}
              <div className="relative aspect-video bg-slate-100 dark:bg-slate-950 overflow-hidden shrink-0 flex items-center justify-center text-center">
                {thumbUrl === 'placeholder' ? (
                  <div className="absolute inset-0 bg-gradient-to-tr from-slate-900 via-slate-850 to-red-950/80 flex flex-col items-center justify-center gap-1.5 p-4 text-white">
                    <FileVideo className="w-10 h-10 text-rose-500 opacity-90" />
                    <span className="text-[10px] font-mono opacity-80 tracking-wide font-bold uppercase select-none">Local Video Asset</span>
                    <span className="text-[9px] font-mono opacity-40 truncate max-w-full">{(resolvedVideoUrls[vid.id] ? "Loaded Offline Ready" : "Loading binary...")}</span>
                  </div>
                ) : (
                  <img 
                    src={thumbUrl} 
                    alt={vid.title} 
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                )}
                
                {/* Visual Glass backdrop dark layer overlay */}
                <div className="absolute inset-0 bg-slate-950/15 group-hover:bg-slate-950/35 transition-colors duration-300" />

                {/* Circle Center video trigger */}
                <button
                  onClick={() => {
                    if (playUrl) {
                      handlePlayAndMark(vid.id, playUrl);
                    }
                  }}
                  className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full ${
                    vid.isPlaying 
                      ? 'bg-red-650 text-white scale-110 shadow-lg shadow-red-600/30' 
                      : 'bg-black/60 hover:bg-red-600 text-white shadow-lg hover:scale-110'
                  } flex items-center justify-center transition-all duration-300 cursor-pointer`}
                  title="Play video resource inside canvas"
                >
                  {vid.isPlaying ? (
                    <span className="flex items-center justify-center gap-0.5">
                      <span className="w-1 h-3.5 bg-white rounded-xs animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <span className="w-1 h-5 bg-white rounded-xs animate-bounce" style={{ animationDelay: '0.2s' }} />
                      <span className="w-1 h-3 bg-white rounded-xs animate-bounce" style={{ animationDelay: '0.3s' }} />
                    </span>
                  ) : (
                    <Play className="w-6 h-6 fill-current ml-0.5" />
                  )}
                </button>

                {vid.durationSeconds ? (
                  <span className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-md text-[10px] font-mono font-black text-white px-2 py-0.5 rounded-md shadow-xs select-none">
                    {formatDuration(vid.durationSeconds)}
                  </span>
                ) : (
                  <span className="absolute bottom-3.5 right-3.5 bg-black/75 backdrop-blur-xs text-[9px] font-mono tracking-wider font-bold text-white px-2 py-0.5 rounded-lg uppercase">
                    {isLocal ? 'Local Storage' : (vid.platform === 'youtube' ? 'YouTube' : 'Web Video')}
                  </span>
                )}
              </div>

              {/* Text Info Section */}
              <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-1">
                    {sub && topic ? (
                      <button
                        onClick={() => onOpenSubtopic(topic.id, sub.id)}
                        className="inline-flex items-center gap-1.5 text-slate-505 hover:text-red-600 dark:hover:text-red-400 text-[10px] font-bold font-mono tracking-wide transition-colors truncate"
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: topic.color }} />
                        <span>{topic.name}</span>
                        <span className="text-slate-405 font-sans">➔</span>
                        <span className="underline truncate">{sub.name}</span>
                      </button>
                    ) : (
                      <span className="text-[9px] text-slate-400 font-mono font-bold uppercase tracking-wider">Curated Resource</span>
                    )}

                    <span className="text-[9px] text-slate-400 font-mono shrink-0 font-semibold">
                      {new Date(vid.createdAt || Date.now()).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                    </span>
                  </div>

                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white line-clamp-2 leading-snug">
                    {vid.title}
                  </h4>

                  {/* Channel Publisher Badge */}
                  {vid.channelTitle && (
                    <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-500 dark:text-slate-400 pt-0.5 select-none">
                      <Tv className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      <span>{vid.channelTitle}</span>
                    </div>
                  )}

                  {/* Dynamic View count and publication offset indicators */}
                  {(vid.views || vid.publishedAt) && (
                    <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-405 dark:text-slate-500 font-mono pt-0.5 select-none">
                      {vid.views && (
                        <span className="flex items-center gap-1 shrink-0">
                          <Eye className="w-3.5 h-3.5" />
                          <span>{formatViews(vid.views)}</span>
                        </span>
                      )}
                      {vid.views && vid.publishedAt && <span>•</span>}
                      {vid.publishedAt && (
                        <span className="flex items-center gap-1 shrink-0">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{new Date(vid.publishedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}</span>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Extra Rich Video Description synopsis */}
                  {vid.description && (
                    <p className="text-[11px] font-medium text-slate-450 dark:text-slate-550 line-clamp-2 leading-relaxed pt-1.5 italic text-left">
                      {vid.description}
                    </p>
                  )}
                </div>

                {/* Tactile Watch-Complete switch slider */}
                <div className="bg-slate-55/70 dark:bg-slate-950/40 p-2.5 rounded-2xl border border-slate-155 dark:border-slate-850 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-450 dark:text-slate-550 block leading-none select-none">
                      Complete Watch
                    </span>
                    <span className="text-[11px] font-bold text-slate-705 dark:text-slate-350 block leading-tight">
                      {vid.isCompleted ? '🎉 Mastered!' : '⏳ Not Watched'}
                    </span>
                  </div>

                  {/* Tactile Switch */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleComplete(vid.id);
                    }}
                    className={`relative w-11 h-6 rounded-full transition-all duration-300 focus:outline-none cursor-pointer border ${
                      vid.isCompleted 
                        ? 'bg-emerald-500 border-emerald-600 shadow-xs shadow-emerald-500/10' 
                        : 'bg-slate-205 dark:bg-slate-800 border-slate-300/80 dark:border-slate-750'
                    }`}
                    title="Slide to complete/uncomplete watch progress"
                  >
                    <motion.div
                      layout
                      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                      className={`w-5 h-5 rounded-full bg-white shadow-xs flex items-center justify-center text-[10px] font-bold ${
                        vid.isCompleted ? 'text-emerald-500' : 'text-slate-400'
                      }`}
                      animate={{ x: vid.isCompleted ? 20 : 1 }}
                    >
                      {vid.isCompleted ? '✓' : ''}
                    </motion.div>
                  </button>
                </div>

                {/* Bottom Highlighter & Actions line */}
                <div className="space-y-2.5 pt-1">
                  {/* Highlighter red button / marker */}
                  <button
                    onClick={() => {
                      if (playUrl) {
                        handlePlayAndMark(vid.id, playUrl);
                      }
                    }}
                    className={`w-full py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      vid.isPlaying 
                        ? 'bg-red-600 text-white shadow-md shadow-red-600/20 ring-2 ring-red-400/30' 
                        : 'bg-slate-50 hover:bg-red-50 text-slate-855 hover:text-red-700 dark:bg-slate-800/50 dark:hover:bg-red-950/20 dark:text-slate-300 dark:hover:text-red-400 border border-slate-100 dark:border-slate-850 hover:border-red-150 dark:hover:border-red-900/40'
                    }`}
                  >
                    {vid.isPlaying ? (
                      <>
                        <Tv className="w-3.5 h-3.5 animate-pulse" />
                        <span>📺 NOW WATCHING</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 fill-current" />
                        <span>Play Lecture Guide</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-850 pt-2 text-[10px] text-slate-400">
                    {isLocal ? (
                      <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 dark:text-slate-500 font-bold">
                        Offline Ready
                      </span>
                    ) : (
                      <button
                        onClick={() => handlePlayAndMark(vid.id, undefined, true, vid.url)}
                        className="inline-flex items-center gap-1 hover:text-blue-650 dark:hover:text-blue-400 font-bold transition-all uppercase font-mono tracking-widest text-[#4d4d4d] dark:text-slate-450"
                        title="Opening source link marks this video as active player focus"
                      >
                        <span>Source link</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
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
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setVideoType('link');
                        setFormError('');
                      }}
                      className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl border text-center transition-all cursor-pointer ${
                        videoType === 'link'
                          ? 'bg-slate-50 border-red-500 shadow-3xs dark:bg-slate-850'
                          : 'bg-white hover:bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Link className={`w-4 h-4 ${videoType === 'link' ? 'text-red-500' : 'text-slate-400'}`} />
                      <div className="text-center select-none">
                        <span className="block text-[10px] font-black text-slate-850 dark:text-white">Single Link</span>
                        <span className="block text-[8px] text-slate-405 font-bold tracking-wider leading-none mt-0.5">YOUTUBE URL</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setVideoType('playlist');
                        setFormError('');
                      }}
                      className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl border text-center transition-all cursor-pointer ${
                        videoType === 'playlist'
                          ? 'bg-slate-50 border-red-500 shadow-3xs dark:bg-slate-850'
                          : 'bg-white hover:bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Layers className={`w-4 h-4 ${videoType === 'playlist' ? 'text-red-500' : 'text-slate-400'}`} />
                      <div className="text-center select-none">
                        <span className="block text-[10px] font-black text-slate-850 dark:text-white">Playlist IP</span>
                        <span className="block text-[8px] text-slate-405 font-bold tracking-wider leading-none mt-0.5">CRAWLER</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setVideoType('upload');
                        setFormError('');
                      }}
                      className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl border text-center transition-all cursor-pointer ${
                        videoType === 'upload'
                          ? 'bg-slate-50 border-red-500 shadow-3xs dark:bg-slate-850'
                          : 'bg-white hover:bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Upload className={`w-4 h-4 ${videoType === 'upload' ? 'text-red-500' : 'text-slate-400'}`} />
                      <div className="text-center select-none">
                        <span className="block text-[10px] font-black text-slate-850 dark:text-white">Upload MP4</span>
                        <span className="block text-[8px] text-slate-405 font-bold tracking-wider leading-none mt-0.5">LOCAL DB</span>
                      </div>
                    </button>
                  </div>

                  {/* Inputs for Link */}
                  {videoType === 'link' && (
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
                  )}

                  {/* Inputs for Playlist */}
                  {videoType === 'playlist' && (
                    <div className="space-y-3 pt-1">
                      <div className="space-y-1">
                        <h4 className="text-xs font-black text-slate-800 dark:text-white">
                          Copy & Paste YouTube Link (Channels, Playlists, Videos)*
                        </h4>
                        <div className="flex gap-1.5">
                          <input
                            type="url"
                            placeholder="e.g. youtube.com/playlist?list=... or youtube.com/@channel"
                            value={importPlaylistUrl}
                            onChange={(e) => setImportPlaylistUrl(e.target.value)}
                            className="flex-grow px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-950 text-xs font-semibold outline-none focus:border-red-550 text-slate-905 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={handleFetchPlaylist}
                            disabled={importStatus === 'loading'}
                            className="px-4 py-2 bg-red-650 hover:bg-red-505 disabled:bg-slate-300 disabled:dark:bg-slate-850 text-white text-xs font-black rounded-xl cursor-pointer transition-all flex items-center gap-1 shrink-0 select-none"
                          >
                            {importStatus === 'loading' ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Fetching...</span>
                              </>
                            ) : (
                              <span>Fetch Videos</span>
                            )}
                          </button>
                        </div>

                        {/* Interactive Playlist Range controls */}
                        <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/60 mt-3 space-y-3">
                          <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Import Video Range Scope
                          </h5>
                          
                          <div className="grid grid-cols-2 gap-2 mt-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setRangeMode('all');
                              }}
                              className={`py-2 px-3 text-[11px] font-black rounded-xl border text-center transition-all cursor-pointer ${
                                rangeMode === 'all'
                                  ? 'bg-red-500 text-white border-red-500 shadow-3xs'
                                  : 'bg-white hover:bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:text-slate-800 dark:hover:text-white'
                              }`}
                            >
                              Fetch All Videos
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => {
                                setRangeMode('custom');
                              }}
                              className={`py-2 px-3 text-[11px] font-black rounded-xl border text-center transition-all cursor-pointer ${
                                rangeMode === 'custom'
                                  ? 'bg-red-500 text-white border-red-500 shadow-3xs'
                                  : 'bg-white hover:bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:text-slate-800 dark:hover:text-white'
                              }`}
                            >
                              Fetch Custom Ranges
                            </button>
                          </div>

                          {rangeMode === 'custom' && (
                            <div className="space-y-2 mt-2 animate-in slide-in-from-top-2 duration-100">
                              {/* Range Preset Options inside Custom */}
                              <div className="flex flex-wrap gap-1.5 pb-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRangeStart(10);
                                    setRangeEnd(20);
                                  }}
                                  className={`px-2 py-1 text-[10px] font-bold rounded-lg border cursor-pointer transition-all ${
                                    rangeStart === 10 && rangeEnd === 20
                                      ? 'bg-red-100 dark:bg-red-950/60 border-red-300 dark:border-red-900 text-red-700 dark:text-red-300'
                                      : 'bg-white hover:bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                                  }`}
                                >
                                  Preset: 10 videos (no. 10 to 20)
                                </button>
                                
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRangeStart(25);
                                    setRangeEnd(45);
                                  }}
                                  className={`px-2 py-1 text-[10px] font-bold rounded-lg border cursor-pointer transition-all ${
                                    rangeStart === 25 && rangeEnd === 45
                                      ? 'bg-red-100 dark:bg-red-950/60 border-red-300 dark:border-red-900 text-red-700 dark:text-red-300'
                                      : 'bg-white hover:bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                                  }`}
                                >
                                  Preset: 20 videos (no. 25 to 45)
                                </button>
                              </div>

                              <div className="grid grid-cols-2 gap-3 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-150 dark:border-slate-800">
                                <div className="space-y-1">
                                  <label className="block text-[10px] font-black text-slate-405">START AT (VIDEO #)</label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={rangeStart}
                                    onChange={(e) => setRangeStart(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="w-full px-2.5 py-1.5 text-xs font-black rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-955 text-slate-800 dark:text-white outline-none focus:border-red-500"
                                  />
                                </div>
                                
                                <div className="space-y-1">
                                  <label className="block text-[10px] font-black text-slate-405">END AT (VIDEO #)</label>
                                  <input
                                    type="number"
                                    min={rangeStart}
                                    value={rangeEnd}
                                    onChange={(e) => setRangeEnd(Math.max(rangeStart, parseInt(e.target.value) || rangeStart))}
                                    className="w-full px-2.5 py-1.5 text-xs font-black rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-955 text-slate-800 dark:text-white outline-none focus:border-red-500"
                                  />
                                </div>
                              </div>
                              
                              <p className="text-[9px] text-slate-400 italic">
                                Scrapes custom section starting at playlist item index <strong>#{rangeStart}</strong> and stopping strictly after index <strong>#{rangeEnd}</strong> (Total <strong>{rangeEnd - rangeStart + 1}</strong> videos max, saving YouTube Quota).
                              </p>
                            </div>
                          )}
                        </div>

                        {importError && (
                          <p className="text-[10px] text-red-550 font-bold leading-tight mt-1">⚠️ {importError}</p>
                        )}
                        {importStatus === 'success' && (
                          <p className="text-[10px] text-emerald-600 font-bold leading-tight mt-1">✓ Tracking registered! Extraction engine initialized in the background.</p>
                        )}
                        <p className="text-[9px] text-slate-400 font-medium leading-relaxed mt-1">
                          Our enterprise extraction engine scrapes delta uploads, deduplicates existing items, paginates historical records, and bypasses limitation limits automatically in the background.
                        </p>
                      </div>

                      {/* Import Preview results list */}
                      {importedPreview && (
                        <div className="p-3.5 bg-emerald-500/5 border border-emerald-500/15 rounded-2xl space-y-2 mt-1">
                          <div className="flex items-center justify-between border-b border-emerald-500/10 pb-2">
                            <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 max-w-[70%] truncate">
                              📚 {importedPreview.playlistTitle}
                            </span>
                            <span className="text-[9px] bg-emerald-500/10 text-emerald-600 font-mono font-black px-1.5 py-0.5 rounded-md">
                              {importedPreview.videos.length} Lectures Found
                            </span>
                          </div>

                          <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                            {importedPreview.videos.map((v, i) => (
                              <div key={v.videoId + i} className="flex gap-2 items-center text-[10px] text-slate-600 dark:text-slate-350 truncate">
                                <span className="text-[9px] font-mono font-black text-slate-400 shrink-0">#{i+1}</span>
                                <span className="truncate">{v.title}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Inputs for Upload */}
                  {videoType === 'upload' && (
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

                  {videoType !== 'playlist' && (
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
                  )}
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
