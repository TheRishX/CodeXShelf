import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Plus, Trash2, Search, Pin, Star, Mic, MicOff, Check, CornerDownRight, ListFilter, Calendar
} from 'lucide-react';
import { DatabaseState, QuickNoteItem } from '../types';

interface QuickNotesViewProps {
  dbState: DatabaseState;
  onUpdateDb: (updates: Partial<DatabaseState>) => void;
}

export function QuickNotesView({ dbState, onUpdateDb }: QuickNotesViewProps) {
  const quickNotes = dbState.quickNotes || [];
  
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(
    quickNotes.length > 0 ? quickNotes[0].id : null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'pinned' | 'favorites'>('all');

  // Speech Recognition state
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  const SpeechRecognitionClass = typeof window !== 'undefined' 
    ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) 
    : null;

  useEffect(() => {
    if (SpeechRecognitionClass) {
      const rec = new SpeechRecognitionClass();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };

      rec.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');
        
        if (transcript && selectedNoteId) {
          handleUpdateNoteContent(selectedNoteId, (prev) => {
            const separator = prev ? ' ' : '';
            return prev + separator + transcript;
          });
        }
      };

      setRecognition(rec);
    }
  }, [selectedNoteId]);

  const toggleListening = () => {
    if (!recognition) {
      alert("Speech recognition is not fully supported or is restricted in this browser environment. Please ensure that microphone access permissions are granted.");
      return;
    }

    if (isListening) {
      recognition.stop();
    } else {
      try {
        recognition.start();
      } catch (err) {
        console.error("Failed to start speech recognition:", err);
      }
    }
  };

  // Helper to update active note fields
  const handleUpdateNoteField = (id: string, field: keyof QuickNoteItem, value: any) => {
    const updatedNotes = quickNotes.map(n => {
      if (n.id === id) {
        return {
          ...n,
          [field]: value,
          updatedAt: new Date().toISOString()
        };
      }
      return n;
    });

    onUpdateDb({ quickNotes: updatedNotes });
  };

  // Helper handling functional updates to note content (used for voice transcription)
  const handleUpdateNoteContent = (id: string, updateFn: (prev: string) => string) => {
    const updatedNotes = quickNotes.map(n => {
      if (n.id === id) {
        const newContent = updateFn(n.content);
        // Auto-generate title if title is empty or default
        const lines = newContent.trim().split('\n');
        const firstLine = lines[0] ? lines[0].substring(0, 40) : '';
        const updatedTitle = (!n.title || n.title.startsWith('Untitled Note') || n.title.trim() === '')
          ? (firstLine || 'Untitled Note')
          : n.title;

        return {
          ...n,
          title: updatedTitle,
          content: newContent,
          updatedAt: new Date().toISOString()
        };
      }
      return n;
    });

    onUpdateDb({ quickNotes: updatedNotes });
  };

  const handleCreateNewNote = () => {
    const newNote: QuickNoteItem = {
      id: `qnote-${Date.now()}`,
      title: 'Untitled Note',
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPinned: false,
      isFavorite: false,
      color: '#fbbf24' // warm amber
    };

    const updatedNotes = [newNote, ...quickNotes];
    onUpdateDb({ quickNotes: updatedNotes });
    setSelectedNoteId(newNote.id);
  };

  const handleDeleteNote = (id: string) => {
    if (isListening) {
      recognition.stop();
    }
    const updatedNotes = quickNotes.filter(n => n.id !== id);
    onUpdateDb({ quickNotes: updatedNotes });
    
    if (selectedNoteId === id) {
      setSelectedNoteId(updatedNotes.length > 0 ? updatedNotes[0].id : null);
    }
  };

  // Select first note if selectedNoteId is null and notes are available
  useEffect(() => {
    if (!selectedNoteId && quickNotes.length > 0) {
      setSelectedNoteId(quickNotes[0].id);
    }
  }, [quickNotes, selectedNoteId]);

  const activeNote = quickNotes.find(n => n.id === selectedNoteId) || null;

  // Filter & Search Note list
  const filteredNotes = quickNotes
    .filter(n => {
      if (filterMode === 'pinned') return n.isPinned;
      if (filterMode === 'favorites') return n.isFavorite;
      return true;
    })
    .filter(n => {
      const query = searchQuery.toLowerCase();
      return (
        n.title.toLowerCase().includes(query) || 
        n.content.toLowerCase().includes(query)
      );
    })
    // Pin order: pinned items always float to the top, then sorted by updatedAt
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 text-left animate-in fade-in duration-300">
      
      {/* Universal Header with Stats and Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-150 dark:border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase font-mono flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/10 dark:bg-amber-500/5 text-amber-500">📝</span>
            UNIVERSAL QUICK NOTES
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Separate client-side memory ledger styled after Apple Notes. Features cloud save and voice typing.
          </p>
        </div>

        {/* Counter Pills */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 dark:bg-slate-850 px-3 py-1.5 rounded-xl border border-slate-200/50 dark:border-slate-800 flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Total Notes</span>
            <span className="text-xs font-black text-slate-700 dark:text-slate-200 font-mono">
              {quickNotes.length}
            </span>
          </div>
          <div className="bg-amber-500/10 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded-xl border border-amber-500/10 flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase">Pinned</span>
            <span className="text-xs font-black font-mono">
              {quickNotes.filter(n => n.isPinned).length}
            </span>
          </div>
          <button
            type="button"
            onClick={handleCreateNewNote}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-650 hover:from-amber-400 hover:to-amber-550 text-white font-mono text-xs font-bold px-4 py-2.5 rounded-xl shadow-md hover:scale-[1.01] active:scale-[0.98] transition-all cursor-pointer select-none"
          >
            <Plus className="w-4 h-4" />
            <span>WRITE NEW NOTE</span>
          </button>
        </div>
      </div>

      {/* Main Two-Pane Split Layout (Apple Notes Inspired) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm h-[680px]">
        
        {/* Left pane: Notes List Side Panel (lg:col-span-4) */}
        <div className="lg:col-span-4 border-r border-slate-150 dark:border-slate-850 flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/20">
          
          {/* Search bar inside list panel */}
          <div className="p-4 border-b border-slate-150 dark:border-slate-850 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search quick notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-850 dark:text-slate-100"
              />
            </div>

            {/* Filter segmented controller */}
            <div className="grid grid-cols-3 gap-1 p-0.5 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200/50 dark:border-slate-800/80">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`py-1 rounded-md text-[10px] font-bold uppercase transition-all cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm font-extrabold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('pinned')}
                className={`py-1 rounded-md text-[10px] font-bold uppercase transition-all cursor-pointer ${
                  filterMode === 'pinned'
                    ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm font-extrabold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Pinned
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('favorites')}
                className={`py-1 rounded-md text-[10px] font-bold uppercase transition-all cursor-pointer ${
                  filterMode === 'favorites'
                    ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm font-extrabold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Starred
              </button>
            </div>
          </div>

          {/* Notes items stream */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-150 dark:divide-slate-850/70">
            {filteredNotes.length === 0 ? (
              <div className="p-8 text-center space-y-2 mt-12">
                <div className="text-3xl text-slate-350 dark:text-slate-600">📭</div>
                <p className="text-xs font-bold text-slate-450 dark:text-slate-500">
                  {searchQuery ? 'No matching notes found.' : 'Your Quick Notes shelf is empty.'}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-600">
                  Click 'Write New Note' to start.
                </p>
              </div>
            ) : (
              filteredNotes.map((note) => {
                const isActive = note.id === selectedNoteId;
                const formattedDate = new Date(note.updatedAt).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric'
                });
                
                // Get a preview snippet of the content
                const cleanedContent = note.content.trim().replace(/\n/g, ' ');
                const snippet = cleanedContent || 'No additional text';

                return (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => {
                      if (isListening) recognition.stop();
                      setSelectedNoteId(note.id);
                    }}
                    className={`w-full p-4 text-left transition-all relative flex flex-col gap-1 cursor-pointer border-l-3 ${
                      isActive
                        ? 'bg-amber-500/[0.04] dark:bg-amber-500/[0.015] border-amber-500'
                        : 'border-transparent hover:bg-slate-100/60 dark:hover:bg-slate-850/30'
                    }`}
                  >
                    {/* Header and tools */}
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-xs font-extrabold truncate ${
                        isActive ? 'text-amber-600 dark:text-amber-450' : 'text-slate-800 dark:text-slate-100'
                      }`}>
                        {note.title.trim() === '' ? 'Untitled Note' : note.title}
                      </span>
                      
                      {/* Status Indicators */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {note.isPinned && (
                          <Pin className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                        )}
                        {note.isFavorite && (
                          <Star className="w-3 h-3 text-red-400 fill-red-400 shrink-0" />
                        )}
                      </div>
                    </div>

                    {/* Content preview snippet */}
                    <p className="text-[11px] text-slate-450 dark:text-slate-450 line-clamp-1 leading-relaxed">
                      {snippet}
                    </p>

                    {/* Date and tags block */}
                    <div className="flex items-center justify-between mt-2 text-[9.5px] font-mono text-slate-400 dark:text-slate-500 font-bold">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 opacity-60" />
                        {formattedDate}
                      </span>
                      {note.color && (
                        <span 
                          className="w-1.5 h-1.5 rounded-full" 
                          style={{ backgroundColor: note.color }}
                        />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right pane: Dedicated Rich Text Editor (lg:col-span-8) */}
        <div className="lg:col-span-8 flex flex-col h-full bg-white dark:bg-slate-900">
          {activeNote ? (
            <div className="flex flex-col h-full">
              
              {/* Toolbar */}
              <div className="px-5 py-3 border-b border-slate-150 dark:border-slate-850 flex items-center justify-between bg-slate-50/35 dark:bg-slate-950/5">
                <div className="flex items-center gap-2">
                  
                  {/* Pin button */}
                  <button
                    type="button"
                    onClick={() => handleUpdateNoteField(activeNote.id, 'isPinned', !activeNote.isPinned)}
                    title={activeNote.isPinned ? "Unpin note" : "Pin note to top"}
                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                      activeNote.isPinned
                        ? 'bg-amber-500/10 text-amber-650 border-amber-500/20'
                        : 'bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <Pin className={`w-3.5 h-3.5 ${activeNote.isPinned ? 'fill-amber-500' : ''}`} />
                  </button>

                  {/* Favorite / Star button */}
                  <button
                    type="button"
                    onClick={() => handleUpdateNoteField(activeNote.id, 'isFavorite', !activeNote.isFavorite)}
                    title={activeNote.isFavorite ? "Unstar note" : "Star note"}
                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                      activeNote.isFavorite
                        ? 'bg-red-500/10 text-red-500 border-red-500/20'
                        : 'bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${activeNote.isFavorite ? 'fill-red-400' : ''}`} />
                  </button>

                  {/* Color tagging dots */}
                  <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-750 pl-2.5 ml-0.5">
                    {['#fbbf24', '#f87171', '#60a5fa', '#34d399', '#c084fc'].map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => handleUpdateNoteField(activeNote.id, 'color', col)}
                        className={`w-3.5 h-3.5 rounded-full border cursor-pointer hover:scale-[1.12] transition-transform ${
                          activeNote.color === col 
                            ? 'border-slate-900 dark:border-white ring-2 ring-slate-100 dark:ring-slate-800' 
                            : 'border-transparent'
                        }`}
                        style={{ backgroundColor: col }}
                      />
                    ))}
                  </div>
                </div>

                {/* Right utility elements (Microphone / hands-free mode + Trash) */}
                <div className="flex items-center gap-2">
                  
                  {/* Hands-free Speak Mic button */}
                  {SpeechRecognitionClass && (
                    <button
                      type="button"
                      onClick={toggleListening}
                      title={isListening ? "Stop voice typing" : "Speak to type hands-free"}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-sans text-[10px] font-bold uppercase transition-all duration-300 cursor-pointer ${
                        isListening
                          ? 'bg-red-500 text-white border-transparent animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.4)]'
                          : 'bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-500 hover:text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {isListening ? (
                        <>
                          <Mic className="w-3.5 h-3.5 text-white animate-bounce" />
                          <span>SPEECH ACTIVE</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-3.5 h-3.5" />
                          <span>VOICE WRITE</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => handleDeleteNote(activeNote.id)}
                    title="Delete permanently"
                    className="p-1.5 rounded-lg border border-slate-200 hover:border-red-500 dark:border-slate-700 bg-white hover:bg-red-500/10 text-slate-400 hover:text-red-500 dark:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Editor Workspace */}
              <div className="flex-1 flex flex-col p-6 space-y-4 overflow-y-auto">
                <input
                  type="text"
                  placeholder="Give your note a title..."
                  value={activeNote.title === 'Untitled Note' ? '' : activeNote.title}
                  onChange={(e) => handleUpdateNoteField(activeNote.id, 'title', e.target.value)}
                  className="w-full bg-transparent text-slate-900 dark:text-white text-lg font-extrabold tracking-tight focus:outline-none placeholder-slate-350 dark:placeholder-slate-600 font-sans"
                />

                <div className="flex-1 flex flex-col relative">
                  <textarea
                    placeholder="Start typing your floating universal quick note here..."
                    value={activeNote.content}
                    onChange={(e) => handleUpdateNoteField(activeNote.id, 'content', e.target.value)}
                    className="flex-1 w-full bg-transparent text-slate-800 dark:text-slate-200 text-sm leading-relaxed focus:outline-none placeholder-slate-300 dark:placeholder-slate-700 resize-none font-sans"
                  />
                  
                  {/* Subtle voice typing feedback overlay */}
                  {isListening && (
                    <div className="absolute bottom-2 right-2 px-3 py-1 rounded-lg bg-red-500/10 text-red-500 text-[10px] font-mono font-bold flex items-center gap-1.5 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                      Speak now — transcribing live into active note
                    </div>
                  )}
                </div>
              </div>

              {/* Status Bar */}
              <div className="px-6 py-2 border-t border-slate-100 dark:border-slate-850 bg-slate-50/20 dark:bg-slate-950/5 flex items-center justify-between text-[10px] font-mono text-slate-400 dark:text-slate-500 font-medium">
                <span>Created {new Date(activeNote.createdAt).toLocaleString()}</span>
                <span>Last updated {new Date(activeNote.updatedAt).toLocaleTimeString()}</span>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-3">
              <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-xl">
                📝
              </div>
              <h4 className="text-sm font-bold text-slate-750 dark:text-slate-250">
                Create a Note to begin
              </h4>
              <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs text-center leading-relaxed">
                Add an Apple Notes-style floating universal note to track thoughts, code drafts, or tasks instantly.
              </p>
              <button
                type="button"
                onClick={handleCreateNewNote}
                className="mt-2 text-xs font-bold px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-255 dark:border-slate-755 text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Create note
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
