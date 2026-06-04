import React, { useState } from 'react';
import { 
  Search, Plus, Trash2, ExternalLink, Star, Filter, 
  BookOpen, Clock, AlertCircle, Edit3, X, Check, Globe,
  ArrowRight, ArrowLeft, Heart, Bookmark, Settings, Loader2, Pin,
  LayoutGrid, List, LayoutList, Kanban, ChevronRight, ChevronLeft
} from 'lucide-react';
import { DatabaseState, VaultItem } from '../types';

interface KnowledgeVaultViewProps {
  dbState: DatabaseState;
  onUpdateDb: (updates: Partial<DatabaseState>) => void;
}

const DEFAULT_CATEGORIES = [
  'DSA',
  'Development',
  'DevOps',
  'System Design',
  'Interview Preparation',
  'Documentation',
  'AI',
  'Learning Resources'
];

export function KnowledgeVaultView({ dbState, onUpdateDb }: KnowledgeVaultViewProps) {
  const vaultItems = dbState.vaultItems || [];
  
  // Use custom user-defined categories if set, fallback to default static categories
  const categoryOptions = dbState.vaultCategories && dbState.vaultCategories.length > 0
    ? dbState.vaultCategories
    : DEFAULT_CATEGORIES;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [vaultLayoutMode, setVaultLayoutMode] = useState<'grid' | 'list' | 'compact' | 'kanban'>('grid');

  // Simple step-by-step popup wizard state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VaultItem | null>(null);
  const [currentStep, setCurrentStep] = useState(1); // 1 or 2

  // Simple modular bookmark form states
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [formError, setFormError] = useState('');

  // Category list settings modal state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [editingCategoryName, setEditingCategoryName] = useState<string | null>(null);
  const [editingCategoryInput, setEditingCategoryInput] = useState('');
  const [categoryError, setCategoryError] = useState('');

  // Custom states for dialogs inside the iframe environment to bypass blocked window.confirm
  const [itemToDelete, setItemToDelete] = useState<{ id: string; title: string } | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  const resetForm = () => {
    setUrl('');
    setTitle('');
    setDescription('');
    setCategory('');
    setNotes('');
    setIsFavorite(false);
    setFormError('');
    setCurrentStep(1);
  };

  const handleOpenAdd = () => {
    resetForm();
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: VaultItem) => {
    resetForm();
    setEditingItem(item);
    setUrl(item.url);
    setTitle(item.title);
    setDescription(item.description || '');
    setCategory(item.category === 'Uncategorized' ? '' : item.category);
    setNotes(item.notes || '');
    setIsFavorite(item.isFavorite);
    setIsModalOpen(true);
  };

  const validateStep1 = () => {
    if (!url.trim()) {
      setFormError('Please enter a website link.');
      return false;
    }
    if (!title.trim()) {
      setFormError('Please enter a website title.');
      return false;
    }
    setFormError('');
    return true;
  };

  const validateStep2 = () => {
    // Both items are optional or can be added/edited later, so validation automatically passes
    setFormError('');
    return true;
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (validateStep1()) setCurrentStep(2);
    }
  };

  const handlePrevStep = () => {
    setFormError('');
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep === 1) {
      if (validateStep1()) {
        setCurrentStep(2);
      }
    } else {
      handleSaveItem(e);
    }
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!title.trim() || !url.trim()) {
      setFormError('Please complete step one (website link and title) first.');
      return;
    }

    let formattedUrl = url.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }

    try {
      new URL(formattedUrl);
    } catch {
      setFormError('Please check custom web address entry.');
      return;
    }

    const finalDescription = description.trim();
    const finalCategory = category.trim() || 'Uncategorized';

    if (editingItem) {
      // Update item
      const updatedList = vaultItems.map(item => {
        if (item.id === editingItem.id) {
          return {
            ...item,
            title: title.trim(),
            description: finalDescription,
            url: formattedUrl,
            category: finalCategory,
            notes: notes.trim() || undefined,
            isFavorite
          };
        }
        return item;
      });
      onUpdateDb({ vaultItems: updatedList });
    } else {
      // Create item
      const newItem: VaultItem = {
        id: `vault-${Date.now()}`,
        title: title.trim(),
        description: finalDescription,
        url: formattedUrl,
        category: finalCategory,
        notes: notes.trim() || undefined,
        isFavorite,
        tags: [finalCategory.toLowerCase()],
        createdAt: new Date().toISOString()
      };
      onUpdateDb({ vaultItems: [newItem, ...vaultItems] });
    }

    setIsModalOpen(false);
    resetForm();
  };

  const handleDeleteItem = (itemId: string) => {
    const item = vaultItems.find(it => it.id === itemId);
    if (item) {
      setItemToDelete({ id: itemId, title: item.title });
    }
  };

  const confirmDeleteItem = () => {
    if (itemToDelete) {
      const updatedList = vaultItems.filter(item => item.id !== itemToDelete.id);
      onUpdateDb({ vaultItems: updatedList });
      setItemToDelete(null);
    }
  };

  const toggleFavorite = (itemId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const updatedList = vaultItems.map(item => {
      if (item.id === itemId) {
        return { ...item, isFavorite: !item.isFavorite };
      }
      return item;
    });
    onUpdateDb({ vaultItems: updatedList });
  };

  const togglePin = (itemId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const updatedList = vaultItems.map(item => {
      if (item.id === itemId) {
        return { ...item, isPinned: !item.isPinned };
      }
      return item;
    });
    onUpdateDb({ vaultItems: updatedList });
  };

  const moveItemCategory = (itemId: string, destinationCategory: string) => {
    const updatedList = vaultItems.map(item => {
      if (item.id === itemId) {
        return { ...item, category: destinationCategory };
      }
      return item;
    });
    onUpdateDb({ vaultItems: updatedList });
  };

  // Category operations handlers
  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryError('');
    const trimmedVal = newCategoryInput.trim();
    if (!trimmedVal) {
      setCategoryError('Category name cannot be empty.');
      return;
    }
    if (categoryOptions.some(cat => cat.toLowerCase() === trimmedVal.toLowerCase())) {
      setCategoryError('This category already exists.');
      return;
    }

    const updatedCategories = [...categoryOptions, trimmedVal];
    onUpdateDb({ vaultCategories: updatedCategories });
    setNewCategoryInput('');
  };

  const handleDeleteCategory = (catToDelete: string) => {
    if (categoryOptions.length <= 1) {
      setCategoryError('You must keep at least one category to run your vault.');
      return;
    }
    setCategoryToDelete(catToDelete);
  };

  const confirmDeleteCategory = () => {
    if (categoryToDelete) {
      const remainingCategories = categoryOptions.filter(cat => cat !== categoryToDelete);
      const replacementCat = remainingCategories[0];

      // Reassign affected items
      const updatedVaultItems = vaultItems.map(item => {
        if (item.category === categoryToDelete) {
          return { ...item, category: replacementCat };
        }
        return item;
      });

      onUpdateDb({
        vaultCategories: remainingCategories,
        vaultItems: updatedVaultItems
      });

      if (selectedCategory === categoryToDelete) {
        setSelectedCategory('all');
      }
      setCategoryError('');
      setCategoryToDelete(null);
    }
  };

  const handleStartRenameCategory = (cat: string) => {
    setEditingCategoryName(cat);
    setEditingCategoryInput(cat);
    setCategoryError('');
  };

  const handleSaveRenameCategory = (originalName: string) => {
    setCategoryError('');
    const trimmedVal = editingCategoryInput.trim();
    if (!trimmedVal) {
      setCategoryError('Category name cannot be empty.');
      return;
    }
    if (trimmedVal === originalName) {
      setEditingCategoryName(null);
      return;
    }
    if (categoryOptions.some(cat => cat.toLowerCase() === trimmedVal.toLowerCase() && cat !== originalName)) {
      setCategoryError('Another category is already using that exact name.');
      return;
    }

    // Update categories
    const updatedCategories = categoryOptions.map(cat => cat === originalName ? trimmedVal : cat);

    // Update affected vault items
    const updatedVaultItems = vaultItems.map(item => {
      if (item.category === originalName) {
        return { ...item, category: trimmedVal };
      }
      return item;
    });

    onUpdateDb({
      vaultCategories: updatedCategories,
      vaultItems: updatedVaultItems
    });

    // Adjust current filter if user had that specific category selected
    if (selectedCategory === originalName) {
      setSelectedCategory(trimmedVal);
    }

    setEditingCategoryName(null);
  };

  const filteredItems = vaultItems.filter(item => {
    const query = searchTerm.toLowerCase();
    const matchesQuery = 
      item.title.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query) ||
      (item.notes?.toLowerCase() || '').includes(query);

    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesFav = !showOnlyFavorites || item.isFavorite;

    return matchesQuery && matchesCategory && matchesFav;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    const aPinned = !!a.isPinned;
    const bPinned = !!b.isPinned;
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;

    const aFav = !!a.isFavorite;
    const bFav = !!b.isFavorite;
    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const getDomainName = (urlString: string) => {
    try {
      const urlObj = new URL(urlString);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return 'webresource.com';
    }
  };

  const getFaviconUrl = (urlString: string) => {
    const domain = getDomainName(urlString);
    return `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;
  };

  const getCategoryTheme = (cat: string) => {
    switch (cat) {
      case 'DSA':
        return 'bg-purple-100/80 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200/50';
      case 'Development':
        return 'bg-blue-105 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200/50';
      case 'DevOps':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-350 border-amber-200/50';
      case 'System Design':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/50';
      case 'Interview Preparation':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200/50';
      case 'Documentation':
        return 'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200/50';
      case 'AI':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200/50';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200/60';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-150 text-left">
      
      {/* Dynamic simplified minimal heading */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-105 dark:border-slate-800/60 pb-5">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <BookOpen className="w-8 h-8 text-blue-600 shrink-0" />
            <span>Knowledge Vault</span>
          </h2>
          <p className="text-sm font-semibold text-slate-400 dark:text-slate-500 mt-1 font-sans">
            A super clean place to save and find your favorite websites, learning resources, and links.
          </p>
        </div>

        <div>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-sm rounded-2xl transition-all shadow-md active:scale-95 cursor-pointer font-sans"
          >
            <Plus className="w-5 h-5" />
            <span>Create Bookmark</span>
          </button>
        </div>
      </div>

      {/* Simplified, child & grandparent-friendly filters */}
      <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-205 dark:border-slate-800/80 flex flex-col md:flex-row justify-between gap-3 items-center">
        {/* Simple search bar */}
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Type code, category, or title to find..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-955 rounded-xl text-sm placeholder-slate-400 font-sans focus:outline-none focus:border-blue-500 text-slate-800 dark:text-slate-200"
          />
        </div>

        {/* Big categories selectors + manage button */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full md:w-auto px-4 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-xl text-xs font-bold text-slate-750 dark:text-slate-200 outline-none"
          >
            <option value="all">📁 All Categories</option>
            {categoryOptions.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Manage categories configuration panel selector */}
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="px-3.5 py-1.5 border border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-950 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
            title="Edit category lists (create, rename, delete)"
          >
            <Settings className="w-3.5 h-3.5 text-slate-400" />
            <span>Manage</span>
          </button>

          <button
            onClick={() => setShowOnlyFavorites(prev => !prev)}
            className={`px-4 py-1.5 rounded-xl border text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
              showOnlyFavorites
                ? 'bg-amber-500 border-amber-600 text-white'
                : 'bg-white border-slate-200 text-slate-500 hover:text-slate-805 dark:bg-slate-950 dark:border-slate-855'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${showOnlyFavorites ? 'fill-white text-white' : 'text-slate-400'}`} />
            <span>Starred</span>
          </button>
        </div>
      </div>

      {/* Dynamic Vault Layout Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-905 p-3.5 rounded-2xl border border-slate-201 dark:border-slate-800/60 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono">
            Vault Layout Shift:
          </div>
          <span className="text-[10px] bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-450 px-2.5 py-0.5 rounded-md font-bold uppercase tracking-wider font-mono">
            {vaultLayoutMode} active
          </span>
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto bg-slate-55 dark:bg-slate-950 p-1 rounded-xl border border-slate-100 dark:border-slate-855">
          <button
            type="button"
            onClick={() => setVaultLayoutMode('grid')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-[11px] font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              vaultLayoutMode === 'grid'
                ? 'bg-white dark:bg-slate-850 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-150 dark:border-slate-800'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border border-transparent'
            }`}
            title="Grid Card Board"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Grid Cards</span>
          </button>

          <button
            type="button"
            onClick={() => setVaultLayoutMode('list')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-[11px] font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              vaultLayoutMode === 'list'
                ? 'bg-white dark:bg-slate-855 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-150 dark:border-slate-800'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border border-transparent'
            }`}
            title="Detailed Rows"
          >
            <List className="w-3.5 h-3.5" />
            <span>Detailed List</span>
          </button>

          <button
            type="button"
            onClick={() => setVaultLayoutMode('compact')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-[11px] font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              vaultLayoutMode === 'compact'
                ? 'bg-white dark:bg-slate-855 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-150 dark:border-slate-800'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border border-transparent'
            }`}
            title="Ultra-compact Directory"
          >
            <LayoutList className="w-3.5 h-3.5" />
            <span>Compact List</span>
          </button>

          <button
            type="button"
            onClick={() => setVaultLayoutMode('kanban')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-[11px] font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              vaultLayoutMode === 'kanban'
                ? 'bg-white dark:bg-slate-855 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-150 dark:border-slate-800'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border border-transparent'
            }`}
            title="Interactive Kanban Swimlanes"
          >
            <Kanban className="w-3.5 h-3.5" />
            <span>Kanban Board</span>
          </button>
        </div>
      </div>

      {/* Bookmark Cards/List/Compact/Kanban dynamic layouts wrapper */}
      {vaultLayoutMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sortedItems.map(item => {
            const favicon = getFaviconUrl(item.url);
            const domain = getDomainName(item.url);

            return (
              <div
                key={item.id}
                className={`bg-white dark:bg-slate-905 border rounded-2xl p-5 flex flex-col justify-between gap-5 transition-all shadow-sm ${
                  item.isPinned 
                    ? 'border-emerald-400 dark:border-emerald-800 shadow-emerald-50/50 dark:shadow-none' 
                    : 'border-slate-202 dark:border-slate-850/80 hover:border-blue-400 dark:hover:border-slate-700'
                }`}
              >
                <div className="space-y-3">
                  {/* Meta header tag */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {item.isPinned && (
                        <span className="px-2 py-0.5 text-[9px] font-black rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-250/20 uppercase tracking-widest flex items-center gap-0.5">
                          <Pin className="w-2.5 h-2.5 fill-emerald-600 dark:fill-emerald-400 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>Pinned</span>
                        </span>
                      )}
                      <span className={`px-2.5 py-0.5 text-[10px] font-black rounded-full border tracking-wide inline-block ${getCategoryTheme(item.category)}`}>
                        {item.category}
                      </span>
                    </div>

                    {/* Clean item settings */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => togglePin(item.id, e)}
                        className={`p-1 rounded-lg transition-colors cursor-pointer ${
                          item.isPinned 
                            ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20' 
                            : 'text-slate-350 hover:text-emerald-600 hover:bg-slate-50 dark:hover:bg-slate-950'
                        }`}
                        title={item.isPinned ? "Unpin Bookmark" : "Pin Bookmark (Sorts to Top)"}
                      >
                        <Pin className={`w-4 h-4 ${item.isPinned ? 'fill-emerald-500 text-emerald-600' : ''}`} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => toggleFavorite(item.id, e)}
                        className="p-1 rounded-lg text-slate-350 hover:text-amber-500 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors cursor-pointer"
                        title="Favorite"
                      >
                        <Star className={`w-4 h-4 ${item.isFavorite ? 'fill-amber-400 text-amber-500' : ''}`} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(item)}
                        className="p-1 rounded-lg text-slate-350 hover:text-blue-500 hover:bg-slate-50 dark:hover:bg-slate-100/50 transition-colors cursor-pointer"
                        title="Edit"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1 rounded-lg text-slate-350 hover:text-red-500 hover:bg-slate-50 dark:hover:bg-slate-100/50 transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Favicon & Web page title */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center shrink-0">
                      <img
                        src={favicon}
                        alt=""
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const globeSvg = e.currentTarget.nextElementSibling;
                          if (globeSvg) globeSvg.classList.remove('hidden');
                        }}
                        className="w-6 h-6 object-contain"
                      />
                      <Globe className="w-5 h-5 text-slate-400 hidden" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="font-extrabold text-slate-900 dark:text-white text-base tracking-tight leading-tight truncate">
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-400 dark:text-slate-550 font-medium truncate">
                        {domain}
                      </p>
                    </div>
                  </div>

                  {/* Simplistic description text block */}
                  <p className="text-slate-600 dark:text-slate-400 text-xs font-semibold leading-relaxed line-clamp-2">
                    {item.description}
                  </p>

                  {/* Inner Personal review Notes snippet (if any exist) */}
                  {item.notes && (
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-900/60 rounded-xl">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 italic line-clamp-2">
                        💡 {item.notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Action buttons footer */}
                <div className="pt-3 border-t border-slate-101 dark:border-slate-850/60 flex items-center justify-between text-xs">
                  <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 shrink-0" />
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                  </span>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-black text-blue-600 hover:text-blue-500 dark:text-blue-400 inline-flex items-center gap-1"
                  >
                    <span>Go to Website</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            );
          })}

          {filteredItems.length === 0 && (
            <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/5">
              <AlertCircle className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <p className="text-slate-500 dark:text-slate-400 font-sans font-medium text-sm">
                Your vault feels a little empty!
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Click the button above to add website bookmarks.
              </p>
            </div>
          )}
        </div>
      )}

      {vaultLayoutMode === 'list' && (
        <div className="space-y-4">
          {sortedItems.map(item => {
            const favicon = getFaviconUrl(item.url);
            const domain = getDomainName(item.url);

            return (
              <div
                key={item.id}
                className={`bg-white dark:bg-slate-905 border rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 transition-all shadow-sm ${
                  item.isPinned 
                    ? 'border-emerald-400 dark:border-emerald-800 shadow-emerald-50/50 dark:shadow-none' 
                    : 'border-slate-202 dark:border-slate-850/80 hover:border-blue-400 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center shrink-0 mt-1">
                    <img
                      src={favicon}
                      alt=""
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const globeSvg = e.currentTarget.nextElementSibling;
                        if (globeSvg) globeSvg.classList.remove('hidden');
                      }}
                      className="w-7 h-7 object-contain"
                    />
                    <Globe className="w-6 h-6 text-slate-400 hidden" />
                  </div>
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 text-[10px] font-black rounded-full border tracking-wide inline-block ${getCategoryTheme(item.category)}`}>
                        {item.category}
                      </span>
                      {item.isPinned && (
                        <span className="px-2 py-0.5 text-[9px] font-black rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-250/20 uppercase tracking-widest flex items-center gap-0.5">
                          <Pin className="w-2.5 h-2.5 fill-emerald-600 dark:fill-emerald-400 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>Pinned</span>
                        </span>
                      )}
                    </div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-base tracking-tight leading-tight">
                      {item.title}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 text-xs font-semibold leading-relaxed">
                      {item.description}
                    </p>
                    {item.notes && (
                      <div className="p-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-900/60 rounded-xl inline-block">
                        <p className="text-[11px] text-slate-500 italic">
                          💡 Note: {item.notes}
                        </p>
                      </div>
                    )}
                    <p className="text-[10px] font-mono text-slate-400">
                      Saved &bull; {new Date(item.createdAt).toLocaleDateString()} &bull; {domain}
                    </p>
                  </div>
                </div>

                {/* Actions line */}
                <div className="flex md:flex-col items-center gap-3 w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800/80 justify-between md:justify-center shrink-0">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => togglePin(item.id, e)}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        item.isPinned 
                          ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20' 
                          : 'text-slate-350 hover:text-emerald-600 hover:bg-slate-50 dark:hover:bg-slate-950'
                      }`}
                      title={item.isPinned ? "Unpin Bookmark" : "Pin Bookmark"}
                    >
                      <Pin className={`w-4 h-4 ${item.isPinned ? 'fill-emerald-500 text-emerald-600' : ''}`} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(item.id, e)}
                      className="p-1.5 rounded-lg text-slate-350 hover:text-amber-500 hover:bg-slate-50/50 dark:hover:bg-slate-950 transition-colors cursor-pointer"
                      title="Favorite"
                    >
                      <Star className={`w-4 h-4 ${item.isFavorite ? 'fill-amber-400 text-amber-500' : ''}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(item)}
                      className="p-1.5 rounded-lg text-slate-350 hover:text-blue-500 hover:bg-slate-50/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Edit"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1.5 rounded-lg text-slate-350 hover:text-red-500 hover:bg-slate-50/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-black text-blue-600 hover:text-blue-500 dark:text-blue-400 inline-flex items-center gap-1 text-xs"
                  >
                    <span>Go to Website</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            );
          })}

          {filteredItems.length === 0 && (
            <div className="py-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/5">
              <AlertCircle className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <p className="text-slate-500 dark:text-slate-400 font-sans font-medium text-sm">
                Your vault feels empty here.
              </p>
            </div>
          )}
        </div>
      )}

      {vaultLayoutMode === 'compact' && (
        <div className="border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden bg-white dark:bg-slate-905 divide-y divide-slate-100 dark:divide-slate-850/60 shadow-sm">
          {sortedItems.map(item => {
            const favicon = getFaviconUrl(item.url);
            const domain = getDomainName(item.url);

            return (
              <div
                key={item.id}
                className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-6 h-6 rounded-md bg-slate-50 dark:bg-slate-900 flex items-center justify-center shrink-0 border border-slate-100 dark:border-slate-800">
                    <img
                      src={favicon}
                      alt=""
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const globeSvg = e.currentTarget.nextElementSibling;
                        if (globeSvg) globeSvg.classList.remove('hidden');
                      }}
                      className="w-4.5 h-4.5 object-contain shrink-0"
                    />
                    <Globe className="w-3.5 h-3.5 text-slate-400 hidden shrink-0" />
                  </div>
                  <div className="flex items-center gap-2 truncate flex-1">
                    <span className="font-extrabold text-slate-800 dark:text-white truncate">
                      {item.title}
                    </span>
                    <span className="text-slate-400 dark:text-slate-500 select-all font-mono text-[10px] hidden md:inline truncate max-w-xs">
                      ({domain})
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 text-[9px] font-black rounded-md shrink-0 border uppercase tracking-wider ${getCategoryTheme(item.category)}`}>
                    {item.category}
                  </span>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-50 dark:border-slate-800">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => togglePin(item.id, e)}
                      className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${item.isPinned ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-650'}`}
                      title={item.isPinned ? "Unpin" : "Pin Block"}
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => toggleFavorite(item.id, e)}
                      className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${item.isFavorite ? 'text-amber-500' : 'text-slate-300 dark:text-slate-650'}`}
                      title="Star favourite"
                    >
                      <Star className={`w-3.5 h-3.5 ${item.isFavorite ? 'fill-amber-450 text-amber-500' : ''}`} />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-300 dark:text-slate-600 hover:text-blue-500"
                      title="Edit"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-300 dark:text-slate-600 hover:text-red-550"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-500 hover:underline font-bold inline-flex items-center gap-0.5 text-[11px] shrink-0"
                  >
                    <span>Visit link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            );
          })}

          {filteredItems.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-xs">
              No matching bookmarks found.
            </div>
          )}
        </div>
      )}

      {vaultLayoutMode === 'kanban' && (
        <div className="flex gap-5 overflow-x-auto pb-6 pt-1 select-none">
          {categoryOptions.map(colCategory => {
            const laneItems = sortedItems.filter(item => item.category === colCategory);

            return (
              <div 
                key={colCategory}
                className="w-80 min-w-[320px] bg-slate-50/70 dark:bg-slate-950/40 rounded-2xl border border-slate-200/60 dark:border-slate-850 flex flex-col max-h-[640px] shrink-0 overflow-hidden"
              >
                {/* Lane Header */}
                <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-105 dark:border-slate-850/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 text-xs font-black rounded-lg border tracking-wide uppercase ${getCategoryTheme(colCategory)}`}>
                      {colCategory}
                    </span>
                    <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-450 dark:text-slate-500 font-bold px-2 py-0.5 rounded-md">
                      {laneItems.length}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setCategory(colCategory);
                      handleOpenAdd();
                    }}
                    className="p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-400 hover:text-blue-500 cursor-pointer"
                    title={`Add item to ${colCategory}`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Lane Cards container */}
                <div className="p-3.5 space-y-3.5 overflow-y-auto flex-1 custom-scrollbar min-h-[200px]">
                  {laneItems.map((item, idx) => {
                    const favicon = getFaviconUrl(item.url);
                    const domain = getDomainName(item.url);
                    
                    const currentCatIdx = categoryOptions.indexOf(item.category);
                    const canMoveLeft = currentCatIdx > 0;
                    const canMoveRight = currentCatIdx < categoryOptions.length - 1;

                    return (
                      <div
                        key={item.id}
                        className="bg-white dark:bg-slate-900 border border-slate-201 dark:border-slate-855 rounded-xl p-4 shadow-xs space-y-3 hover:shadow-md transition-all relative group text-left"
                      >
                        {/* Meta Pins & Settings */}
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1">
                            {item.isPinned && (
                              <span className="p-0.5 rounded bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400" title="Pinned">
                                <Pin className="w-3 h-3 fill-emerald-500" />
                              </span>
                            )}
                            {item.isFavorite && (
                              <span className="p-0.5 rounded bg-amber-50 dark:bg-amber-950/20 text-amber-500" title="Starred">
                                <Star className="w-3 h-3 fill-amber-400" />
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => toggleFavorite(item.id, e)}
                              type="button"
                              className="p-1 rounded text-slate-350 hover:text-amber-500 transition-colors cursor-pointer"
                            >
                              <Star className={`w-3.5 h-3.5 ${item.isFavorite ? 'fill-amber-400 text-amber-500' : ''}`} />
                            </button>
                            <button
                              onClick={() => handleOpenEdit(item)}
                              type="button"
                              className="p-1 rounded text-slate-350 hover:text-blue-500 transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              type="button"
                              className="p-1 rounded text-slate-350 hover:text-red-500 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Main Identity */}
                        <div className="flex items-start gap-2.5">
                          <div className="w-6 h-6 rounded bg-slate-50 dark:bg-slate-950 flex items-center justify-center shrink-0 border border-slate-100 dark:border-slate-800">
                            <img
                              src={favicon}
                              alt=""
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const globeSvg = e.currentTarget.nextElementSibling;
                                if (globeSvg) globeSvg.classList.remove('hidden');
                              }}
                              className="w-4 h-4 object-contain"
                            />
                            <Globe className="w-3.5 h-3.5 text-slate-400 hidden" />
                          </div>
                          <div className="min-w-0 flex-1 leading-normal">
                            <h4 className="font-extrabold text-[12px] text-slate-850 dark:text-white truncate">
                              {item.title}
                            </h4>
                            <span className="text-[10px] text-slate-400 block truncate font-mono">{domain}</span>
                          </div>
                        </div>

                        {/* Brief description */}
                        <p className="text-slate-550 dark:text-slate-400 text-[11px] leading-relaxed line-clamp-2 font-medium">
                          {item.description}
                        </p>

                        {/* Inline notes */}
                        {item.notes && (
                          <p className="text-[10px] text-slate-500 italic bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border border-slate-100 dark:border-slate-850/60 leading-normal">
                            💡 {item.notes}
                          </p>
                        )}

                        {/* Quick Movement Control Bar (Agile Shift Lanes) */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-850/60 flex items-center justify-between">
                          <button
                            disabled={!canMoveLeft}
                            onClick={() => moveItemCategory(item.id, categoryOptions[currentCatIdx - 1])}
                            className="p-1 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 rounded disabled:opacity-20 disabled:pointer-events-none transition-all cursor-pointer flex items-center justify-center text-slate-500"
                            title={`Move left to ${categoryOptions[currentCatIdx - 1]}`}
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>

                          <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">
                            Move Lane
                          </span>

                          <button
                            disabled={!canMoveRight}
                            onClick={() => moveItemCategory(item.id, categoryOptions[currentCatIdx + 1])}
                            className="p-1 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 rounded disabled:opacity-20 disabled:pointer-events-none transition-all cursor-pointer flex items-center justify-center text-slate-500"
                            title={`Move right to ${categoryOptions[currentCatIdx + 1]}`}
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {laneItems.length === 0 && (
                    <div className="py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/20 dark:bg-slate-950/25">
                      <span className="text-[11px] text-slate-400 font-sans font-medium block">Lane is empty</span>
                      <button
                        type="button"
                        onClick={() => {
                          setCategory(colCategory);
                          handleOpenAdd();
                        }}
                        className="text-[10px] text-blue-500 hover:underline font-bold mt-1 inline-block"
                      >
                        + Add item
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Super Simple Step-by-Step popup wizard dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-blue-100 dark:border-blue-900/30 w-full max-w-xl shadow-[0_24px_60px_-15px_rgba(0,0,0,0.30)] p-8 relative animate-in zoom-in-95 duration-200 overflow-hidden">
            
            {/* Background design elements for interactive/psychological delight */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100/30 dark:bg-blue-900/10 rounded-full blur-3xl -z-10 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-100/35 dark:bg-emerald-900/10 rounded-full blur-3xl -z-10 pointer-events-none" />

            {/* Header Dialog */}
            <div className="flex items-start justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-2xl">
                    <Bookmark className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-lg tracking-tight">
                      {editingItem ? '✏️ Edit Saved Link' : '✨ Add a Website Link'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium pb-1.5">
                      Save helpful websites, docs, or materials to access them from anywhere!
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-850 transition-all text-slate-405 hover:text-slate-600 dark:hover:text-white cursor-pointer border border-slate-100 dark:border-slate-800 shrink-0"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Premium, Friendly Progress Tracker (Psychologically reassuring for age 12-60) */}
            <div className="grid grid-cols-2 gap-3 mb-6 bg-slate-50 dark:bg-slate-950/40 p-2 rounded-2xl border border-slate-102 dark:border-slate-850">
              <div 
                className={`py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center gap-2.5 justify-center ${
                  currentStep === 1 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-slate-550 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850'
                }`}
                onClick={() => {
                  if (currentStep === 2) {
                    setCurrentStep(1);
                  }
                }}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                  currentStep === 1 ? 'bg-white text-blue-600' : 'bg-slate-200 dark:bg-slate-805 text-slate-600 dark:text-slate-350'
                }`}>
                  1
                </span>
                <span className="text-xs font-black tracking-tight">🌐 Link & Name</span>
              </div>

              <div 
                className={`py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center gap-2.5 justify-center ${
                  currentStep === 2 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-slate-550 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850'
                }`}
                onClick={() => {
                  if (currentStep === 1 && validateStep1()) {
                    setCurrentStep(2);
                  }
                }}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                  currentStep === 2 ? 'bg-white text-blue-600' : 'bg-slate-200 dark:bg-slate-805 text-slate-600 dark:text-slate-350'
                }`}>
                  2
                </span>
                <span className="text-xs font-black tracking-tight">📂 Folder & Memoirs</span>
              </div>
            </div>

            {/* Form Step flow */}
            <form onSubmit={handleFormSubmit} className="space-y-5">
              {formError && (
                <div className="flex items-center gap-2.5 p-4 bg-rose-50 text-rose-700 dark:bg-rose-955/20 dark:text-rose-300 text-xs font-semibold rounded-2xl border border-rose-100 dark:border-rose-900/30">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* STEP 1: Url & Name */}
              {currentStep === 1 && (
                <div className="space-y-4 animate-in slide-in-from-right-4 duration-150">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-605 dark:text-slate-300 block">
                      🔗 Website Address (URL) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                        <Globe className="w-4.5 h-4.5" />
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="example.com or https://mycoolsite.org"
                        value={url || ''}
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleNextStep();
                          }
                        }}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-sm font-semibold rounded-2xl outline-none focus:border-blue-505 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder-slate-400"
                        autoFocus
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      💡 Tip: Copy and paste the web link from your other browser tabs or type it in!
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-605 dark:text-slate-300 block">
                      🏷️ Website Name / Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Code Academy Tutorials, Chemistry Cheatsheet"
                      value={title || ''}
                      onChange={(e) => setTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleNextStep();
                        }
                      }}
                      className="w-full px-4 py-3 bg-slate-50/50 dark:bg-slate-955 border border-slate-202 dark:border-slate-800 text-slate-900 dark:text-white text-sm font-semibold rounded-2xl outline-none focus:border-blue-505 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder-slate-400"
                    />
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      💡 Tip: Use a friendly name so you can search it easily later.
                    </p>
                  </div>
                </div>
              )}

              {/* STEP 2: Description, Category, Notes & Favorites */}
              {currentStep === 2 && (
                <div className="space-y-4 animate-in slide-in-from-right-4 duration-150 max-h-[48vh] overflow-y-auto pr-1 select-none">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-605 dark:text-slate-300 block">
                        📂 Choose a Folder (Category)
                      </label>
                      <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-450 font-bold">Recommended</span>
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      Select where this link belongs to keep your dashboard clean & organized:
                    </p>
                    <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-850">
                      {categoryOptions.map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setCategory(category === cat ? '' : cat)}
                          className={`px-3 py-2 text-[11px] font-bold rounded-xl border text-center transition-all cursor-pointer ${
                            category === cat
                              ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-slate-800 dark:text-slate-300'
                          }`}
                        >
                          📂 {cat}
                        </button>
                      ))}
                    </div>
                    {category && (
                      <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                        Selected Folder: <span className="underline font-black">{category}</span>
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-605 dark:text-slate-300 block">
                      ✍️ Simple Description / Memories
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g., This web tool lets me design schemas easily. Visited frequently for system design homework!"
                      value={description || ''}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-sm font-semibold rounded-2xl outline-none focus:border-blue-505 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none placeholder-slate-400"
                      autoFocus
                    />
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      💡 Tip: Write a quick note why you bookmarked this. Your future self will thank you!
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-605 dark:text-slate-300 block">
                      📝 Key Commands / Quick Study Codes (Optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g., npm install package-name, key algorithms summary, password cheats or exam codes."
                      value={notes || ''}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-sm font-semibold rounded-2xl outline-none focus:border-blue-505 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none placeholder-slate-400"
                    />
                  </div>

                  <div className="p-3.5 bg-gradient-to-r from-amber-50 to-amber-50/20 dark:from-amber-950/20 dark:to-transparent rounded-2xl border border-amber-100/50 dark:border-amber-900/30 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-805 dark:text-slate-200 block">
                        ⭐️ Pin as a Favorite Website Link
                      </span>
                      <span className="text-[10px] text-slate-405 dark:text-slate-500 block">Keeps this link permanently at the very top of your list!</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsFavorite(prev => !prev)}
                      className={`px-4 py-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer flex items-center gap-1.5 ${
                        isFavorite
                          ? 'bg-amber-500 border-amber-600 text-white shadow-sm'
                          : 'bg-white hover:bg-slate-50 border-slate-202 text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300'
                      }`}
                    >
                      <Star className={`w-4 h-4 ${isFavorite ? 'fill-white text-white' : 'text-slate-400'}`} />
                      <span>{isFavorite ? 'Starred' : 'Unstarred'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Wizard Nav buttons on modal footer with absolute safety (Step 1 Next is type="button" to prevent submit) */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 mt-5">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="px-5 py-2.5 bg-slate-105 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 text-slate-700 font-extrabold rounded-xl text-xs transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Step 1</span>
                  </button>
                ) : (
                  <div />
                )}

                {currentStep < 2 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl text-xs shadow-md shadow-blue-500/20 hover:shadow-blue-500/35 hover:-translate-y-0.5 transition-all flex items-center gap-1 cursor-pointer ml-auto"
                  >
                    <span>Choose Category & Save (Step 2)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-xl text-xs shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/35 hover:-translate-y-0.5 transition-all flex items-center gap-1 cursor-pointer ml-auto"
                  >
                    <Check className="w-4.5 h-4.5" />
                    <span>{editingItem ? '🎉 Save Updates!' : '🚀 Add to Vault!'}</span>
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pop-up Category Manager Dialog Modal */}
      {isCategoryModalOpen && (
        <div 
          className="fixed inset-0 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100"
          style={{ backgroundColor: '#81864A', color: '#000000' }}
        >
          {/* Backdrop wrapper (Child 1 of backdrop/Selector 10 target) */}
          <div className="absolute inset-0 z-0">
            <div></div>
            <div style={{ color: '#ffffff' }} className="hidden"></div>
          </div>

          {/* Modal body card container (Child 2 of backdrop/Selector 5 target) */}
          <div 
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-202 dark:border-slate-800 w-full max-w-md shadow-2xl p-6 relative animate-in zoom-in-95 duration-150 z-10" 
            style={{ backgroundColor: '#ffffff' }}
          >
            
            {/* Modal header details (Child 1 of card/Selector 2 target) */}
            <div 
              className="flex items-center justify-between border-b pb-3 mb-4 rounded-xl p-3"
              style={{ backgroundColor: '#81864A' }}
            >
              {/* Target wrapper for Selector 9 */}
              <div className="w-full">
                <div className="w-full">
                  <div className="flex items-center justify-between gap-3 w-full">
                    {/* Header Left (Settings button / Selector 7 target value) */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsCategoryModalOpen(false);
                        setCategoryError('');
                        setEditingCategoryName(null);
                      }}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer"
                      style={{ color: '#ffffff', backgroundColor: '#488c00' }}
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Close</span>
                    </button>

                    {/* Header Right Content Details (Selector 6 and 8 targets) */}
                    <div className="flex flex-col items-end">
                      <h4 className="text-right">
                        <span style={{ color: '#ffffff', fontSize: '20px' }} className="font-extrabold tracking-tight">
                          Manage Categories
                        </span>
                      </h4>
                      <span 
                        style={{ backgroundColor: '#0689da' }} 
                        className="text-[10px] text-white px-2 py-0.5 rounded-md font-bold mt-1"
                      >
                        Configuration Panel
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* List of current categories inside a modular simple list with scroll (Child 2 of card/Selector 4 target) */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 mb-5">
              {categoryOptions.map(cat => {
                const isUnderEdit = editingCategoryName === cat;

                return (
                  <div 
                    key={cat} 
                    className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850/60"
                  >
                    {isUnderEdit ? (
                      <div className="flex items-center gap-1.5 w-full mr-2">
                        <input
                          type="text"
                          value={editingCategoryInput || ''}
                          onChange={(e) => setEditingCategoryInput(e.target.value)}
                          className="flex-1 px-2.5 py-1 text-xs border border-blue-400 bg-white dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white font-bold outline-none"
                          placeholder="e.g. Code Tools"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveRenameCategory(cat);
                            } else if (e.key === 'Escape') {
                              setEditingCategoryName(null);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveRenameCategory(cat)}
                          className="p-1 bg-emerald-100 hover:bg-emerald-250 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-350 rounded-lg transition-colors cursor-pointer"
                          title="Save category rename"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCategoryName(null)}
                          className="p-1 bg-slate-100 hover:bg-slate-205 text-slate-801 dark:bg-slate-800 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
                          title="Cancel edit"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 truncate">
                          <div className="flex-1 truncate">
                            <h4 className="truncate">
                              <span 
                                style={{ fontSize: '22px' }} 
                                className="font-extrabold text-slate-805 dark:text-white"
                              >
                                📁 {cat}
                              </span>
                            </h4>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartRenameCategory(cat)}
                            className="p-1 text-slate-400 hover:text-blue-500 rounded-md hover:bg-white dark:hover:bg-slate-900 transition-colors cursor-pointer"
                            title="Edit / Rename category"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat)}
                            className="p-1 text-slate-400 hover:text-red-500 rounded-md hover:bg-white dark:hover:bg-slate-900 transition-colors cursor-pointer"
                            title="Delete category"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Simple Create folder/category input (Child 3 of card/Selector 3 target) */}
            <div className="border-t pt-4 border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-black text-slate-800 dark:text-white mb-2 uppercase tracking-wide">
                Create New Category
              </h4>
              <form onSubmit={handleCreateCategory} className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. System Design, Interview Preparation"
                  value={newCategoryInput || ''}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  className="flex-grow px-3 py-2 border border-slate-202 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-xs font-bold rounded-xl outline-none focus:border-blue-500 text-slate-900 dark:text-white"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-620 hover:bg-blue-550 text-white font-black rounded-xl text-xs transition-colors cursor-pointer shrink-0"
                >
                  Create
                </button>
              </form>
            </div>

            {/* Close action (Child 4 of card) */}
            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsCategoryModalOpen(false);
                  setCategoryError('');
                  setEditingCategoryName(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-205 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer dark:bg-slate-800 dark:text-slate-300"
              >
                Close Manager
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Custom item delete confirmation modal */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[60] animate-in fade-in duration-100">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900 dark:text-white leading-none">
                  Delete Bookmark?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                  Are you sure you want to permanently delete <strong className="text-slate-800 dark:text-slate-200">"{itemToDelete.title}"</strong>? This action cannot be undone.
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-350 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteItem}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl text-xs transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom category delete confirmation modal */}
      {categoryToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[60] animate-in fade-in duration-100">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900 dark:text-white leading-none">
                  Delete Category?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                  Are you sure you want to delete the category <span className="font-extrabold text-slate-800 dark:text-slate-200">"{categoryToDelete}"</span>? Any resources assigned to it will move automatically to <span className="font-extrabold text-slate-800 dark:text-slate-200">"{categoryOptions.find(c => c !== categoryToDelete)}"</span>.
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-350 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteCategory}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl text-xs transition-colors cursor-pointer"
              >
                Delete Category
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
