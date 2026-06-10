import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Plus, Search, Upload, Bookmark, Trash2, ExternalLink, Star, 
  Sparkles, BookMarked, Edit3, X, Check, Loader2, Library, ChevronRight, 
  BookOpenCheck, SlidersHorizontal, ArrowUpDown, Move, GripVertical, CheckSquare, Sparkle,
  FileText, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DatabaseState, BookItem } from '../types';

interface BookshelfViewProps {
  dbState: DatabaseState;
  onUpdateDb: (updates: Partial<DatabaseState>) => void;
  onSelectView?: (view: string) => void;
}

interface OpenLibraryDoc {
  title: string;
  author_name?: string[];
  cover_i?: number;
  isbn?: string[];
  first_publish_year?: number;
}

export function BookshelfView({ dbState, onUpdateDb, onSelectView }: BookshelfViewProps) {
  const books = dbState.books || [];

  // View modes and Sort modes saved in database state
  const activeTab = dbState.bookshelfViewMode || 'shelf';
  const sortBy = dbState.bookshelfSortBy || 'manual';
  const lastReadId = dbState.bookshelfLastReadId;

  // Local filters & search (automatically remembered in local browser cache)
  const [filterStatus, setFilterStatus] = useState<'all' | 'reading' | 'want_to_read' | 'completed'>(() => {
    return (localStorage.getItem('bookshelf_filter_status') as any) || 'all';
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Save changes to filterStatus to remember what was opened last time
  useEffect(() => {
    localStorage.setItem('bookshelf_filter_status', filterStatus);
  }, [filterStatus]);

  // Local Book PDF state hooks
  const [localPdfData, setLocalPdfData] = useState<string>('');
  const [localPdfName, setLocalPdfName] = useState<string>('');
  const [localPdfSize, setLocalPdfSize] = useState<string>('');
  const bookPdfFileRef = React.useRef<HTMLInputElement>(null);

  const handleBookPdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.toLowerCase().endsWith('.pdf')) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(2) + ' MB';
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        if (result) {
          setLocalPdfData(result);
          setLocalPdfName(file.name);
          setLocalPdfSize(sizeMB);
          
          // Auto fill title if empty
          if (!title) {
            const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
            setTitle(cleanName);
          }
        }
      };
      reader.readAsDataURL(file);
    } else {
      alert("Please upload a standard document PDF file!");
    }
  };

  // Drag and drop tracking states
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Modal and custom detail tracking
  const [editingBook, setEditingBook] = useState<BookItem | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedBookDetails, setSelectedBookDetails] = useState<BookItem | null>(null);

  // Human-friendly Form States for Adding/Editing a Book
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [link, setLink] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [rating, setRating] = useState<number>(0);
  const [status, setStatus] = useState<'want_to_read' | 'reading' | 'completed'>('reading');
  const [totalPages, setTotalPages] = useState<number>(300);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [shelfLocation, setShelfLocation] = useState<string>('top');
  const [enableLinkedNote, setEnableLinkedNote] = useState(false);

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

  // Cover fetching states
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingCovers, setIsSearchingCovers] = useState(false);
  const [apiCoverResults, setApiCoverResults] = useState<OpenLibraryDoc[]>([]);
  const [searchingFeedback, setSearchingFeedback] = useState('');

  // Sync details if selected book is edited by other processes
  useEffect(() => {
    if (selectedBookDetails) {
      const refreshed = books.find(b => b.id === selectedBookDetails.id);
      if (refreshed) {
        setSelectedBookDetails(refreshed);
      }
    }
  }, [books, selectedBookDetails]);

  // Update view mode state
  const handleSetViewMode = (mode: 'shelf' | 'grid' | 'list' | 'compact') => {
    onUpdateDb({ bookshelfViewMode: mode });
  };

  // Update sorting state
  const handleSetSortBy = (sortOption: 'manual' | 'date' | 'alpha' | 'progress') => {
    onUpdateDb({ bookshelfSortBy: sortOption });
  };

  // Search Open Library catalog for automatic book import
  const searchOpenLibrary = async (queryText: string) => {
    if (!queryText.trim()) return;
    setIsSearchingCovers(true);
    setSearchingFeedback('Searching world library index...');
    try {
      const response = await fetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(queryText)}&limit=6`);
      const data = await response.json();
      if (data.docs && data.docs.length > 0) {
        setApiCoverResults(data.docs);
        setSearchingFeedback(`Found ${data.docs.length} matches! Click one to auto-fill details.`);
      } else {
        setApiCoverResults([]);
        setSearchingFeedback('Zero records found. You can enter details manually below!');
      }
    } catch (err) {
      console.error(err);
      setSearchingFeedback('Library indexing service offline. Please key in details manually!');
    } finally {
      setIsSearchingCovers(false);
    }
  };

  const handleSelectApiBook = (doc: OpenLibraryDoc) => {
    setTitle(doc.title);
    if (doc.author_name && doc.author_name.length > 0) {
      setAuthor(doc.author_name[0]);
    }
    if (doc.cover_i) {
      setCoverUrl(`https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`);
    } else if (doc.isbn && doc.isbn.length > 0) {
      setCoverUrl(`https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-L.jpg`);
    } else {
      setCoverUrl('');
    }
    setApiCoverResults([]);
    setSearchingFeedback('Book details successfully matched and synced!');
  };

  // Drag and Drop reordering logic
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

    const sourceIdx = books.findIndex(b => b.id === draggedId);
    const targetIdx = books.findIndex(b => b.id === targetId);

    if (sourceIdx !== -1 && targetIdx !== -1) {
      const updated = [...books];
      const [movedItem] = updated.splice(sourceIdx, 1);
      
      // If we dropped in shelf view, also adopt the target book's shelf position!
      const targetItem = books[targetIdx];
      if (activeTab === 'shelf' && targetItem && targetItem.shelfLocation) {
        movedItem.shelfLocation = targetItem.shelfLocation;
      }

      updated.splice(targetIdx, 0, movedItem);
      onUpdateDb({ 
        books: updated,
        bookshelfSortBy: 'manual' // Auto switch sorting to manual
      });
    }

    setDraggedId(null);
    setDragOverId(null);
  };

  // Convert custom uploaded image file to base64 string
  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1500000) {
      alert("Image file size is too big! Please select an image under 1.5MB to save securely.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        setCoverUrl(result);
        setSearchingFeedback('Custom high-res cover uploaded successfully!');
      }
    };
    reader.readAsDataURL(file);
  };

  // Create or Update Book details
  const handleSaveBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const bookPayload: BookItem = {
      id: editingBook ? editingBook.id : 'book_' + Date.now(),
      title: title.trim(),
      author: author.trim() || 'Anonymous Writer',
      link: link.trim(),
      localPdfData: localPdfData.trim() || undefined,
      localPdfName: localPdfName.trim() || undefined,
      localPdfSize: localPdfSize.trim() || undefined,
      coverUrl: coverUrl.trim(),
      notes: notes.trim(),
      rating,
      status,
      totalPages: totalPages > 0 ? totalPages : 1,
      currentPage: Math.min(Math.max(0, currentPage), totalPages),
      shelfLocation,
      createdAt: editingBook ? editingBook.createdAt : new Date().toISOString(),
      isReadingActive: editingBook ? editingBook.isReadingActive : false,
      lastOpenedAt: editingBook ? editingBook.lastOpenedAt : undefined,
      enableLinkedNote
    };

    let updatedBooks = [...books];
    if (editingBook) {
      updatedBooks = updatedBooks.map(b => b.id === editingBook.id ? bookPayload : b);
    } else {
      updatedBooks.push(bookPayload);
    }

    onUpdateDb({ books: updatedBooks });

    // Reset Fields
    resetForm();
    setIsAddOpen(false);
    setEditingBook(null);
  };

  // Load book details into editing modal
  const handleEditPayload = (book: BookItem) => {
    setEditingBook(book);
    setTitle(book.title);
    setAuthor(book.author || '');
    setLink(book.link || '');
    setLocalPdfData(book.localPdfData || '');
    setLocalPdfName(book.localPdfName || '');
    setLocalPdfSize(book.localPdfSize || '');
    setCoverUrl(book.coverUrl || '');
    setNotes(book.notes || '');
    setRating(book.rating || 0);
    setStatus(book.status);
    setTotalPages(book.totalPages || 300);
    setCurrentPage(book.currentPage || 0);
    setShelfLocation(book.shelfLocation || 'top');
    setEnableLinkedNote(!!book.enableLinkedNote);
    setIsAddOpen(true);
    setSelectedBookDetails(null);
  };

  // Delete book from database
  const handleDeleteBook = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm("Are you sure you want to remove this book from your bookshelf? All reading progress and study takeaways will be deleted.")) {
      const updatedBooks = books.filter(b => b.id !== id);
      const isDeletedLastRead = lastReadId === id;
      onUpdateDb({ 
        books: updatedBooks,
        bookshelfLastReadId: isDeletedLastRead ? undefined : lastReadId
      });
      setSelectedBookDetails(null);
    }
  };

  const handleOpenBookDetails = (book: BookItem) => {
    setSelectedBookDetails(book);
    
    // Mark this book as the active reading book in the collection
    const updatedBooks = books.map(b => ({
      ...b,
      isReadingActive: b.id === book.id,
      lastOpenedAt: b.id === book.id ? new Date().toISOString() : b.lastOpenedAt
    }));

    onUpdateDb({
      books: updatedBooks,
      bookshelfLastReadId: book.id
    });
  };

  const handleDownloadOfflineBook = (fileName: string, fileData: string) => {
    const link = document.createElement('a');
    link.href = fileData;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetForm = () => {
    setTitle('');
    setAuthor('');
    setLink('');
    setLocalPdfData('');
    setLocalPdfName('');
    setLocalPdfSize('');
    setCoverUrl('');
    setNotes('');
    setRating(0);
    setStatus('reading');
    setTotalPages(300);
    setCurrentPage(0);
    setShelfLocation('top');
    setEnableLinkedNote(false);
    setSearchQuery('');
    setApiCoverResults([]);
    setSearchingFeedback('');
  };

  // Filter book lists based on tab selection & search keywords
  const filteredBooks = books.filter(book => {
    const matchesStatus = filterStatus === 'all' || book.status === filterStatus;
    const matchesSearch = !searchTerm.trim() || 
      book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (book.author && book.author.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  // Sort logic
  const sortedBooks = [...filteredBooks].sort((a, b) => {
    if (sortBy === 'alpha') {
      return a.title.localeCompare(b.title);
    }
    if (sortBy === 'date') {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    }
    if (sortBy === 'progress') {
      const pctA = (a.totalPages && a.totalPages > 0) ? (a.currentPage || 0) / a.totalPages : 0;
      const pctB = (b.totalPages && b.totalPages > 0) ? (b.currentPage || 0) / b.totalPages : 0;
      return pctB - pctA; // Highest percentage complete first
    }
    // 'manual' order returns intact index
    return 0;
  });

  // Helper inside shelf view
  const booksOnShelf = (shelf: string) => {
    return sortedBooks.filter(b => (b.shelfLocation || 'top') === shelf);
  };

  // Procedural covers gradients based on book title characters hash
  const getProceduralCoverStyle = (text: string) => {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % 5;
    const gradients = [
      'from-emerald-900 via-teal-800 to-[#0e4b3e] text-emerald-100',
      'from-purple-900 via-indigo-850 to-[#1d1b4e] text-indigo-100',
      'from-[#5c2a18] via-[#8c3c1e] to-[#401c10] text-[#ffdfd5]',
      'from-rose-900 via-red-800 to-[#5a101f] text-rose-100',
      'from-[#122e40] via-[#1c4765] to-[#0d212e] text-cyan-100'
    ];
    return gradients[idx];
  };

  // Find the exact book to feature as the "Currently Reading" block at the top
  const featuredLastBook = lastReadId ? books.find(b => b.id === lastReadId) : books.find(b => b.status === 'reading');

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900/40 p-4 lg:p-7 min-h-screen">
      {/* View Header */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-550 dark:text-amber-400 border border-amber-500/20">
              <Library className="w-5 h-5 animate-pulse" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white font-mono uppercase tracking-tight">
              Virtual E-Bookshelf
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
            Track reading sessions, store core takeaways, and customize dynamic layouts. Change views to physical wood shelves, visual cards, notes, or list indexes. Drag books to manual spaces or switch shelves instantly.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              resetForm();
              setEditingBook(null);
              setIsAddOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold text-xs uppercase tracking-wider font-mono rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Scholar Book
          </button>
        </div>
      </div>

      {/* Featured Last Resumed Book Section (Resume Study Indicator) */}
      {featuredLastBook && (
        <div className="max-w-7xl mx-auto mb-6">
          <div className="relative overflow-hidden bg-gradient-to-r from-amber-500/10 via-orange-550/5 to-transparent border border-amber-500/20 dark:border-amber-500/30 p-5 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-5 shadow-sm">
            <div className="absolute top-0 right-0 w-44 h-44 bg-amber-400/5 dark:bg-amber-400/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center gap-4 w-full md:w-auto">
              {/* Cover mini preview */}
              <div className="relative w-12 h-18 shrink-0 rounded-lg overflow-hidden shadow-md bg-slate-950/20 flex flex-col">
                {featuredLastBook.coverUrl ? (
                  <img 
                    src={featuredLastBook.coverUrl} 
                    alt={featuredLastBook.title} 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${getProceduralCoverStyle(featuredLastBook.title)} flex items-center justify-center p-1 text-[8px] font-mono font-black text-center uppercase`}>
                    VOL
                  </div>
                )}
                <div className="absolute bottom-0 inset-x-0 h-1 bg-amber-500" />
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-mono font-black text-amber-550 dark:text-amber-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" /> Currently Studying
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-550 dark:text-amber-400 font-mono font-extrabold uppercase scale-90">
                    Active Volume
                  </span>
                </div>
                <h3 className="text-sm font-black text-slate-850 dark:text-white uppercase font-mono tracking-tight leading-snug line-clamp-1">
                  {featuredLastBook.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  by {featuredLastBook.author || 'Anonymous'} &middot; Progress: <strong className="font-mono text-amber-500">{featuredLastBook.currentPage} / {featuredLastBook.totalPages} pgs</strong> ({featuredLastBook.totalPages && featuredLastBook.totalPages > 0 ? Math.round((featuredLastBook.currentPage || 0) / featuredLastBook.totalPages * 100) : 0}%)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto md:shrink-0 justify-end">
              <button
                onClick={() => handleOpenBookDetails(featuredLastBook)}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 border border-slate-800 dark:bg-white dark:border-white hover:opacity-90 text-white dark:text-slate-900 font-bold text-xs uppercase tracking-widest font-mono rounded-xl shadow-md transition-all active:scale-95 cursor-pointer w-full md:w-auto justify-center"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                Resume Studying
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main control filter bar */}
      <div className="max-w-7xl mx-auto mb-6 bg-white dark:bg-slate-950/25 border border-slate-200 dark:border-slate-850 p-4 rounded-3xl flex flex-col gap-4 shadow-sm">
        
        {/* Top Row: Search box + Status tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 w-full">
          {/* Search Input Box */}
          <div className="relative w-full md:max-w-xs xl:max-w-sm shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 py-1 h-10 text-slate-400 hover:text-slate-500 dark:text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search books by title, author, key keywords..."
              className="w-full text-xs bg-slate-100/50 hover:bg-slate-100 dark:bg-slate-900/60 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-880 rounded-2xl p-2.5 pl-10 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all font-sans"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter on Status */}
          <div className="flex flex-row items-center gap-1.5 overflow-x-auto scrollbar-none py-1 w-full md:w-auto -mx-4 px-4 md:mx-0 md:px-0">
            {[
              { id: 'all', label: 'All Volumes 📚' },
              { id: 'reading', label: 'Studying Currently 📖' },
              { id: 'want_to_read', label: 'To Read ⏳' },
              { id: 'completed', label: 'Mastered 🏆' }
            ].map(opt => (
              <button
                 key={opt.id}
                 onClick={() => setFilterStatus(opt.id as any)}
                 className={`whitespace-nowrap px-3 py-1.5 md:py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                   filterStatus === opt.id
                     ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 font-mono uppercase tracking-tight'
                     : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850 border border-transparent'
                 }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Separator lines for elegance */}
        <div className="h-[1px] bg-slate-100/80 dark:bg-slate-850/60 w-full" />

        {/* Bottom Row: Actions Sorting and Switching views */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 w-full">
          
          {/* Sorter Selector Dropdown */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/80 p-1.5 px-3 rounded-2xl border border-slate-150 dark:border-slate-800 w-full md:max-w-xs shrink-0">
            <ArrowUpDown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => handleSetSortBy(e.target.value as any)}
              className="bg-transparent text-[11px] font-mono text-slate-600 dark:text-slate-350 focus:outline-none cursor-pointer w-full uppercase font-bold"
            >
              <option value="manual">Custom Placement Manual</option>
              <option value="date">Date Register Added</option>
              <option value="alpha">Alphabetical Order A-Z</option>
              <option value="progress">Reading Progress completion</option>
            </select>
          </div>

          {/* View triggers */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-2xl w-full md:w-auto overflow-x-auto scrollbar-none -mx-4 px-4 md:mx-0 md:px-0">
            {[
              { id: 'shelf', label: '🎨 Real Shelf' },
              { id: 'grid', label: '🎴 Card Grid' },
              { id: 'list', label: '📄 Read Notes' },
              { id: 'compact', label: '📊 Table Index' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => handleSetViewMode(tab.id as any)}
                className={`whitespace-nowrap px-2.5 py-1.5 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex-1 md:flex-initial text-center ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-slate-950 text-slate-800 dark:text-white shadow-sm border border-slate-200/50 dark:border-slate-850'
                    : 'text-slate-450 dark:text-slate-555 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* Manual Drag Tip status line */}
      {sortBy === 'manual' ? (
        <div className="max-w-7xl mx-auto mb-6">
          <div className="text-[10px] md:text-xs font-mono bg-slate-100/50 dark:bg-slate-950/10 border border-slate-200 dark:border-slate-850 p-2.5 px-4 rounded-2xl text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Move className="w-3.5 h-3.5 text-amber-500 animate-bounce shrink-0" />
            <span>🌟 Drag and drop any book to manually space them or move to another shelf row! Sorting mode has adjusted to "Custom Placement".</span>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto mb-6">
          <div className="text-[10px] md:text-xs font-mono bg-amber-500/5 border border-amber-500/10 p-2.5 px-4 rounded-2xl text-slate-500 dark:text-slate-400">
            <span>💡 Switching sort to <strong>"Custom Placement Manual"</strong> enables you to drag-and-drop volumes to re-position them freely inside covers row!</span>
          </div>
        </div>
      )}

      {/* Empty State visual */}
      {books.length === 0 ? (
        <div className="max-w-xl mx-auto text-center py-16 bg-white dark:bg-slate-950/20 border border-slate-200 dark:border-slate-850 p-8 rounded-3xl mt-12">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-505 dark:text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-500/15">
            <Library className="w-8 h-8" />
          </div>
          <h2 className="text-base font-black text-slate-800 dark:text-slate-200 font-mono uppercase tracking-tight">
            No Books on your Bookshelf
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto mt-2 leading-relaxed">
            Begin logging your textbooks, studies resources, and guides. Write dates, add links companion, rate volumes, and build a modular learning desk!
          </p>
          <button
            onClick={() => {
              resetForm();
              setIsAddOpen(true);
            }}
            className="mt-5 inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider bg-slate-950 dark:bg-white text-white dark:text-slate-950 hover:opacity-90 rounded-xl transition-all cursor-pointer shadow-md"
          >
            Add My First Book
          </button>
        </div>
      ) : filteredBooks.length === 0 ? (
        <div className="max-w-xl mx-auto text-center py-12">
          <p className="text-xs text-slate-450 dark:text-slate-500 font-mono">
            Zero book matches found for status filter or "{searchTerm}" keyword search. Try refreshing!
          </p>
        </div>
      ) : activeTab === 'shelf' ? (
        /* View 1: Realistic 3D Timber Bookshelf layout */
        <div className="max-w-7xl mx-auto space-y-12 pb-16">
          {['top', 'middle', 'bottom'].map((shelfId, index) => {
            const shelfBooks = booksOnShelf(shelfId);
            const shelfNames = ['🎓 Imperial Scholar Row', '🧪 Active Study Desk', '🕯️ Archival Reference Vault'];
            
            return (
              <div key={shelfId} className="space-y-3">
                
                {/* Visual indicator header */}
                <div className="flex items-center justify-between border-b border-dashed border-slate-200 dark:border-slate-800 pb-1.5">
                  <div className="flex items-center gap-2 font-mono text-xs font-black uppercase text-slate-600 dark:text-slate-400 tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>{shelfNames[index]} ({shelfId} Tier)</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 font-bold">{shelfBooks.length} Books Allocated</span>
                </div>
                
                {/* Realistic Wooden Shelf container */}
                <div className="relative min-h-[290px] pt-10 bg-slate-500/[0.02] dark:bg-slate-950/10 rounded-3xl border border-slate-200/40 dark:border-slate-850/45 overflow-visible flex flex-col justify-end">
                  
                  {/* shelf books row */}
                  <div className="flex flex-wrap items-end justify-center gap-x-12 gap-y-16 px-8 z-10 overflow-visible pb-3.5">
                    {shelfBooks.map((book, bookIdx) => {
                      const percentage = book.totalPages && book.totalPages > 0 
                        ? Math.min(100, Math.round((book.currentPage || 0) / book.totalPages * 100)) 
                        : 0;

                      const isDragged = draggedId === book.id;
                      const isOver = dragOverId === book.id;

                      return (
                        <div 
                          key={book.id}
                          onClick={() => handleOpenBookDetails(book)}
                          draggable
                          onDragStart={(e) => handleDragStart(e, book.id)}
                          onDragOver={(e) => handleDragOver(e, book.id)}
                          onDragLeave={handleDragLeave}
                          onDragEnd={handleDragEnd}
                          onDrop={(e) => handleDrop(e, book.id)}
                          className={`group relative cursor-grab active:cursor-grabbing flex flex-col items-center select-none transition-all duration-300 ${
                            isDragged ? 'opacity-30 scale-90' : ''
                          } ${
                            isOver ? 'border-2 border-dashed border-amber-500 p-2 rounded-2xl bg-amber-500/5' : ''
                          }`}
                          style={{ perspective: '1100px' }}
                        >
                          {/* 5D Rotatable Book cover plate (playfully scaled bigger!) */}
                          <div 
                            className="relative w-32 h-48 transition-all duration-500 ease-out transform-gpu preserve-3d group-hover:rotate-y-[-24deg] group-hover:rotate-x-[10deg] group-hover:scale-[1.12]"
                            style={{ 
                              transformStyle: 'preserve-3d',
                              transform: 'rotateY(-12deg) rotateX(4deg)'
                            }}
                          >
                            {/* SPINE EDGE LEFT DEPTH PLATE */}
                            <div 
                              className="absolute left-0 top-0 w-4 h-full rounded-l-md origin-left bg-zinc-950 text-slate-100 dark:text-slate-900 overflow-hidden"
                              style={{
                                transform: 'rotateY(-90deg) translateZ(0px)',
                                backfaceVisibility: 'hidden',
                                boxShadow: 'inset -2px 0 5px rgba(255,255,255,0.15), inset 2px 0 5px rgba(0,0,0,0.5)',
                                background: book.coverUrl ? '#161616' : 'linear-gradient(to right, rgba(0,0,0,0.95), rgba(255,255,255,0.05))',
                                opacity: 0.98
                              }}
                            >
                              <div className="absolute inset-0 flex items-center justify-center font-mono text-[7px] tracking-tight text-white font-black uppercase whitespace-nowrap rotate-90 origin-center scale-90">
                                {book.title.slice(0, 18)} &middot; {book.author ? book.author.slice(0, 10) : ''}
                              </div>
                            </div>

                            {/* FRONT FACE OF COVER */}
                            <div 
                              className={`absolute inset-0 rounded-r-xl overflow-hidden shadow-2xl border-l-[1.5px] border-white/20 flex flex-col justify-between p-3 ${
                                book.coverUrl ? 'bg-slate-900 border border-slate-700/60' : `bg-gradient-to-br ${getProceduralCoverStyle(book.title)}`
                              }`}
                              style={{ 
                                transform: 'translateZ(1.8px)',
                                backfaceVisibility: 'hidden'
                              }}
                            >
                              {book.coverUrl ? (
                                <>
                                  <img 
                                    src={book.coverUrl} 
                                    alt={book.title} 
                                    referrerPolicy="no-referrer"
                                    className="absolute inset-0 w-full h-full object-cover group-hover:brightness-110 transition-all duration-300"
                                  />
                                  <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-all pointer-events-none" />
                                </>
                              ) : (
                                <div className="w-full flex-1 flex flex-col justify-between border border-white/10 p-2 rounded-lg relative bg-black/15 select-none overflow-hidden h-full">
                                  <p className="font-mono text-[6px] tracking-widest text-[#f59e0b]/90 uppercase font-black text-left">
                                    {book.status === 'completed' ? '🏆 ACADEMIC MASTER' : book.status === 'reading' ? '📖 ACTIVE RESEARCH' : '⏳ ON RESERVE'}
                                  </p>

                                  <div className="text-center py-2">
                                    <h3 className="font-mono font-black text-[10.5px] leading-snug text-white uppercase tracking-tight break-words select-none max-h-[75px] overflow-hidden">
                                      {book.title}
                                    </h3>
                                    <div className="w-6 h-0.5 bg-[#f59e0b]/70 mx-auto mt-1.5" />
                                  </div>

                                  <p className="font-sans text-[8px] text-slate-200 italic truncate text-center select-none font-bold">
                                    by {book.author || 'Dean of Studies'}
                                  </p>
                                </div>
                              )}

                              {/* Realistic Gloss overlay reflection */}
                              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.04] to-white/[0.14] pointer-events-none z-20 mix-blend-overlay" />
                            </div>

                            {/* RIGHT THICKNESS PAGE SHEETS EDGE SIMULATOR */}
                            <div 
                              className="absolute right-0 top-1 w-5 h-[96%] bg-gradient-to-r from-stone-150 via-white to-stone-200 rounded-r"
                              style={{
                                transform: 'rotateY(90deg) translateZ(128px)',
                                backfaceVisibility: 'hidden',
                                boxShadow: 'inset -1px 0 2px rgba(0,0,0,0.15)'
                              }}
                            />
                            
                            {/* Done progress tag index */}
                            <div className="absolute bottom-2 right-2 bg-slate-900/90 backdrop-blur-3xs text-[8px] font-mono font-black text-amber-400 px-2 py-0.5 rounded border border-amber-400/20 shadow-sm z-30">
                              {percentage}% Done
                            </div>
                            
                            {/* Grip Reorder drag handle hint inside card list */}
                            <div className="absolute top-2 right-2 p-1 bg-black/60 backdrop-blur-3xs rounded border border-white/15 opacity-0 group-hover:opacity-100 transition-opacity z-30">
                              <GripVertical className="w-3 h-3 text-white" />
                            </div>
                          </div>

                          {/* Shadow casting reflection */}
                          <div 
                            className="w-28 h-6 opacity-20 dark:opacity-30 blur-xs transition-opacity duration-300 group-hover:opacity-40 rounded-full"
                            style={{
                              background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.9) 0%, transparent 80%)',
                              marginTop: '12px',
                              transform: 'scaleY(0.45)'
                            }}
                          />

                          {/* Human Readable Book Title Plate UNDER the Book! (Full Name View mode) */}
                          <div className="mt-3 text-center w-32 px-1">
                            <h4 className="font-mono font-bold text-[11px] text-slate-800 dark:text-zinc-200 line-clamp-2 truncate uppercase tracking-tight leading-tight group-hover:text-amber-500 transition-colors">
                              {book.title}
                            </h4>
                            <p className="font-sans text-[9px] text-slate-400 dark:text-slate-500 truncate mt-0.5 leading-none">
                              {book.author || 'Anonymous'}
                            </p>
                          </div>

                        </div>
                      );
                    })}

                    {shelfBooks.length === 0 && (
                      <div className="w-full text-center py-10">
                        <span className="text-[10.5px] font-mono text-slate-400 dark:text-slate-500 italic uppercase">
                          No Volumes allocated on this tier row yet
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Physical Wooden board styled block */}
                  <div className="h-6 w-full bg-gradient-to-r from-[#1a0f07] via-[#4d321a] to-[#1a0f07] border-t border-[#6d4825] border-l border-r rounded-b-2xl relative overflow-hidden z-20">
                    <div className="absolute top-0 left-0 w-full h-[2.5px] bg-gradient-to-r from-amber-400/20 via-amber-500/45 to-amber-450/20 pointer-events-none" />
                    <div className="absolute inset-x-0 bottom-0 h-3 bg-black/45 blur-3xs" />
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      ) : activeTab === 'grid' ? (
        /* View 2: Playfully Bigger Flat Card Grid View */
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-16">
          {sortedBooks.map(book => {
            const percentage = book.totalPages && book.totalPages > 0 
              ? Math.min(100, Math.round((book.currentPage || 0) / book.totalPages * 100)) 
              : 0;

            const isDragged = draggedId === book.id;
            const isOver = dragOverId === book.id;

            return (
              <div 
                key={book.id}
                onClick={() => handleOpenBookDetails(book)}
                draggable
                onDragStart={(e) => handleDragStart(e, book.id)}
                onDragOver={(e) => handleDragOver(e, book.id)}
                onDragLeave={handleDragLeave}
                onDragEnd={handleDragEnd}
                onDrop={(e) => handleDrop(e, book.id)}
                className={`bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-5 rounded-3xl hover:border-amber-550 dark:hover:border-amber-450 hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between gap-4 group relative ${
                  isDragged ? 'opacity-30 scale-95' : ''
                } ${
                  isOver ? 'border-2 border-dashed border-amber-500 bg-amber-500/5' : ''
                }`}
              >
                {/* 3D hover overlay covers thumb */}
                <div className="relative w-full h-56 rounded-2xl overflow-hidden shadow-md bg-slate-100 dark:bg-slate-900 border border-slate-150 dark:border-slate-850 flex flex-col justify-between p-3 select-none">
                  {book.coverUrl ? (
                    <img 
                      src={book.coverUrl} 
                      alt={book.title} 
                      referrerPolicy="no-referrer"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className={`absolute inset-0 bg-gradient-to-br ${getProceduralCoverStyle(book.title)} flex flex-col justify-between p-3.5 text-center select-none overflow-hidden h-full`}>
                      <span className="text-[6px] font-mono text-amber-400 font-extrabold uppercase tracking-wider block">Procedural Cover plate</span>
                      <h4 className="text-xs font-mono font-black text-white uppercase tracking-tight py-6 break-words line-clamp-3 leading-snug">
                        {book.title}
                      </h4>
                      <span className="text-[8.5px] text-zinc-300 truncate font-sans">by {book.author || 'Scholar'}</span>
                    </div>
                  )}

                  {/* Overlays status */}
                  <div className="absolute top-3 left-3 flex gap-1 z-30">
                    <span className="px-2 py-0.5 rounded-full bg-slate-900/80 backdrop-blur-3xs text-[8.5px] font-mono font-black uppercase text-amber-400 tracking-wide">
                      {book.status === 'completed' ? '🏆 Mastered' : book.status === 'reading' ? '📖 studying' : '⏳ Reserve'}
                    </span>
                    {book.enableLinkedNote && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerLinkedNote(book.id, book.title, 'book');
                        }}
                        className="p-1 rounded-full bg-amber-500 hover:bg-amber-605 text-white z-40 transition-colors shadow-xs cursor-pointer inline-flex items-center justify-center"
                        title="Open connected study note"
                      >
                        <span className="text-[9px] font-mono font-black scale-90">📝</span>
                      </button>
                    )}
                  </div>

                  <div className="absolute bottom-3 right-3 bg-black/85 backdrop-blur-3xs text-[9px] font-mono text-amber-400 font-bold p-1 px-2 rounded-xl z-30">
                    {percentage}% Done
                  </div>

                  <div className="absolute top-3 right-3 p-1.5 bg-black/75 backdrop-blur-3xs rounded-xl opacity-0 group-hover:opacity-100 transition-opacity z-30">
                    <GripVertical className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>

                {/* Info block */}
                <div className="space-y-2 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-mono font-black text-sm text-slate-850 dark:text-white uppercase leading-snug break-words group-hover:text-amber-550 transition-colors line-clamp-2">
                      {book.title}
                    </h3>
                    <p className="font-sans text-xs text-slate-450 dark:text-slate-500 truncate mt-0.5 font-medium">
                      by {book.author || 'Anonymous Writer'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-slate-100 dark:border-slate-900">
                    {/* Stars bar */}
                    <div className="flex items-center gap-0.5 text-amber-500">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star 
                          key={i} 
                          className={`w-3.5 h-3.5 ${i < (book.rating || 0) ? 'fill-amber-500 text-amber-550' : 'opacity-15'}`} 
                        />
                      ))}
                    </div>

                    <span className="text-[9.5px] font-mono text-slate-400 uppercase font-black">
                      {book.shelfLocation || 'Top'} Row
                    </span>
                  </div>

                  {/* Progress slide */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                      <span>Study Log</span>
                      <span>{book.currentPage} / {book.totalPages} pages</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-900 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-amber-500 to-orange-550 h-full rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : activeTab === 'list' ? (
        /* View 3: Detailed list view displaying personal study takeaways directly in-line! */
        <div className="max-w-7xl mx-auto space-y-4 pb-16">
          {sortedBooks.map(book => {
            const percentage = book.totalPages && book.totalPages > 0 
              ? Math.min(100, Math.round((book.currentPage || 0) / book.totalPages * 100)) 
              : 0;

            const isDragged = draggedId === book.id;
            const isOver = dragOverId === book.id;

            return (
              <div 
                key={book.id}
                onClick={() => handleOpenBookDetails(book)}
                draggable
                onDragStart={(e) => handleDragStart(e, book.id)}
                onDragOver={(e) => handleDragOver(e, book.id)}
                onDragLeave={handleDragLeave}
                onDragEnd={handleDragEnd}
                onDrop={(e) => handleDrop(e, book.id)}
                className={`bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-5 rounded-3xl hover:border-amber-450 hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col md:flex-row gap-6 group relative ${
                  isDragged ? 'opacity-30 scale-98' : ''
                } ${
                  isOver ? 'border-2 border-dashed border-amber-500 bg-amber-500/5' : ''
                }`}
              >
                {/* 3D cover art thumb on left */}
                <div className="w-full md:w-32 h-44 shrink-0 rounded-2xl overflow-hidden shadow-sm bg-slate-105 border border-slate-200 dark:border-slate-900 flex flex-col justify-between p-2 relative select-none">
                  {book.coverUrl ? (
                    <img 
                      src={book.coverUrl} 
                      alt={book.title} 
                      referrerPolicy="no-referrer"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                    />
                  ) : (
                    <div className={`absolute inset-0 bg-gradient-to-br ${getProceduralCoverStyle(book.title)} flex flex-col justify-between p-2 text-center select-none overflow-hidden h-full`}>
                      <span className="text-[5.5px] font-mono text-amber-400 font-extrabold uppercase">Procedural Art</span>
                      <h4 className="text-[9.5px] font-mono font-black text-white uppercase tracking-tight py-4 break-all">
                        {book.title}
                      </h4>
                      <span className="text-[7.5px] text-slate-350 truncate block">by {book.author}</span>
                    </div>
                  )}

                  <div className="absolute inset-x-0 bottom-0 h-1 bg-amber-500" />
                  <div className="absolute top-2 right-2 p-1 bg-black/60 backdrop-blur-3xs rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>

                {/* Mid section: details, annotates, progress */}
                <div className="flex-1 flex flex-col justify-between py-1 overflow-hidden space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Title & Author */}
                    <div className="lg:col-span-2 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/15 text-[8.5px] font-mono font-black uppercase tracking-wide">
                          {book.status === 'completed' ? '🏆 MASTERED' : book.status === 'reading' ? '📖 STUDYING' : '⏳ RESERVE'}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-slate-500 text-[8.5px] font-mono font-black uppercase tracking-wide border border-slate-200 dark:border-slate-800">
                          {book.shelfLocation || 'Top'} Shelf Row
                        </span>
                      </div>

                      <h3 className="font-mono font-black text-base text-slate-850 dark:text-white uppercase leading-snug group-hover:text-amber-550 transition-colors">
                        {book.title}
                      </h3>

                      <p className="font-sans text-xs text-slate-450 dark:text-slate-500 font-bold leading-none">
                        by {book.author || 'Anonymous'}
                      </p>

                      <div className="flex items-center gap-0.5 text-amber-500 pt-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-3.5 h-3.5 ${i < (book.rating || 0) ? 'fill-amber-500' : 'opacity-15'}`} 
                          />
                        ))}
                      </div>
                    </div>

                    {/* Progress details */}
                    <div className="flex flex-col justify-center bg-slate-50/50 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-150 dark:border-slate-850">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-700 dark:text-slate-350 font-bold mb-1">
                        <span>Reading Progress</span>
                        <span>{percentage}%</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono mb-2">{book.currentPage} of {book.totalPages} sheets logged</p>
                      
                      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-amber-550 to-orange-550 h-full rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Inline personal Study notes Takeaway block! */}
                  <div className="space-y-1">
                    <span className="text-[8.5px] font-mono font-extrabold uppercase tracking-widest text-[#f59e0b]/85 block">
                      Annotated take-aways:
                    </span>
                    <div className="bg-slate-50/30 dark:bg-slate-900/20 border border-slate-150 dark:border-slate-850/60 p-3 rounded-2xl text-xs text-slate-655 dark:text-slate-350 italic line-clamp-2 leading-relaxed">
                      {book.notes ? book.notes : "No takeaways or study findings annotated yet. Click card to edit annotations!"}
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        /* View 4: Compact list spreadsheet table */
        <div className="max-w-7xl mx-auto bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-3xl overflow-hidden shadow-sm mb-16">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-250 dark:border-slate-800 text-[9.5px] font-mono text-slate-450 dark:text-slate-500 uppercase font-black">
                  <th className="p-3.5 pl-6 w-10">Reorder</th>
                  <th className="p-3.5">Book Title & Author</th>
                  <th className="p-3.5">Shelf Location</th>
                  <th className="p-3.5">Your Rating</th>
                  <th className="p-3.5">Progress Slide</th>
                  <th className="p-3.5">Status Tag</th>
                  <th className="p-3.5 pr-6 text-center w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 dark:divide-slate-850">
                {sortedBooks.map(book => {
                  const percentage = book.totalPages && book.totalPages > 0 
                    ? Math.min(100, Math.round((book.currentPage || 0) / book.totalPages * 100)) 
                    : 0;

                  const isDragged = draggedId === book.id;
                  const isOver = dragOverId === book.id;

                  return (
                    <tr 
                      key={book.id}
                      onClick={() => handleOpenBookDetails(book)}
                      draggable
                      onDragStart={(e) => handleDragStart(e, book.id)}
                      onDragOver={(e) => handleDragOver(e, book.id)}
                      onDragLeave={handleDragLeave}
                      onDragEnd={handleDragEnd}
                      onDrop={(e) => handleDrop(e, book.id)}
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-all duration-150 cursor-pointer text-slate-800 dark:text-slate-200 ${
                        isDragged ? 'opacity-30' : ''
                      } ${
                        isOver ? 'bg-amber-500/10' : ''
                      }`}
                    >
                      {/* Grip handle */}
                      <td className="p-3.5 pl-6" onClick={(e) => e.stopPropagation()}>
                        <div className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-grab active:cursor-grabbing">
                          <GripVertical className="w-3.5 h-3.5" />
                        </div>
                      </td>

                      {/* Title & Author */}
                      <td className="p-3.5">
                        <div className="font-mono font-black text-xs text-slate-850 dark:text-white uppercase leading-tight line-clamp-1">
                          {book.title}
                        </div>
                        <div className="text-[10px] text-slate-450 dark:text-slate-500 truncate mt-0.5 leading-none">
                          by {book.author || 'Anonymous'}
                        </div>
                      </td>

                      {/* Shelf position */}
                      <td className="p-3.5">
                        <span className="text-[9.5px] px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-550 dark:text-slate-400 font-mono uppercase font-black">
                          {book.shelfLocation || 'Top'} Shelf
                        </span>
                      </td>

                      {/* Rating stars */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-0.5 text-amber-500">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-3 h-3 ${i < (book.rating || 0) ? 'fill-amber-500' : 'opacity-10'}`} 
                            />
                          ))}
                        </div>
                      </td>

                      {/* Progress bar */}
                      <td className="p-3.5 w-60">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[8px] font-mono text-slate-450 leading-none">
                            <span>{percentage}%</span>
                            <span>{book.currentPage} / {book.totalPages} pgs</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-900 rounded-full h-1 overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-amber-500 to-orange-550 h-full rounded"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Status Tag */}
                      <td className="p-3.5">
                        <span className={`inline-block text-[8.5px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          book.status === 'completed' 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15'
                            : book.status === 'reading'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/15'
                              : 'bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-520'
                        }`}>
                          {book.status === 'completed' ? '🏆 Complete' : book.status === 'reading' ? '📖 studying' : '⏳ Reserve'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 pr-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          {book.link && (
                            <a
                              href={book.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Companion Web link"
                              className="p-1 text-slate-405 hover:text-slate-651 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            onClick={() => handleEditPayload(book)}
                            title="Edit metadata annotations"
                            className="p-1 text-slate-405 hover:text-slate-651 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteBook(book.id)}
                            title="Remove book from library"
                            className="p-1 text-rose-451 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View modes details sidebar panel overlay */}
      <AnimatePresence>
        {selectedBookDetails && (
          <div className="fixed inset-0 bg-slate-950/70 dark:bg-black/85 backdrop-blur-3xs flex items-center justify-end z-55 p-0 md:p-4">
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white dark:bg-slate-900 border-l md:border border-slate-150 dark:border-slate-850 w-full max-w-lg h-full md:h-[95vh] md:rounded-3xl p-6 lg:p-8 overflow-y-auto space-y-6 shadow-2xl relative scrollbar-thin flex flex-col justify-between"
            >
              {/* Escape controller */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-150 dark:border-slate-850 pb-3.5">
                <span className="font-mono text-[9px] font-black uppercase tracking-widest text-amber-600 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/10">
                  📖 study book profile
                </span>
                <button
                  onClick={() => setSelectedBookDetails(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-850 transition-all cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Core view */}
              <div className="flex-1 space-y-6 pt-2">
                <div className="flex gap-5 items-start">
                  
                  {/* Miniature representation */}
                  <div className="w-24 h-36 shrink-0 rounded-2xl overflow-hidden shadow-md border border-slate-150 dark:border-slate-850 bg-slate-100 flex flex-col justify-between p-2 relative select-none">
                    {selectedBookDetails.coverUrl ? (
                      <img 
                        src={selectedBookDetails.coverUrl} 
                        alt={selectedBookDetails.title} 
                        referrerPolicy="no-referrer"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className={`absolute inset-0 bg-gradient-to-br ${getProceduralCoverStyle(selectedBookDetails.title)} flex flex-col justify-between p-2 text-center select-none overflow-hidden h-full`}>
                        <span className="text-[5.5px] font-mono text-amber-400 font-bold block">COVER GRAPHIC</span>
                        <h4 className="text-[8.5px] font-mono font-black text-white uppercase tracking-tight py-4 leading-normal break-all">
                          {selectedBookDetails.title}
                        </h4>
                        <span className="text-[6.5px] text-zinc-300 truncate">by {selectedBookDetails.author}</span>
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 h-1.5 bg-amber-500" />
                  </div>

                  <div className="flex-1 overflow-hidden space-y-2">
                    <span className="px-2 py-0.5 rounded bg-slate-105 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 text-[8.5px] font-mono uppercase font-black">
                      {selectedBookDetails.shelfLocation || 'Top'} Shelf
                    </span>

                    <h2 className="text-base font-black text-slate-850 dark:text-white uppercase font-mono tracking-tight leading-snug break-all line-clamp-3">
                      {selectedBookDetails.title}
                    </h2>

                    <p className="text-xs text-slate-450 dark:text-slate-500 font-sans font-extrabold pb-1">
                      by {selectedBookDetails.author || 'Anonymous Writer'}
                    </p>

                    <div className="flex items-center gap-0.5 text-amber-500">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star 
                          key={i} 
                          className={`w-3.5 h-3.5 ${i < (selectedBookDetails.rating || 0) ? 'fill-amber-500 text-amber-550' : 'opacity-15'}`} 
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-850 p-4 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-700 dark:text-zinc-350 font-black leading-none">
                    <span>Reading Sheets Completed</span>
                    <span>
                      {selectedBookDetails.currentPage} / {selectedBookDetails.totalPages} pages (
                      {selectedBookDetails.totalPages && selectedBookDetails.totalPages > 0 
                        ? Math.min(100, Math.round((selectedBookDetails.currentPage || 0) / selectedBookDetails.totalPages * 100)) 
                        : 0}%
                      )
                    </span>
                  </div>
                  
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-amber-550 to-orange-550 h-full rounded-full"
                      style={{ 
                        width: `${selectedBookDetails.totalPages && selectedBookDetails.totalPages > 0 
                          ? Math.min(100, (selectedBookDetails.currentPage || 0) / selectedBookDetails.totalPages * 100) 
                          : 0}%` 
                      }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[8.5px] font-mono text-slate-400 uppercase font-bold pt-0.5 leading-none">
                    <span>First Page</span>
                    <span>Finished</span>
                  </div>
                </div>

                {/* notes segment */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-mono font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                      Takeaway Lecture Notes & Annotation Summary
                    </h4>
                  </div>
                  
                  <div className="bg-slate-100/10 dark:bg-slate-950/40 border border-slate-150/40 dark:border-slate-850/60 p-4 rounded-3xl min-h-[140px] text-xs font-sans leading-relaxed text-slate-700 dark:text-slate-300">
                    {selectedBookDetails.notes ? (
                      <p className="whitespace-pre-wrap">{selectedBookDetails.notes}</p>
                    ) : (
                      <span className="italic text-slate-400 block text-center py-6 leading-relaxed">No custom take-aways annotated for this textbook. Click "Edit book details" to record annotations!</span>
                    )}
                  </div>
                </div>

                {/* Concurrent Action Anchors: Online Link & Offline local PDF reading options */}
                {(selectedBookDetails.link || selectedBookDetails.localPdfData) && (
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    {selectedBookDetails.localPdfData && (
                      <button
                        onClick={() => handleDownloadOfflineBook(selectedBookDetails.localPdfName || 'document.pdf', selectedBookDetails.localPdfData!)}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#e0f2fe]/80 dark:bg-[#0c4a6e]/40 border border-sky-200 dark:border-sky-850 hover:bg-sky-100 dark:hover:bg-sky-900/30 text-sky-700 dark:text-sky-300 rounded-2xl text-xs font-mono font-black uppercase tracking-widest transition-all cursor-pointer shadow-sm"
                        title={`Open Offline PDF: ${selectedBookDetails.localPdfName}`}
                      >
                        <FileText className="w-4 h-4 text-sky-500" />
                        <span>Read Offline PDF</span>
                      </button>
                    )}
                    {selectedBookDetails.link && (
                      <a 
                        href={selectedBookDetails.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-300/60 text-amber-600 dark:text-amber-450 rounded-2xl text-xs font-mono font-black uppercase tracking-widest transition-all cursor-pointer shadow-sm"
                      >
                        <ExternalLink className="w-4 h-4 text-amber-500" />
                        <span>Read Online Link</span>
                      </a>
                    )}
                  </div>
                )}

                {selectedBookDetails.enableLinkedNote && (
                  <div className="pt-2">
                    <button
                      onClick={() => triggerLinkedNote(selectedBookDetails.id, selectedBookDetails.title, 'book')}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-amber-500/10 hover:bg-amber-505/25 border border-amber-305/45 text-amber-600 dark:text-amber-400 rounded-2xl text-xs font-mono font-black uppercase tracking-widest transition-all cursor-pointer shadow-xs"
                      title="Open connected study note"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0 inline-block" />
                      <span>📝 Open Connected Quick Note</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Bottom controls */}
              <div className="flex items-center gap-2 border-t border-slate-150 dark:border-slate-850 pt-4 mt-4">
                <button
                  onClick={() => handleDeleteBook(selectedBookDetails.id)}
                  className="flex items-center justify-center gap-1.5 px-4 h-11 border border-transparent hover:bg-rose-50 dark:hover:bg-rose-950/25 text-rose-500 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  Burn Book
                </button>

                <button
                  onClick={() => handleEditPayload(selectedBookDetails)}
                  className="flex-1 flex items-center justify-center gap-1.5 h-11 bg-slate-900 hover:bg-slate-955 text-white dark:bg-white dark:text-slate-900 font-mono font-black text-xs uppercase tracking-wider rounded-xl shadow transition-all cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit Book Details
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Human Readable Add/Edit Book Volume Modal */}
      <AnimatePresence>
        {isAddOpen && (
          <div className="fixed inset-0 bg-slate-950/80 dark:bg-black/90 backdrop-blur-xs flex items-center justify-center z-55 p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-4xl max-w-2xl w-full p-5 lg:p-7 max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl relative scrollbar-thin"
            >
              <button
                onClick={() => {
                  setIsAddOpen(false);
                  setEditingBook(null);
                  resetForm();
                }}
                className="absolute top-4.5 right-4.5 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-850 transition-all cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>

              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white font-mono uppercase tracking-tight">
                  {editingBook ? 'Edit Book Details' : 'Add a New Book to Library'}
                </h2>
                <p className="text-xs text-slate-400 dark:text-slate-505">
                  Provide book details to add it to your virtual bookshelf. Use the automatic search bar to auto-populate title, writer, and cover images directly from global catalogs.
                </p>
              </div>

              {/* Automatic open archives scan tool */}
              <div className="bg-slate-50 dark:bg-slate-950/30 border border-slate-150 dark:border-slate-850/60 p-4 rounded-3xl space-y-3">
                <label className="text-[10px] font-mono font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest block">
                  🔍 Search Global Book Library (Auto-fill)
                </label>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        searchOpenLibrary(searchQuery);
                      }
                    }}
                    placeholder="Enter book title keywords (e.g. Clean Code, Systems Design, CLRS)"
                    className="flex-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 px-4 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => searchOpenLibrary(searchQuery)}
                    disabled={isSearchingCovers}
                    className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs uppercase tracking-wider font-mono rounded-2xl hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-sm"
                  >
                    {isSearchingCovers ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    Search
                  </button>
                </div>

                {searchingFeedback && (
                  <p className="text-[10px] italic font-mono text-slate-400">{searchingFeedback}</p>
                )}

                {apiCoverResults.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 max-h-[150px] overflow-y-auto pr-1">
                    {apiCoverResults.map((doc, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectApiBook(doc)}
                        className="p-3 border border-slate-150 dark:border-slate-850/60 bg-white dark:bg-slate-900 rounded-2xl hover:border-amber-500 hover:bg-amber-500/5 text-left transition-all text-xs cursor-pointer block truncate"
                      >
                        <span className="font-bold block truncate text-slate-800 dark:text-slate-200 uppercase font-mono">{doc.title}</span>
                        <span className="text-[10px] opacity-75 truncate block">by {doc.author_name?.[0] || 'Unknown Author'}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Core manual fields */}
              <form onSubmit={handleSaveBook} className="space-y-5">
                
                {/* General metadata */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest block">
                      📌 Book Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="E.g. Clean Code, Systems Design"
                      className="w-full text-xs font-bold bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-amber-550 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-black text-slate-450 dark:text-slate-505 uppercase tracking-widest block">
                      ✍️ Author / Writer
                    </label>
                    <input
                      type="text"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      placeholder="E.g. Robert C. Martin"
                      className="w-full text-xs font-bold bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-amber-550 transition-colors"
                    />
                  </div>
                </div>

                {/* DUAL RESOURCE PANEL: Online companion link AND Offline local file attachment */}
                <div className="bg-slate-50/40 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 p-4 rounded-3xl space-y-4">
                  <div className="flex items-center gap-1.55">
                    <Sparkles className="w-4 h-4 text-amber-550" />
                    <h3 className="text-xs font-mono font-black text-slate-750 dark:text-slate-300 uppercase tracking-wider">
                      Attach Textbook Resources (Concurrent Options)
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* OPTION A: Online Web Companion */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-mono font-extrabold text-amber-600 dark:text-amber-450 uppercase tracking-widest block">
                        🌐 Option 1: Paste Web / PDF Link
                      </label>
                      <input
                        type="url"
                        value={link}
                        onChange={(e) => setLink(e.target.value)}
                        placeholder="E.g. https://example.com/textbook.pdf"
                        className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-xl p-2.5 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-amber-550 transition-all font-bold"
                      />
                    </div>

                    {/* OPTION B: Offline Local Laptop PDF File */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-mono font-extrabold text-sky-600 dark:text-sky-450 uppercase tracking-widest block">
                        📁 Option 2: Upload Local Textbook PDF
                      </label>
                      
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          ref={bookPdfFileRef}
                          accept="application/pdf"
                          onChange={handleBookPdfUpload}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => bookPdfFileRef.current?.click()}
                          className="flex items-center justify-center gap-1.5 px-4 h-9.5 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs border border-slate-200/40 dark:border-slate-750/30 grow"
                        >
                          <Upload className="w-3.5 h-3.5 text-sky-500 animate-pulse" />
                          <span>Fetch PDF File</span>
                        </button>

                        {localPdfName && (
                          <button
                            type="button"
                            onClick={() => {
                              setLocalPdfData('');
                              setLocalPdfName('');
                              setLocalPdfSize('');
                              if (bookPdfFileRef.current) bookPdfFileRef.current.value = '';
                            }}
                            className="p-2 border border-rose-250 rounded-xl bg-rose-50 hover:bg-rose-105 text-rose-500 transition-all cursor-pointer"
                            title="Remove PDF"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {localPdfName ? (
                        <div className="flex items-center gap-1.5 text-[9px] text-emerald-650 dark:text-emerald-400 font-mono italic px-1 pt-1 break-all line-clamp-1">
                          <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span>Attached: {localPdfName} ({localPdfSize})</span>
                        </div>
                      ) : (
                        <p className="text-[9.5px] text-slate-400 dark:text-slate-505 px-1 pt-1 leading-snug">
                          No local textbook PDF loaded yet.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* PLAYFUL PUT ON SHELF SELECTOR CARD */}
                <div className="bg-slate-50/40 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 p-4 rounded-3xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
                      📚 Put on Virtual Shelf Row *
                    </span>
                    <span className="text-[9.5px] text-amber-500 font-mono font-extrabold uppercase">Choose Shelf Level</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {[
                      { id: 'top', label: 'Imperial Scholar Row', level: 'Top Row', emoji: '🎓' },
                      { id: 'middle', label: 'Active Study Desk', level: 'Middle Row', emoji: '🧪' },
                      { id: 'bottom', label: 'Archival Reference Vault', level: 'Bottom Row', emoji: '🕯️' }
                    ].map(shelf => (
                      <button
                        key={shelf.id}
                        type="button"
                        onClick={() => setShelfLocation(shelf.id)}
                        className={`p-3 rounded-2xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                          shelfLocation === shelf.id
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/80 shadow-md ring-1 ring-amber-500/20 scale-[1.01]'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800/80 text-slate-505 dark:text-slate-450 hover:border-slate-350'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-base">{shelf.emoji}</span>
                          <span className={`text-[8.5px] font-mono font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            shelfLocation === shelf.id ? 'bg-amber-500/20 text-amber-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                          }`}>
                            {shelf.level}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono font-bold leading-tight mt-2.5 uppercase">
                          {shelf.label}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Progress parameters and rating */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Total pages */}
                  <div className="space-y-1">
                    <label className="text-[9.5px] font-mono font-black text-slate-450 dark:text-slate-550 uppercase tracking-widest block">
                      📖 Total Pages
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={totalPages}
                      onChange={(e) => setTotalPages(parseInt(e.target.value) || 1)}
                      className="w-full text-xs font-bold bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-amber-550 transition-colors"
                    />
                  </div>

                  {/* Current Page */}
                  <div className="space-y-1">
                    <label className="text-[9.5px] font-mono font-black text-slate-450 dark:text-slate-550 uppercase tracking-widest block">
                      🚀 Current Progress
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={currentPage}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setCurrentPage(isNaN(val) ? 0 : val);
                      }}
                      className="w-full text-xs font-bold bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-amber-550 transition-colors"
                    />
                  </div>

                  {/* Reading Status tag Selection */}
                  <div className="space-y-1">
                    <label className="text-[9.5px] font-mono font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest block">
                      🚦 Reading Status
                    </label>
                    <div className="grid grid-cols-3 gap-1.5 h-10">
                      {[
                        { id: 'want_to_read', label: 'To Read' },
                        { id: 'reading', label: 'Studying' },
                        { id: 'completed', label: 'Mastered' }
                      ].map(opt => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setStatus(opt.id as any)}
                          className={`text-[9.5px] font-bold uppercase rounded-xl border transition-all cursor-pointer select-none leading-none flex items-center justify-center ${
                            status === opt.id
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-450 hover:bg-slate-50'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Cover and rating in clean row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Rating selection */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest block">
                      ⭐ Your Personal Star Rating
                    </label>
                    <div className="flex items-center gap-1 bg-slate-50/30 dark:bg-slate-950/15 border border-slate-200/60 dark:border-slate-850/60 p-1.5 rounded-2xl h-11.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setRating(i + 1)}
                          className="text-amber-500 hover:scale-110 transition-all outline-none cursor-pointer"
                        >
                          <Star className={`w-5 h-5 ${i < rating ? 'fill-amber-500 text-amber-550' : 'opacity-15'}`} />
                        </button>
                      ))}
                      <span className="text-[9.5px] font-mono text-slate-450 dark:text-slate-500 font-bold ml-2 uppercase truncate">{rating} stars</span>
                    </div>
                  </div>

                  {/* Unified Cover Art Input with direct local cover upload file selector included */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-black text-slate-450 dark:text-slate-505 uppercase tracking-widest block">
                      🎨 Cover Artwork URL or Local Cover
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={coverUrl}
                        onChange={(e) => setCoverUrl(e.target.value)}
                        placeholder="Paste image link, or upload local file on right"
                        className="flex-1 text-xs font-bold bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-amber-550"
                      />
                      
                      <div className="relative shrink-0">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleCoverUpload}
                          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                        />
                        <div className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 rounded-2xl text-[10px] font-mono font-black uppercase tracking-wider text-slate-650 dark:text-slate-355 pointer-events-none flex items-center gap-1 shadow-xs border border-slate-250 dark:border-slate-750/30">
                          <Upload className="w-3.5 h-3.5 text-amber-500" />
                          <span>Cover</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Personal Study takeaways annotations */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-black text-slate-450 dark:text-slate-505 uppercase tracking-widest block">
                    📝 Study Notes & Core Takeaways
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter key concepts, lecture notes, formula sheets, or review objectives..."
                    className="w-full text-xs bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 min-h-[75px] h-[75px] max-h-[140px] text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
                  />
                </div>

                {/* Connection Checkbox */}
                <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-amber-500/5 border border-amber-500/10 animate-in fade-in">
                  <input
                    type="checkbox"
                    id="bookEnableLinkedNote"
                    checked={enableLinkedNote}
                    onChange={(e) => setEnableLinkedNote(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 accent-amber-500 cursor-pointer shrink-0"
                  />
                  <label htmlFor="bookEnableLinkedNote" className="text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer select-none">
                    Enable Connected Quick Note 🔗
                    <span className="block text-[10px] font-normal text-slate-400 mt-0.5">Creates a handy floating Study note linkage for active book reading.</span>
                  </label>
                </div>

                {/* Form cancel / save controllers */}
                <div className="flex items-center justify-between gap-3 border-t border-slate-150 dark:border-slate-800/80 pt-4 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddOpen(false);
                      setEditingBook(null);
                      resetForm();
                    }}
                    className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-slate-450 dark:text-slate-400 cursor-pointer transition-all"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-mono font-black text-xs uppercase tracking-widest rounded-xl shadow-md cursor-pointer hover:scale-[1.01] active:scale-97 transition-all"
                  >
                    Save Book
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
