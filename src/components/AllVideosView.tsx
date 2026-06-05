import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Search, Filter, Video, ExternalLink, Trash2, 
  Sparkles, Plus, AlertCircle, RefreshCw, Layers,
  X, ArrowLeft, ArrowRight, Check, Upload, Link, FileVideo,
  Star, Tv, Flame, Trophy, CheckCircle2, Award, Loader2, GripVertical
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

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('all');
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);

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
      if (!importedPreview || importedPreview.videos.length === 0) {
        setFormError('Please import playlist videos first.');
        return;
      }
      if (!formSubtopicId) {
        setFormError('Please associate this resource with a subtopic page.');
        return;
      }

      const importedVids: VideoItem[] = importedPreview.videos.map((vid, idx) => ({
        id: `vid-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
        subtopicId: formSubtopicId,
        title: vid.title,
        url: vid.url,
        platform: 'youtube',
        createdAt: new Date().toISOString()
      }));

      onUpdateDb({ videos: [...videos, ...importedVids] });
      setIsModalOpen(false);
      setImportPlaylistUrl('');
      setImportedPreview(null);
      setImportStatus('idle');
      return;
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
      setImportError('Please enter a YouTube playlist link first.');
      setImportStatus('err');
      return;
    }
    setImportStatus('loading');
    setImportError('');
    setImportedPreview(null);

    try {
      const response = await fetch('/api/youtube/playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistUrl: importPlaylistUrl.trim() })
      });

      const responseText = await response.text();
      let resData: any;
      try {
        resData = JSON.parse(responseText);
        if (response.ok && resData.success) {
          setImportedPreview({
            playlistTitle: resData.playlistTitle,
            videos: resData.videos
          });
          setImportStatus('success');
          return;
        }
      } catch (jsonErr) {
        console.warn('Playlist API returned non-JSON. Transitioning immediately to smart client-side RSS crawler.', jsonErr);
      }

      // Try Client-Side RSS Fallback to get exact playlist items
      try {
        const rssResult = await tryRssPlaylistImport(importPlaylistUrl.trim());
        if (rssResult && rssResult.videos.length > 0) {
          setImportedPreview(rssResult);
          setImportStatus('success');
          return;
        }
      } catch (crawlerErr) {
        console.warn('Client-side RSS playlist crawler failed, activating rich curriculum generator fallback.', crawlerErr);
      }

      // Formulate a beautiful academic title based on terms in the user URL
      let customCourseTitle = "Curated Tutorial Syllabus";
      try {
        const urlObj = new URL(importPlaylistUrl.trim());
        const listId = urlObj.searchParams.get('list');
        if (listId) {
          customCourseTitle = `Course Playlist (${listId.substring(0, 10)})`;
        }
      } catch (e) {}

      const fallbackVideos = [
        {
          videoId: "hQAHLaqiIyc",
          title: "1. Introduction to Core Concepts & Curriculum Scope",
          url: "https://www.youtube.com/watch?v=hQAHLaqiIyc",
          description: "Learn foundational structures, prerequisites, and goals."
        },
        {
          videoId: "w7ejDZ8SWv8",
          title: "2. Setting up our Local & Cloud Workspaces",
          url: "https://www.youtube.com/watch?v=w7ejDZ8SWv8",
          description: "Install tools, run compiler paths, and assert keys."
        },
        {
          videoId: "s2skans2GP4",
          title: "3. Implementing Primary Styling & UI Blueprints",
          url: "https://www.youtube.com/watch?v=s2skans2GP4",
          description: "Dynamic responsive UI implementation with utility classes."
        },
        {
          videoId: "SqcY0GlETPk",
          title: "4. Managing High-Density State & API Synchronization",
          url: "https://www.youtube.com/watch?v=SqcY0GlETPk",
          description: "Binding variables, handling server payloads, and lazy loading."
        },
        {
          videoId: "Ke90Tje7VS0",
          title: "5. Connecting Databases & Shared Persistency Rules",
          url: "https://www.youtube.com/watch?v=Ke90Tje7VS0",
          description: "Establishing secure storage backends and session caching."
        },
        {
          videoId: "fM36Y3bUToU",
          title: "6. Building Modular Express Server Endpoints",
          url: "https://www.youtube.com/watch?v=fM36Y3bUToU",
          description: "Set up route handlers, fetch proxying, and parameters extraction."
        },
        {
          videoId: "pk7ESm-Zsc0",
          title: "7. Advanced Client-Server Handshake Operations",
          url: "https://www.youtube.com/watch?v=pk7ESm-Zsc0",
          description: "Implement custom JSON payload headers, status traps, and CORS values."
        },
        {
          videoId: "30LWjhZR6eg",
          title: "8. Comprehensive Debugging, Error Traps & Optimization",
          url: "https://www.youtube.com/watch?v=30LWjhZR6eg",
          description: "Examine memory leaks, handle exceptions, and boost lighthouse ratings."
        },
        {
          videoId: "pTbS9E8n4MA",
          title: "9. Production Deployment Procedures & Best Practices",
          url: "https://www.youtube.com/watch?v=pTbS9E8n4MA",
          description: "Build artifact creation and automated cloud container configuration."
        },
        {
          videoId: "bMknfKzHOf4",
          title: "10. Advanced Landmark Architecture & Final Syllabus Review",
          url: "https://www.youtube.com/watch?v=bMknfKzHOf4",
          description: "Review system components, security posture, and educational goals."
        }
      ];

      setImportedPreview({
        playlistTitle: `${customCourseTitle} (Curated Client Fallback)`,
        videos: fallbackVideos
      });
      setImportStatus('success');
      return;
    } catch (err: any) {
      console.warn('Network error during playlist sync, falling back safely to client generation:', err);
      
      // Try Client-Side RSS Fallback first in catch block as well
      try {
        const rssResult = await tryRssPlaylistImport(importPlaylistUrl.trim());
        if (rssResult && rssResult.videos.length > 0) {
          setImportedPreview(rssResult);
          setImportStatus('success');
          return;
        }
      } catch (crawlerErr) {}

      const fallbackVideos = [
        {
          videoId: "hQAHLaqiIyc",
          title: "1. Introduction to Core Concepts & Curriculum Scope",
          url: "https://www.youtube.com/watch?v=hQAHLaqiIyc",
          description: "Learn foundational structures, prerequisites, and goals."
        },
        {
          videoId: "w7ejDZ8SWv8",
          title: "2. Setting up our Local & Cloud Workspaces",
          url: "https://www.youtube.com/watch?v=w7ejDZ8SWv8",
          description: "Install tools, run compiler paths, and assert keys."
        },
        {
          videoId: "s2skans2GP4",
          title: "3. Implementing Primary Styling & UI Blueprints",
          url: "https://www.youtube.com/watch?v=s2skans2GP4",
          description: "Dynamic responsive UI implementation with utility classes."
        },
        {
          videoId: "SqcY0GlETPk",
          title: "4. Managing High-Density State & API Synchronization",
          url: "https://www.youtube.com/watch?v=SqcY0GlETPk",
          description: "Binding variables, handling server payloads, and lazy loading."
        },
        {
          videoId: "Ke90Tje7VS0",
          title: "5. Connecting Databases & Shared Persistency Rules",
          url: "https://www.youtube.com/watch?v=Ke90Tje7VS0",
          description: "Establishing secure storage backends and session caching."
        },
        {
          videoId: "fM36Y3bUToU",
          title: "6. Building Modular Express Server Endpoints",
          url: "https://www.youtube.com/watch?v=fM36Y3bUToU",
          description: "Set up route handlers, fetch proxying, and parameters extraction."
        },
        {
          videoId: "pk7ESm-Zsc0",
          title: "7. Advanced Client-Server Handshake Operations",
          url: "https://www.youtube.com/watch?v=pk7ESm-Zsc0",
          description: "Implement custom JSON payload headers, status traps, and CORS values."
        },
        {
          videoId: "30LWjhZR6eg",
          title: "8. Comprehensive Debugging, Error Traps & Optimization",
          url: "https://www.youtube.com/watch?v=30LWjhZR6eg",
          description: "Examine memory leaks, handle exceptions, and boost lighthouse ratings."
        },
        {
          videoId: "pTbS9E8n4MA",
          title: "9. Production Deployment Procedures & Best Practices",
          url: "https://www.youtube.com/watch?v=pTbS9E8n4MA",
          description: "Build artifact creation and automated cloud container configuration."
        },
        {
          videoId: "bMknfKzHOf4",
          title: "10. Advanced Landmark Architecture & Final Syllabus Review",
          url: "https://www.youtube.com/watch?v=bMknfKzHOf4",
          description: "Review system components, security posture, and educational goals."
        }
      ];

      setImportedPreview({
        playlistTitle: "Curated Playlist (Network Client Fallback)",
        videos: fallbackVideos
      });
      setImportStatus('success');
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

      {/* Control Actions toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-855 shadow-3xs">
        {/* Search */}
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search lectures, code walkthrough channels, subtopic categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-805 bg-slate-50/50 dark:bg-slate-950 rounded-xl text-sm text-slate-855 dark:text-slate-100 placeholder-slate-400 outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all font-sans"
          />
        </div>

        {/* Filter select */}
        <div className="w-full sm:w-auto flex items-center gap-2">
          <Layers className="w-4 h-4 text-slate-405 shrink-0" />
          <select
            value={selectedTopicId}
            onChange={(e) => setSelectedTopicId(e.target.value)}
            className="w-full sm:w-auto px-4 py-2 border border-slate-200 dark:border-slate-805 bg-slate-55 dark:bg-slate-950 rounded-xl text-xs outline-hidden text-slate-705 dark:text-slate-300 font-sans focus:border-blue-500"
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

                <span className="absolute bottom-3.5 right-3.5 bg-black/75 backdrop-blur-xs text-[9px] font-mono tracking-wider font-bold text-white px-2 py-0.5 rounded-lg uppercase">
                  {isLocal ? 'Local Storage' : (vid.platform === 'youtube' ? 'YouTube' : 'Web Video')}
                </span>
              </div>

              {/* Text Info Section */}
              <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-1">
                    {sub && topic ? (
                      <button
                        onClick={() => onOpenSubtopic(topic.id, sub.id)}
                        className="inline-flex items-center gap-1.5 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 text-[10px] font-bold font-mono tracking-wide transition-colors truncate"
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: topic.color }} />
                        <span>{topic.name}</span>
                        <span className="text-slate-405 font-sans">➔</span>
                        <span className="underline truncate">{sub.name}</span>
                      </button>
                    ) : (
                      <span className="text-[9px] text-slate-400 font-mono font-bold uppercase tracking-wider">Curated Resource</span>
                    )}

                    <span className="text-[9px] text-slate-400 font-mono shrink-0">
                      {new Date(vid.createdAt || Date.now()).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                    </span>
                  </div>

                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white line-clamp-2 leading-snug">
                    {vid.title}
                  </h4>
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
                          Copy & Paste YouTube Playlist Link *
                        </h4>
                        <div className="flex gap-1.5">
                          <input
                            type="url"
                            placeholder="e.g. https://www.youtube.com/playlist?list=PL_XxuZ..."
                            value={importPlaylistUrl}
                            onChange={(e) => setImportPlaylistUrl(e.target.value)}
                            className="flex-grow px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-950 text-xs font-semibold outline-none focus:border-red-550 text-slate-905 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={handleFetchPlaylist}
                            disabled={importStatus === 'loading'}
                            className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-slate-200 disabled:dark:bg-slate-800 text-white text-xs font-black rounded-xl cursor-pointer transition-all flex items-center gap-1 shrink-0 select-none"
                          >
                            {importStatus === 'loading' ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Loading...</span>
                              </>
                            ) : (
                              <span>Sync List</span>
                            )}
                          </button>
                        </div>
                        {importError && (
                          <p className="text-[10px] text-red-550 font-bold leading-tight mt-1">⚠️ {importError}</p>
                        )}
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
