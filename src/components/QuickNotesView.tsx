import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, Plus, Trash2, Search, Pin, Star, Mic, MicOff, Check, CornerDownRight, ListFilter, Calendar,
  Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, List, ListOrdered, 
  CheckSquare, Palette, Eraser, Type, ChevronDown, Maximize2, Minimize2, ChevronsUp, ChevronsDown
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

  // Rich Text Editor formatting state trackings
  const [activeFontFamily, setActiveFontFamily] = useState('sans-serif');
  const [activeFontSize, setActiveFontSize] = useState('3'); // 3 corresponds to 16px
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  const [showHighlightColorPicker, setShowHighlightColorPicker] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  // Enterprise formatting & AI state helpers
  const [isBoldActive, setIsBoldActive] = useState(false);
  const [isItalicActive, setIsItalicActive] = useState(false);
  const [isUnderlineActive, setIsUnderlineActive] = useState(false);
  const [isStrikeActive, setIsStrikeActive] = useState(false);
  const [isAlignLeftActive, setIsAlignLeftActive] = useState(false);
  const [isAlignCenterActive, setIsAlignCenterActive] = useState(false);
  const [isAlignRightActive, setIsAlignRightActive] = useState(false);
  const [isPolishingNote, setIsPolishingNote] = useState(false);
  const [showAiDropdown, setShowAiDropdown] = useState(false);
  const [showAiTray, setShowAiTray] = useState(false);
  const [voiceErrorMessage, setVoiceErrorMessage] = useState<string | null>(null);
  const [aiCommand, setAiCommand] = useState('');
  const [isExecutingCommand, setIsExecutingCommand] = useState(false);
  const [isToolbarMinimized, setIsToolbarMinimized] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const TEXT_COLORS = [
    { label: 'Charcoal', value: '#1e293b', bgClass: 'bg-slate-800' },
    { label: 'Royal Purple', value: '#7c3aed', bgClass: 'bg-violet-600' },
    { label: 'Sapphire Blue', value: '#2563eb', bgClass: 'bg-blue-600' },
    { label: 'Forest Green', value: '#059669', bgClass: 'bg-emerald-600' },
    { label: 'Vibrant Amber', value: '#d97706', bgClass: 'bg-amber-600' },
    { label: 'Crimson Flame', value: '#dc2626', bgClass: 'bg-red-600' },
    { label: 'Silver Mist', value: '#94a3b8', bgClass: 'bg-slate-400' },
    { label: 'Pure White', value: '#ffffff', bgClass: 'bg-white border' },
  ];

  const HIGHLIGHT_COLORS = [
    { label: 'None', value: 'transparent', bgClass: 'bg-transparent border border-dashed border-slate-350' },
    { label: 'Yellow Accent', value: '#fef08a', bgClass: 'bg-yellow-200' },
    { label: 'Mint Accent', value: '#bbf7d0', bgClass: 'bg-green-200' },
    { label: 'Sky Accent', value: '#bfdbfe', bgClass: 'bg-blue-200' },
    { label: 'Peachy Accent', value: '#fbcfe8', bgClass: 'bg-pink-100' },
    { label: 'Lilac Accent', value: '#e9d5ff', bgClass: 'bg-purple-200' },
  ];

  // Speech Recognition state
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  const SpeechRecognitionClass = typeof window !== 'undefined' 
    ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) 
    : null;

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

  const scrollCursorIntoView = () => {
    if (typeof window === 'undefined' || !editorRef.current) return;
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      try {
        const range = selection.getRangeAt(0).cloneRange();
        range.collapse(true);
        const rect = range.getBoundingClientRect();
        
        // Find the closest scrollable parent with overflow-y-auto style/class
        const scrollContainer = editorRef.current.closest('.overflow-y-auto');
        if (scrollContainer && rect.height > 0) {
          const containerRect = scrollContainer.getBoundingClientRect();
          const cursorBottom = rect.bottom;
          const cursorTop = rect.top;
          
          if (cursorBottom > containerRect.bottom - 50) {
            scrollContainer.scrollTop += (cursorBottom - containerRect.bottom + 80);
          } else if (cursorTop < containerRect.top + 50) {
            scrollContainer.scrollTop -= (containerRect.top - cursorTop + 80);
          }
        }
      } catch (err) {
        // Prevent silent API crashes
      }
    }
  };

  const handleEditorInput = () => {
    if (editorRef.current && selectedNoteId) {
      const htmlValue = editorRef.current.innerHTML;
      
      // Auto-extract content title if title is unassigned or default
      const rawText = editorRef.current.innerText || '';
      const lines = rawText.trim().split('\n');
      const firstLine = lines[0] ? lines[0].substring(0, 40) : '';
      
      const currentNote = quickNotes.find(n => n.id === selectedNoteId);
      const isUntitled = !currentNote || !currentNote.title || currentNote.title.startsWith('Untitled Note') || currentNote.title.trim() === '';
      const updatedTitle = isUntitled ? (firstLine || 'Untitled Note') : currentNote.title;

      const updatedNotes = quickNotes.map(n => {
        if (n.id === selectedNoteId) {
          return {
            ...n,
            title: updatedTitle,
            content: htmlValue,
            updatedAt: new Date().toISOString()
          };
        }
        return n;
      });
      onUpdateDb({ quickNotes: updatedNotes });

      // Maintain continuous cursor visibility as typing progresses
      setTimeout(scrollCursorIntoView, 10);
    }
  };

  const selectedNoteIdRef = useRef(selectedNoteId);
  const dbStateRef = useRef(dbState);

  useEffect(() => {
    selectedNoteIdRef.current = selectedNoteId;
  }, [selectedNoteId]);

  useEffect(() => {
    dbStateRef.current = dbState;
  }, [dbState]);

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
        const results = event.results;
        const lastResultIndex = event.resultIndex;
        const transcript = Array.from(results)
          .slice(lastResultIndex)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');
        
        const activeId = selectedNoteIdRef.current;
        if (transcript && activeId) {
          if (editorRef.current) {
            editorRef.current.focus();
            const textNode = document.createTextNode(' ' + transcript);
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) {
              const range = sel.getRangeAt(0);
              range.insertNode(textNode);
              range.setStartAfter(textNode);
              range.collapse(true);
              sel.removeAllRanges();
              sel.addRange(range);
            } else {
              editorRef.current.appendChild(textNode);
            }
            
            // Re-simulate input save for document update
            const htmlValue = editorRef.current.innerHTML;
            const currentNotes = dbStateRef.current.quickNotes || [];
            const currentNote = currentNotes.find(n => n.id === activeId);
            const rawText = editorRef.current.innerText || '';
            const lines = rawText.trim().split('\n');
            const firstLine = lines[0] ? lines[0].substring(0, 40) : '';
            const isUntitled = !currentNote || !currentNote.title || currentNote.title.startsWith('Untitled Note') || currentNote.title.trim() === '';
            const updatedTitle = isUntitled ? (firstLine || 'Untitled Note') : currentNote.title;

            const updatedNotes = currentNotes.map(n => {
              if (n.id === activeId) {
                return {
                  ...n,
                  title: updatedTitle,
                  content: htmlValue,
                  updatedAt: new Date().toISOString()
                };
              }
              return n;
            });
            onUpdateDb({ quickNotes: updatedNotes });
            
            setTimeout(scrollCursorIntoView, 10);
          }
        }
      };

      setRecognition(rec);
    }
  }, []);

  const toggleListening = () => {
    if (!recognition) {
      setVoiceErrorMessage("Mic speech recognition is restricted or not supported in this frame. Open the app in a new tab to enable standard voice typing!");
      setTimeout(() => setVoiceErrorMessage(null), 7000);
      return;
    }

    if (isListening) {
      recognition.stop();
    } else {
      try {
        setVoiceErrorMessage(null);
        recognition.start();
      } catch (err) {
        console.error("Failed to start speech recognition:", err);
        setVoiceErrorMessage("Could not start microphone session. Verify permission settings.");
        setTimeout(() => setVoiceErrorMessage(null), 4005);
      }
    }
  };

  const execEditorCommand = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    handleEditorInput();
    updateActiveFormatStates();
  };

  const updateActiveFormatStates = () => {
    if (typeof document === 'undefined') return;
    setIsBoldActive(document.queryCommandState('bold'));
    setIsItalicActive(document.queryCommandState('italic'));
    setIsUnderlineActive(document.queryCommandState('underline'));
    setIsStrikeActive(document.queryCommandState('strikeThrough'));
    
    setIsAlignLeftActive(document.queryCommandState('justifyLeft'));
    setIsAlignCenterActive(document.queryCommandState('justifyCenter'));
    setIsAlignRightActive(document.queryCommandState('justifyRight'));

    try {
      const font = document.queryCommandValue('fontName');
      if (font) setActiveFontFamily(font.replace(/['"]/g, ''));
      const size = document.queryCommandValue('fontSize');
      if (size) setActiveFontSize(size);
    } catch (e) {}

    // Automatically align workspace viewport to cursors
    scrollCursorIntoView();
  };

  const insertHtmlAtCursor = (html: string) => {
    const sel = window.getSelection();
    if (sel && sel.getRangeAt && sel.rangeCount) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      
      const el = document.createElement("div");
      el.innerHTML = html;
      const frag = document.createDocumentFragment();
      let node;
      let lastNode;
      while ((node = el.firstChild)) {
        lastNode = frag.appendChild(node);
      }
      range.insertNode(frag);
      if (lastNode) {
        const nextRange = range.cloneRange();
        nextRange.setStartAfter(lastNode);
        nextRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(nextRange);
      }
    } else if (editorRef.current) {
      const el = document.createElement("div");
      el.innerHTML = html;
      editorRef.current.appendChild(el);
    }
  };

  const handleAddChecklistItem = () => {
    // Enterprise upgrade: extract and preserve currently selected highlighted text instead of discarding it!
    let selectedText = '';
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      selectedText = sel.toString().trim();
    }
    const labelText = selectedText || 'Task Item';

    const checklistHtml = `
      <div style="margin-top: 0.35rem; margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.5rem;" contenteditable="true">
        <input type="checkbox" style="width: 1.15rem; height: 1.15rem; border-radius: 4px; border: 1.5px solid #d1d5db; accent-color: #fbbf24; cursor: pointer; margin: 0; flex-shrink: 0;" />
        <span style="flex: 1; outline: none; margin-left: 0.25rem;">${labelText}</span>
      </div>
    `;
    insertHtmlAtCursor(checklistHtml);
    handleEditorInput();
    updateActiveFormatStates();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    // Strip copy-paste formatting (like bad background highlights, alignments, and columns)
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    handleEditorInput();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Backspace') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        let node = range.startContainer;
        
        let checklistRow: HTMLElement | null = null;
        while (node && node !== editorRef.current) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            if (el.tagName === 'DIV' && el.style.display === 'flex' && el.querySelector('input[type="checkbox"]')) {
              checklistRow = el;
              break;
            }
          }
          node = node.parentNode as Node;
        }

        if (checklistRow) {
          const textSpan = checklistRow.querySelector('span');
          // If the user's cursor hits Backspace at the prefix of a checklist task, revert it to standard plain text line immediately
          if (range.startOffset === 0 && range.collapsed) {
            e.preventDefault();
            const normalDiv = document.createElement('div');
            normalDiv.innerHTML = textSpan ? textSpan.innerHTML : '<br>';
            if (normalDiv.innerHTML === '') normalDiv.innerHTML = '<br>';
            
            checklistRow.parentNode?.replaceChild(normalDiv, checklistRow);
            
            const newRange = document.createRange();
            newRange.setStart(normalDiv, 0);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
            
            handleEditorInput();
            updateActiveFormatStates();
          }
        }
      }
    }

    if (e.key === 'Enter') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        let node = range.startContainer;
        
        let checklistRow: HTMLElement | null = null;
        while (node && node !== editorRef.current) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            if (el.tagName === 'DIV' && el.style.display === 'flex' && el.querySelector('input[type="checkbox"]')) {
              checklistRow = el;
              break;
            }
          }
          node = node.parentNode as Node;
        }

        if (checklistRow) {
          e.preventDefault(); // stop default horiz-span breakout splits inside flex elements
          const textSpan = checklistRow.querySelector('span');
          const currentText = textSpan ? textSpan.innerText.trim() : '';

          // If the task item layout is empty, convert back to a standard line
          if (currentText === '' || currentText === 'Task Item' || currentText === '📝 Task Item') {
            const normalDiv = document.createElement('div');
            normalDiv.innerHTML = '<br>';
            checklistRow.parentNode?.replaceChild(normalDiv, checklistRow);
            
            const newRange = document.createRange();
            newRange.setStart(normalDiv, 0);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
            
            handleEditorInput();
            updateActiveFormatStates();
            return;
          }

          // Otherwise, construct a consecutive checklist task item right after
          const nextRow = document.createElement('div');
          nextRow.style.marginTop = '0.35rem';
          nextRow.style.marginBottom = '0.35rem';
          nextRow.style.display = 'flex';
          nextRow.style.alignItems = 'center';
          nextRow.style.gap = '0.5rem';
          nextRow.setAttribute('contenteditable', 'true');
          
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.style.width = '1.15rem';
          checkbox.style.height = '1.15rem';
          checkbox.style.borderRadius = '4px';
          checkbox.style.border = '1.5px solid #d1d5db';
          checkbox.style.accentColor = '#fbbf24';
          checkbox.style.cursor = 'pointer';
          checkbox.style.margin = '0';
          checkbox.style.flexShrink = '0';
          
          const span = document.createElement('span');
          span.style.flex = '1';
          span.style.outline = 'none';
          span.style.marginLeft = '0.25rem';
          span.innerHTML = '<br>';
          
          nextRow.appendChild(checkbox);
          nextRow.appendChild(span);
          
          checklistRow.parentNode?.insertBefore(nextRow, checklistRow.nextSibling);
          
          const newRange = document.createRange();
          newRange.setStart(span, 0);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
          
          handleEditorInput();
          updateActiveFormatStates();
          return;
        }
      }
    }
  };

  const aiPolishNote = async (mode: 'polish' | 'summarize' | 'checklist') => {
    if (!activeNote || isPolishingNote) return;
    setIsPolishingNote(true);
    setShowAiDropdown(false);
    
    try {
      const response = await fetch('/api/gemini/polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: activeNote.content || '',
          mode
        })
      });

      const data = await response.json();
      if (data.success && data.result) {
        if (editorRef.current) {
          editorRef.current.innerHTML = data.result;
        }
        handleUpdateNoteField(activeNote.id, 'content', data.result);
      } else {
        alert(data.error || "Failed to utilize AI document polishing.");
      }
    } catch (e: any) {
      console.error(e);
      alert("Error reaching AI note helper: " + e.message);
    } finally {
      setIsPolishingNote(false);
    }
  };

  const handleRunAiCommand = async (commandToRun?: string) => {
    const finalCommand = commandToRun || aiCommand;
    if (!activeNote || !finalCommand.trim() || isExecutingCommand) return;
    setIsExecutingCommand(true);
    
    try {
      const response = await fetch('/api/gemini/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: activeNote.content || '',
          command: finalCommand.trim()
        })
      });

      const data = await response.json();
      if (data.success && data.result) {
        if (editorRef.current) {
          editorRef.current.innerHTML = data.result;
        }
        handleUpdateNoteField(activeNote.id, 'content', data.result);
        if (!commandToRun) {
          setAiCommand(''); // Clear custom text field once succeeded
        }
      } else {
        alert(data.error || "Failed to execute AI command.");
      }
    } catch (e: any) {
      console.error(e);
      alert("Error reaching AI command helper: " + e.message);
    } finally {
      setIsExecutingCommand(false);
    }
  };

  const handleFontChange = (font: string) => {
    setActiveFontFamily(font);
    execEditorCommand('fontName', font);
  };

  const handleFontSizeChange = (size: string) => {
    setActiveFontSize(size);
    execEditorCommand('fontSize', size);
  };

  const handleIncreaseFontSize = () => {
    const currentVal = parseInt(activeFontSize);
    if (currentVal < 7) {
      const nextVal = (currentVal + 1).toString();
      handleFontSizeChange(nextVal);
    }
  };

  const handleDecreaseFontSize = () => {
    const currentVal = parseInt(activeFontSize);
    if (currentVal > 1) {
      const nextVal = (currentVal - 1).toString();
      handleFontSizeChange(nextVal);
    }
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

  // Sync selected note ID changes to contenteditor once
  useEffect(() => {
    if (editorRef.current && activeNote) {
      if (editorRef.current.innerHTML !== activeNote.content) {
        editorRef.current.innerHTML = activeNote.content || '';
      }
    }
  }, [selectedNoteId]);

  // Sync state cleanly when not focused (for cloud synchronization)
  useEffect(() => {
    if (editorRef.current && activeNote) {
      if (editorRef.current.innerHTML !== activeNote.content) {
        if (document.activeElement !== editorRef.current) {
          editorRef.current.innerHTML = activeNote.content || '';
        }
      }
    }
  }, [activeNote]);

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
                
                // Get a preview snippet of the content (strip HTML tags first)
                const plainText = note.content
                  .replace(/<[^>]*>/g, ' ')
                  .replace(/&nbsp;/g, ' ')
                  .replace(/\s+/g, ' ')
                  .trim();
                const snippet = plainText || 'No additional text';

                return (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => {
                      if (isListening) recognition.stop();
                      setSelectedNoteId(note.id);
                    }}
                    className={`w-full p-4 text-left transition-all relative flex flex-col gap-2 cursor-pointer border-l-4 ${
                      isActive
                        ? 'bg-slate-55 dark:bg-slate-800/40 shadow-sm'
                        : 'hover:bg-slate-50/50 dark:hover:bg-slate-850/20'
                    }`}
                    style={{ 
                      borderLeftColor: note.color || '#fbbf24',
                      background: isActive && note.color ? `${note.color}10` : undefined
                    }}
                  >
                    {/* Header and tools */}
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-xs font-black truncate tracking-tight ${
                        isActive ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'
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
                    <p className="text-[11px] text-slate-455 dark:text-slate-500 line-clamp-1 leading-relaxed">
                      {snippet}
                    </p>

                    {/* Date and tags block */}
                    <div className="flex items-center justify-between mt-1 text-[9.5px] font-mono text-slate-400 dark:text-slate-500 font-bold">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 opacity-60" />
                        {formattedDate}
                      </span>
                      {note.color && (
                        <span className="flex items-center gap-1">
                          <span 
                            className="w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 shadow-sm" 
                            style={{ backgroundColor: note.color }}
                          />
                          <span className="text-[8px] uppercase tracking-wider opacity-80" style={{ color: note.color }}>
                            {note.color === '#fbbf24' ? 'Amber' : 
                             note.color === '#f87171' ? 'Red' :
                             note.color === '#60a5fa' ? 'Blue' :
                             note.color === '#34d399' ? 'Green' :
                             note.color === '#c084fc' ? 'Violet' : 'Custom'}
                          </span>
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right pane: Dedicated Rich Text Editor (lg:col-span-8 or absolute overlay inside viewport) */}
        <div className={`flex flex-col h-full bg-white dark:bg-slate-900 ${
          isFullScreen 
            ? 'fixed inset-0 z-[100] w-screen h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 overflow-hidden animate-in fade-in-50 duration-200' 
            : 'lg:col-span-8'
        }`}>
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
                <div className="flex items-center gap-2 relative">
                  
                  {/* Inline Voice Error Tooltip Banner */}
                  {voiceErrorMessage && (
                    <div className="absolute right-0 bottom-full mb-2 z-50 w-72 p-2.5 bg-red-500 text-white rounded-xl text-[11px] font-sans leading-normal shadow-lg animate-in fade-in duration-200">
                      <div className="font-extrabold flex items-center gap-1">
                        <span>⚠️ Voice Typing Restriction</span>
                      </div>
                      <p className="mt-0.5 opacity-90">{voiceErrorMessage}</p>
                    </div>
                  )}

                  {/* AI Assistant Command Center Drawer Toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowAiTray(!showAiTray);
                    }}
                    title={showAiTray ? "Hide AI Assistant Input Bar" : "Speak to AI Assistant / Modify Notepad"}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-sans text-[10px] font-black uppercase transition-all duration-300 cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
                      showAiTray
                        ? 'bg-amber-500 text-white border-transparent shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                        : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/20 dark:border-amber-500/30'
                    }`}
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${showAiTray ? 'animate-spin' : 'animate-pulse text-amber-500'}`} />
                    <span>AI Assistant</span>
                  </button>

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

                  {/* Full Screen Toggle button */}
                  <button
                    type="button"
                    onClick={() => setIsFullScreen(!isFullScreen)}
                    title={isFullScreen ? "Exit full screen (reclaims standard split frame)" : "Distraction-free Full Screen Mode"}
                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                      isFullScreen 
                        ? 'bg-amber-500/10 text-amber-650 border-amber-500/20 hover:scale-[1.02]' 
                        : 'border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:text-slate-400'
                    }`}
                  >
                    {isFullScreen ? (
                      <Minimize2 className="w-3.5 h-3.5" />
                    ) : (
                      <Maximize2 className="w-3.5 h-3.5" />
                    )}
                  </button>

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
              <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900">
                {/* Clean, spacious editing workspace with integrated title and study connection inside pad mockup */}

                {/* Google Docs Style Rich Formatting Toolbar */}
                <div className="flex items-center justify-between gap-1.5 p-2 bg-slate-50 dark:bg-slate-950/40 border-y border-slate-150 dark:border-slate-850 select-none">
                  {!isToolbarMinimized ? (
                    <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
                  
                  {/* Font Selection Dropdown */}
                  <div className="relative flex items-center">
                    <select
                      value={activeFontFamily}
                      onChange={(e) => handleFontChange(e.target.value)}
                      onMouseDown={(e) => e.preventDefault()}
                      className="text-[11px] font-mono font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 px-2 py-1 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer uppercase tracking-wider h-8"
                    >
                      <option value="Inter, sans-serif">📂 Modern Sans</option>
                      <option value="'Playfair Display', Georgia, serif">📚 Elegant Serif</option>
                      <option value="'JetBrains Mono', monospace">💻 Tech Mono</option>
                      <option value="'Comic Sans MS', cursive">🎨 Playful Script</option>
                      <option value="Impact, sans-serif">🔥 Sharp Bold</option>
                    </select>
                  </div>

                  {/* Divider */}
                  <div className="w-[1px] h-5 bg-slate-200 dark:bg-slate-800 mx-0.5" />

                  {/* Font Size Preset Dropdown */}
                  <div className="relative flex items-center">
                    <select
                      value={activeFontSize}
                      onChange={(e) => handleFontSizeChange(e.target.value)}
                      onMouseDown={(e) => e.preventDefault()}
                      className="text-[11px] font-mono font-bold bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 px-2 py-1 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer tracking-wider h-8"
                    >
                      <option value="1">10px Mini</option>
                      <option value="2">13px Small</option>
                      <option value="3">16px Normal</option>
                      <option value="4">18px Large</option>
                      <option value="5">24px Medium Title</option>
                      <option value="6">32px Large Title</option>
                      <option value="7">48px Display</option>
                    </select>
                  </div>

                  {/* Font Size Steppers */}
                  <div className="flex items-center rounded-lg border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-900 h-8">
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleDecreaseFontSize();
                      }}
                      title="Decrease font size"
                      className="px-2 py-1 h-full hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono font-bold text-xs border-r border-slate-200 dark:border-slate-800 cursor-pointer"
                    >
                      A-
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleIncreaseFontSize();
                      }}
                      title="Increase font size"
                      className="px-2 py-1 h-full hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono font-bold text-xs cursor-pointer"
                    >
                      A+
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="w-[1px] h-5 bg-slate-200 dark:bg-slate-800 mx-0.5" />

                  {/* Bold, Italic, Underline, Strikethrough buttons */}
                  <div className="flex items-center gap-0.5 rounded-lg border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-900 p-0.5 h-8">
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        execEditorCommand('bold');
                      }}
                      title="Bold text"
                      className={`p-1 rounded text-slate-700 dark:text-slate-300 font-extrabold cursor-pointer h-full flex items-center ${
                        isBoldActive ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 font-black' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        execEditorCommand('italic');
                      }}
                      title="Italic text"
                      className={`p-1 rounded text-slate-700 dark:text-slate-300 italic cursor-pointer h-full flex items-center ${
                        isItalicActive ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        execEditorCommand('underline');
                      }}
                      title="Underline text"
                      className={`p-1 rounded text-slate-700 dark:text-slate-300 underline cursor-pointer h-full flex items-center ${
                        isUnderlineActive ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Underline className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        execEditorCommand('strikeThrough');
                      }}
                      title="Strikethrough text"
                      className={`p-1 rounded text-slate-700 dark:text-slate-300 line-through cursor-pointer h-full flex items-center ${
                        isStrikeActive ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Strikethrough className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="w-[1px] h-5 bg-slate-200 dark:bg-slate-800 mx-0.5" />

                  {/* Alignments */}
                  <div className="flex items-center gap-0.5 rounded-lg border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-900 p-0.5 h-8">
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        execEditorCommand('justifyLeft');
                      }}
                      title="Align left"
                      className={`p-1 rounded text-slate-700 dark:text-slate-300 cursor-pointer h-full flex items-center ${
                        isAlignLeftActive ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <AlignLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        execEditorCommand('justifyCenter');
                      }}
                      title="Align center"
                      className={`p-1 rounded text-slate-700 dark:text-slate-300 cursor-pointer h-full flex items-center ${
                        isAlignCenterActive ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <AlignCenter className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        execEditorCommand('justifyRight');
                      }}
                      title="Align right"
                      className={`p-1 rounded text-slate-700 dark:text-slate-300 cursor-pointer h-full flex items-center ${
                        isAlignRightActive ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <AlignRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="w-[1px] h-5 bg-slate-200 dark:bg-slate-800 mx-0.5" />

                  {/* Text Color Picker & Highlight Color Picker Buttons with Nice Popups */}
                  <div className="flex items-center gap-1.5">
                    
                    {/* Text Color Dropdown */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setShowTextColorPicker(!showTextColorPicker);
                          setShowHighlightColorPicker(false);
                        }}
                        title="Change text color"
                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-205 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900 text-[10.5px] font-mono font-bold text-slate-750 dark:text-slate-300 cursor-pointer select-none h-8"
                      >
                        <Palette className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span>Color</span>
                        <ChevronDown className="w-3 h-3 opacity-60" />
                      </button>

                      {showTextColorPicker && (
                        <div className="absolute left-0 mt-1 p-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 grid grid-cols-4 gap-1.5 w-48">
                          <div className="col-span-4 text-[9px] font-mono font-extrabold uppercase text-slate-400 border-b border-slate-100 pb-1 mb-1">
                            Choose Color
                          </div>
                          {TEXT_COLORS.map((color) => (
                            <button
                              key={color.value}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                execEditorCommand('foreColor', color.value);
                                setShowTextColorPicker(false);
                              }}
                              title={color.label}
                              className={`w-8 h-8 rounded-lg cursor-pointer hover:scale-110 transition-transform ${color.bgClass}`}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Highlight Color Dropdown */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setShowHighlightColorPicker(!showHighlightColorPicker);
                          setShowTextColorPicker(false);
                        }}
                        title="Highlight selected text"
                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-205 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900 text-[10.5px] font-mono font-bold text-slate-755 dark:text-slate-300 cursor-pointer select-none h-8"
                      >
                        <Type className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                        <span>Highlight</span>
                        <ChevronDown className="w-3 h-3 opacity-60" />
                      </button>

                      {showHighlightColorPicker && (
                        <div className="absolute left-0 mt-1 p-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 grid grid-cols-3 gap-1.5 w-44">
                          <div className="col-span-3 text-[9px] font-mono font-extrabold uppercase text-slate-400 border-b border-slate-100 pb-1 mb-1">
                            Choose Highlight
                          </div>
                          {HIGHLIGHT_COLORS.map((color) => (
                            <button
                              key={color.value}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                execEditorCommand('hiliteColor', color.value);
                                execEditorCommand('backColor', color.value);
                                setShowHighlightColorPicker(false);
                              }}
                              title={color.label}
                              className={`h-8 rounded-lg cursor-pointer hover:scale-105 transition-transform text-[9px] font-mono font-bold leading-none ${color.bgClass}`}
                            >
                              {color.value === 'transparent' ? 'None' : ''}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Divider */}
                  <div className="w-[1px] h-5 bg-slate-200 dark:bg-slate-800 mx-0.5" />

                  {/* Lists & Checkboxes */}
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 p-0.5 rounded-lg h-8">
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        execEditorCommand('insertUnorderedList');
                      }}
                      title="Bullet List"
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-700 dark:text-slate-300 cursor-pointer h-full flex items-center"
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        execEditorCommand('insertOrderedList');
                      }}
                      title="Numbered List"
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-700 dark:text-slate-300 cursor-pointer h-full flex items-center"
                    >
                      <ListOrdered className="w-3.5 h-3.5" />
                    </button>
                    
                    {/* Unique Checklist Row Task generator */}
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleAddChecklistItem();
                      }}
                      title="Add Interactive Checkbox To-Do Row"
                      className="p-1 px-1.5 hover:bg-amber-500/10 text-amber-650 dark:text-amber-400 rounded text-[10px] font-mono font-black flex items-center gap-1 cursor-pointer h-full"
                    >
                      <CheckSquare className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>+ Checklist</span>
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="w-[1px] h-5 bg-slate-200 dark:bg-slate-800 mx-0.5" />

                  {/* AI Smart Polish Dropdown */}
                  <div className="relative font-sans">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAiDropdown(!showAiDropdown);
                        setShowTextColorPicker(false);
                        setShowHighlightColorPicker(false);
                      }}
                      disabled={isPolishingNote}
                      title="AI Co-Author options"
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10.5px] font-mono font-black uppercase transition-all select-none h-8 cursor-pointer ${
                        isPolishingNote
                          ? 'bg-amber-500/20 text-amber-500 border-amber-500/30 animate-pulse'
                          : 'border-slate-205 bg-amber-500/5 hover:bg-amber-500/10 text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>{isPolishingNote ? 'Polishing...' : 'AI Co-Author'}</span>
                      <ChevronDown className="w-3 h-3 opacity-60" />
                    </button>

                    {showAiDropdown && (
                      <div className="absolute right-0 sm:left-0 mt-1 p-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 flex flex-col w-56 text-left animate-in slide-in-from-top-1 font-sans">
                        <div className="p-2 text-[9px] font-mono font-extrabold uppercase text-slate-400 border-b border-slate-100 dark:border-slate-850 mb-1">
                          Enterprise AI Assistant
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            aiPolishNote('polish');
                          }}
                          className="w-full text-left p-2 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg text-xs flex items-center gap-2 text-slate-705 dark:text-slate-300 cursor-pointer font-sans"
                        >
                          <span className="text-sm">✨</span>
                          <div>
                            <div className="font-extrabold text-[11px]">Smart Polish & Format</div>
                            <div className="text-[10px] text-slate-400 font-normal">Heal spelling, headers & code blocks</div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            aiPolishNote('summarize');
                          }}
                          className="w-full text-left p-2 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg text-xs flex items-center gap-2 text-slate-705 dark:text-slate-300 cursor-pointer font-sans"
                        >
                          <span className="text-sm">📜</span>
                          <div>
                            <div className="font-extrabold text-[11px]">Executive Summary Digest</div>
                            <div className="text-[10px] text-slate-400 font-normal">Synthesize takeaways & summary</div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            aiPolishNote('checklist');
                          }}
                          className="w-full text-left p-2 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg text-xs flex items-center gap-2 text-slate-705 dark:text-slate-300 cursor-pointer font-sans"
                        >
                          <span className="text-sm">📋</span>
                          <div>
                            <div className="font-extrabold text-[11px]">Autogen Practice Checklist</div>
                            <div className="text-[10px] text-slate-400 font-normal">Extract tasks to checkbox rows</div>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="w-[1px] h-5 bg-slate-200 dark:bg-slate-800 mx-0.5" />

                  {/* Eraser */}
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      execEditorCommand('removeFormat');
                    }}
                    title="Clear Formatting"
                    className="ml-auto p-1.5 rounded-lg border border-slate-200 dark:border-slate-850 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 hover:text-rose-500 cursor-pointer h-8 flex items-center justify-center animate-none"
                  >
                    <Eraser className="w-3.5 h-3.5" />
                  </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-[10.5px] font-sans font-extrabold uppercase font-mono select-none pl-1 py-1">
                      <Palette className="w-3.5 h-3.5 text-amber-500 animate-pulse shrink-0 animate-bounce" />
                      <span>Note styling toolbar is collapsed</span>
                    </div>
                  )}

                  {/* Shrink / Expand toggle button always visible */}
                  <button
                    type="button"
                    onClick={() => setIsToolbarMinimized(!isToolbarMinimized)}
                    title={isToolbarMinimized ? "Expand formatting toolbar options" : "Collapse formatting toolbar options"}
                    className="ml-auto p-1 px-2.5 rounded-lg border border-slate-250 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 text-slate-505 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 transition-colors cursor-pointer text-[10px] font-mono font-bold flex items-center gap-1.5 shrink-0 h-8 uppercase tracking-wider"
                  >
                    {isToolbarMinimized ? (
                      <>
                        <span>EXPAND</span>
                        <ChevronsDown className="w-3.5 h-3.5" />
                      </>
                    ) : (
                      <>
                        <span>COLLAPSE</span>
                        <ChevronsUp className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>

                {/* AI Command Bar Drawer Slide */}
                {showAiTray && (
                  <div className="px-6 py-3 bg-[linear-gradient(135deg,rgba(245,158,11,0.05),rgba(251,191,36,0.02))] border-b border-slate-200 dark:border-slate-850 flex flex-col md:flex-row gap-2.5 items-stretch md:items-center animate-in slide-in-from-top duration-300">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse shrink-0" />
                      </div>
                      <input
                        type="text"
                        value={aiCommand}
                        onChange={(e) => setAiCommand(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleRunAiCommand();
                          }
                        }}
                        disabled={isExecutingCommand || isPolishingNote}
                        placeholder="Ask AI to modify, edit or format (e.g. 'Arrange them in a checklist' or 'Summarize')..."
                        className="w-full pl-9 pr-3 py-2 text-xs font-sans bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-805 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all select-text cursor-text shadow-sm"
                      />
                    </div>
                    
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleRunAiCommand()}
                        disabled={isExecutingCommand || isPolishingNote || !aiCommand.trim()}
                        className={`px-3.5 py-2 rounded-xl text-[10px] font-mono font-black uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md hover:scale-[1.02] active:scale-[0.98] ${
                          isExecutingCommand
                            ? 'bg-amber-500/20 text-amber-500 cursor-not-allowed animate-pulse'
                            : aiCommand.trim()
                              ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/10'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {isExecutingCommand ? (
                          <>
                            <div className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin shrink-0" />
                            <span>Executing...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3 w-3 text-amber-500" />
                            <span>Run Command</span>
                          </>
                        )}
                      </button>
                      
                      {/* Quick helper tag chips */}
                      <div className="flex items-center gap-1 sm:ml-1">
                        <button
                          type="button"
                          onClick={() => handleRunAiCommand("Arrange them in a checklist")}
                          disabled={isExecutingCommand || isPolishingNote}
                          className="px-2.5 py-2 bg-white hover:bg-amber-500/15 dark:bg-slate-900 text-slate-600 dark:text-slate-300 rounded-xl text-[10.5px] font-sans font-bold cursor-pointer flex items-center border border-slate-200 dark:border-slate-805 hover:border-amber-300/30 shrink-0 shadow-sm transition-all hover:scale-[1.02]"
                          title="Arrange current notes list as a sequence of interactive checkboxes"
                        >
                          📋 Checklist
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRunAiCommand("Bulletize contents with bold headings")}
                          disabled={isExecutingCommand || isPolishingNote}
                          className="hidden sm:flex px-2.5 py-2 bg-white hover:bg-amber-500/15 dark:bg-slate-900 text-slate-600 dark:text-slate-300 rounded-xl text-[10.5px] font-sans font-bold cursor-pointer items-center border border-slate-200 dark:border-slate-805 hover:border-amber-300/30 shrink-0 shadow-sm transition-all hover:scale-[1.02]"
                          title="Convert into bullet points"
                        >
                          ⚫ Bullets
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                             {/* Main Text Editor Workspace (With native contentEditable and active placeholders) */}
                <div className="flex-1 p-6 overflow-hidden min-h-0 relative outline-none bg-slate-50 dark:bg-slate-950 flex justify-center h-full">
                  
                  {/* Styled physical paper sheet document mockup */}
                  <div className={`w-full bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 shadow-xl rounded-2xl p-6 sm:p-8 relative overflow-y-auto flex flex-col text-slate-800 dark:text-slate-200 animate-in fade-in-50 duration-500 custom-scrollbar flex-1 h-full max-w-4xl`}>
                    
                    {/* Integrated Header Row inside physical mockup: Combines Title Input & Connected Material Badge */}
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4 mb-5 shrink-0 select-none">
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          placeholder="Give your note a title..."
                          value={activeNote.title === 'Untitled Note' ? '' : activeNote.title}
                          onChange={(e) => handleUpdateNoteField(activeNote.id, 'title', e.target.value)}
                          className="w-full bg-transparent text-slate-900 dark:text-white text-xl sm:text-2xl font-black tracking-tight focus:outline-none placeholder-slate-300 dark:placeholder-slate-750 font-display"
                        />
                        <div className="text-[10px] text-amber-500/85 font-mono font-bold mt-1 uppercase flex items-center gap-1">
                          <span>🗒️ QUICK NOTE</span>
                          {activeNote.linkedResourceId && (
                            <span className="flex items-center gap-1 text-slate-400 font-sans font-normal normal-case ml-1">
                              • Connected with {activeNote.linkedResourceType}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Connection Selector Badge (Allows inline link/unlink directly within document paper) */}
                      <div className="shrink-0 flex items-center gap-2 self-start md:self-center">
                        {activeNote.linkedResourceId ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-400 rounded-xl text-[11px] font-black tracking-tight">
                            <span className="uppercase font-mono text-[9px] bg-amber-500/15 px-1.5 py-0.5 rounded font-black text-amber-600 dark:text-amber-400">
                              {activeNote.linkedResourceType}
                            </span>
                            <span className="truncate max-w-[150px]" title={activeNote.linkedResourceTitle}>
                              {activeNote.linkedResourceTitle}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateNoteField(activeNote.id, 'linkedResourceId', undefined);
                                handleUpdateNoteField(activeNote.id, 'linkedResourceType', undefined);
                                handleUpdateNoteField(activeNote.id, 'linkedResourceTitle', undefined);
                              }}
                              className="hover:bg-amber-550/25 p-0.5 rounded text-amber-900 dark:text-amber-300 font-bold ml-1 cursor-pointer transition-colors"
                              title="Unlink resource connection"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="relative">
                            <select
                              value=""
                              onChange={(e) => {
                                if (!e.target.value) return;
                                const [type, id, title] = e.target.value.split('|');
                                handleUpdateNoteField(activeNote.id, 'linkedResourceId', id);
                                handleUpdateNoteField(activeNote.id, 'linkedResourceType', type as any);
                                handleUpdateNoteField(activeNote.id, 'linkedResourceTitle', title);
                                e.target.value = '';
                              }}
                              className="text-[10px] font-mono font-extrabold uppercase bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer transition-all hover:bg-slate-100 dark:hover:bg-slate-900 pr-5"
                            >
                              <option value="">🔗 Connect Material...</option>
                              {dbState.pdfs && dbState.pdfs.length > 0 && (
                                <optgroup label="PDFs & Documents" className="bg-white dark:bg-slate-900">
                                  {dbState.pdfs.map(p => (
                                    <option key={p.id} value={`pdf|${p.id}|${p.title}`}>📄 {p.title}</option>
                                  ))}
                                </optgroup>
                              )}
                              {dbState.assignments && dbState.assignments.length > 0 && (
                                <optgroup label="Assignments" className="bg-white dark:bg-slate-900">
                                  {dbState.assignments.map(a => (
                                    <option key={a.id} value={`assignment|${a.id}|${a.title}`}>📂 {a.title}</option>
                                  ))}
                                </optgroup>
                              )}
                              {dbState.books && dbState.books.length > 0 && (
                                <optgroup label="Books" className="bg-white dark:bg-slate-900">
                                  {dbState.books.map(b => (
                                    <option key={b.id} value={`book|${b.id}|${b.title}`}>📚 {b.title}</option>
                                  ))}
                                </optgroup>
                              )}
                              {dbState.videos && dbState.videos.length > 0 && (
                                <optgroup label="Videos" className="bg-white dark:bg-slate-900">
                                  {dbState.videos.map(v => (
                                    <option key={v.id} value={`video|${v.id}|${v.title}`}>📺 {v.title}</option>
                                  ))}
                                </optgroup>
                              )}
                              {dbState.subtopics && dbState.subtopics.length > 0 && (
                                <optgroup label="Subtopics" className="bg-white dark:bg-slate-900">
                                  {dbState.subtopics.map(s => (
                                    <option key={s.id} value={`subtopic|${s.id}|${s.name}`}>🔖 {s.name}</option>
                                  ))}
                                </optgroup>
                              )}
                              {dbState.notes && dbState.notes.length > 0 && (
                                <optgroup label="Core Notes" className="bg-white dark:bg-slate-900">
                                  {dbState.notes.map(n => (
                                    <option key={n.id} value={`note|${n.id}|${n.title}`}>📝 {n.title}</option>
                                  ))}
                                </optgroup>
                              )}
                              {quickNotes && quickNotes.length > 1 && (
                                <optgroup label="🗒️ Quick Notes" className="bg-white dark:bg-slate-900">
                                  {quickNotes.filter(qnOption => qnOption.id !== activeNote.id).map(qnOption => (
                                    <option key={qnOption.id} value={`quicknote|${qnOption.id}|${qnOption.title}`}>🗒️ {qnOption.title || 'Untitled note'}</option>
                                  ))}
                                </optgroup>
                              )}
                              {dbState.concepts && dbState.concepts.length > 0 && (
                                <optgroup label="💡 Core Academic Concepts" className="bg-white dark:bg-slate-900">
                                  {dbState.concepts.map(conceptOption => (
                                    <option key={conceptOption.id} value={`concept|${conceptOption.id}|${conceptOption.title}`}>💡 {conceptOption.title}</option>
                                  ))}
                                </optgroup>
                              )}
                              {dbState.coding && dbState.coding.length > 0 && (
                                <optgroup label="💻 Coding Lab Problems" className="bg-white dark:bg-slate-900">
                                  {dbState.coding.map(codingOption => (
                                    <option key={codingOption.id} value={`coding|${codingOption.id}|${codingOption.title}`}>💻 {codingOption.title}</option>
                                  ))}
                                </optgroup>
                              )}
                              {dbState.interviews && dbState.interviews.length > 0 && (
                                <optgroup label="🗣️ Interview Simulator Questions" className="bg-white dark:bg-slate-900">
                                  {dbState.interviews.map(intOption => (
                                    <option key={intOption.id} value={`interview|${intOption.id}|${intOption.question}`}>🗣️ {intOption.question.length > 30 ? intOption.question.substring(0, 30) + '...' : intOption.question}</option>
                                  ))}
                                </optgroup>
                              )}
                              {dbState.quizzes && dbState.quizzes.length > 0 && (
                                <optgroup label="🧠 Interactive Quiz Cards" className="bg-white dark:bg-slate-900">
                                  {dbState.quizzes.map(quizOption => (
                                    <option key={quizOption.id} value={`quiz|${quizOption.id}|${quizOption.question}`}>🧠 {quizOption.question.length > 30 ? quizOption.question.substring(0, 30) + '...' : quizOption.question}</option>
                                  ))}
                                </optgroup>
                              )}
                              {dbState.todos && dbState.todos.length > 0 && (
                                <optgroup label="🎯 Curriculum Work Items" className="bg-white dark:bg-slate-900">
                                  {dbState.todos.map(todoOption => (
                                    <option key={todoOption.id} value={`todo|${todoOption.id}|${todoOption.title}`}>🎯 {todoOption.title}</option>
                                  ))}
                                </optgroup>
                              )}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {(!activeNote.content || activeNote.content === '<br>' || activeNote.content === '<div><br></div>' || activeNote.content === '') && (
                      <div className="absolute left-[24px] sm:left-[32px] top-[140px] right-[24px] sm:right-[32px] text-slate-400 dark:text-slate-600 text-xs sm:text-sm pointer-events-none select-none font-sans leading-relaxed">
                        Start typing your floating study note here... Feel free to change text alignments, select custom fonts, size and highlighters, or structure interactive checklists for tracking curriculum assignments!
                      </div>
                    )}

                    <div
                      ref={editorRef}
                      contentEditable
                      onInput={handleEditorInput}
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'checkbox') {
                          const checkbox = target as HTMLInputElement;
                          const textSpan = checkbox.nextElementSibling as HTMLElement;
                          // Mirror state changes inside the editable HTML
                          if (checkbox.checked) {
                            checkbox.setAttribute('checked', 'checked');
                            if (textSpan) {
                              textSpan.style.textDecoration = 'line-through';
                              textSpan.style.opacity = '0.5';
                            }
                          } else {
                            checkbox.removeAttribute('checked');
                            if (textSpan) {
                              textSpan.style.textDecoration = 'none';
                              textSpan.style.opacity = '1';
                            }
                          }
                          handleEditorInput();
                        }
                        updateActiveFormatStates();
                      }}
                      onKeyDown={handleKeyDown}
                      onPaste={handlePaste}
                      onKeyUp={updateActiveFormatStates}
                      onSelect={updateActiveFormatStates}
                      onMouseUp={updateActiveFormatStates}
                      className="w-full bg-transparent text-slate-800 dark:text-slate-200 text-[14px] sm:text-[15px] leading-relaxed focus:outline-none min-h-[350px] outline-none select-text editor-area font-sans"
                      style={{ minHeight: '350px', outline: 'none' }}
                    />
                  </div>

                  {/* Subtle voice typing feedback overlay */}
                  {isListening && (
                    <div className="absolute bottom-6 right-6 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-mono font-bold flex items-center gap-1.5 animate-pulse shadow-md bg-white dark:bg-slate-900">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                      Speech Active — transcribing at cursor point
                    </div>
                  )}
                </div>

              </div>

              {/* Status Bar */}
              <div className="px-6 py-2 border-t border-slate-100 dark:border-slate-850 bg-slate-50/20 dark:bg-slate-950/5 flex items-center justify-between text-[10px] font-mono text-slate-400 dark:text-slate-500 font-medium font-bold flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span>Created {new Date(activeNote.createdAt).toLocaleString()}</span>
                  <span className="opacity-40">|</span>
                  <span>Last updated {new Date(activeNote.updatedAt).toLocaleTimeString()}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span>📊 {
                    (() => {
                      const txt = (activeNote.content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
                      return txt ? txt.split(' ').length : 0;
                    })()
                  } words</span>
                  <span className="opacity-40">•</span>
                  <span>{((activeNote.content || '').replace(/<[^>]*>/g, '').length)} chars</span>
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 font-extrabold uppercase text-[8px] tracking-wider select-none">Enterprise Edition</span>
                </div>
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
