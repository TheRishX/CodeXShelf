import React, { useState } from 'react';
import { 
  Search, Plus, Trash2, ExternalLink, Star, Filter, 
  BookOpen, Clock, AlertCircle, Edit3, X, Check, Globe,
  ArrowRight, ArrowLeft, Heart, Bookmark, Settings, Loader2, Pin
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

  // Simple step-by-step popup wizard state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VaultItem | null>(null);
  const [currentStep, setCurrentStep] = useState(1); // 1, 2, or 3

  // Simple modular bookmark form states
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(categoryOptions[0] || 'Development');
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
    setCategory(categoryOptions[0] || 'Development');
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
    setDescription(item.description);
    setCategory(item.category);
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
    if (!description.trim()) {
      setFormError('Please enter a brief description of what this website provides.');
      return false;
    }
    setFormError('');
    return true;
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (validateStep1()) setCurrentStep(2);
    } else if (currentStep === 2) {
      if (validateStep2()) setCurrentStep(3);
    }
  };

  const handlePrevStep = () => {
    setFormError('');
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!title.trim() || !url.trim() || !description.trim()) {
      setFormError('Please complete the prior steps first.');
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

    if (editingItem) {
      // Update item
      const updatedList = vaultItems.map(item => {
        if (item.id === editingItem.id) {
          return {
            ...item,
            title: title.trim(),
            description: description.trim(),
            url: formattedUrl,
            category,
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
        description: description.trim(),
        url: formattedUrl,
        category,
        notes: notes.trim() || undefined,
        isFavorite,
        tags: [category.toLowerCase()],
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

      {/* Bookmark Cards list */}
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

      {/* Super Simple Step-by-Step popup wizard dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-202 dark:border-slate-800 w-full max-w-lg shadow-2xl p-6 relative animate-in zoom-in-95 duration-150">
            
            {/* Header Dialog */}
            <div className="flex items-center justify-between border-b pb-3 mb-5 border-slate-100 dark:border-slate-805">
              <div className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  {editingItem ? 'Update Bookmark' : 'Add Website Bookmark'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Step progress indicators */}
            <div className="flex items-center justify-center gap-1.5 mb-6">
              {[1, 2, 3].map(stepNum => (
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
                  {stepNum < 3 && (
                    <div className={`w-12 h-0.5 mx-1 transition-colors ${currentStep > stepNum ? 'bg-blue-500' : 'bg-slate-100 dark:bg-slate-800'}`} />
                  )}
                </div>
              ))}
            </div>

            {/* Form Step flow */}
            <form onSubmit={handleSaveItem} className="space-y-5">
              {formError && (
                <div className="flex items-center gap-2 p-3.5 bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-300 text-xs font-semibold rounded-2xl border border-rose-105 dark:border-rose-900/30">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* STEP 1: Url & Name */}
              {currentStep === 1 && (
                <div className="space-y-4 animate-in slide-in-from-right-3 duration-100">
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-slate-800 dark:text-white">
                      1. Copy & Paste Website Link (URL) *
                    </h4>
                    <p className="text-xs text-slate-400 font-medium">Any web address like google.com or github.com</p>
                    <input
                      type="text"
                      required
                      placeholder="example.com"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-slate-205 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-sm font-semibold outline-none focus:border-blue-500 text-slate-900 dark:text-white"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-slate-800 dark:text-white">
                      2. What name should we show? *
                    </h4>
                    <p className="text-xs text-slate-400 font-medium">Simple title to recognize it at a glance</p>
                    <input
                      type="text"
                      required
                      placeholder="e.g. My Coding Notes"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-slate-205 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-955 text-sm font-semibold outline-none focus:border-blue-500 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* STEP 2: Description & Category */}
              {currentStep === 2 && (
                <div className="space-y-4 animate-in slide-in-from-right-3 duration-100">
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-slate-800 dark:text-white">
                      3. What is this website for? *
                    </h4>
                    <p className="text-xs text-slate-400 font-medium">Write a simple summary so you remember later</p>
                    <textarea
                      required
                      rows={2}
                      placeholder="This has great videos explaining databases and microservices..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-slate-205 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-sm font-semibold outline-none focus:border-blue-500 text-slate-900 dark:text-white resize-none"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-1 border-t border-slate-50 dark:border-slate-850 pt-3">
                    <h4 className="text-sm font-black text-slate-805 dark:text-white mb-2">
                      4. Pick Category Folder
                    </h4>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                      {categoryOptions.map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setCategory(cat)}
                          className={`px-3 py-2 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                            category === cat
                              ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-350'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: Optional Study Notes & Favorite toggle option */}
              {currentStep === 3 && (
                <div className="space-y-4 animate-in slide-in-from-right-3 duration-100">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-black text-slate-805 dark:text-white">
                        5. Add Learning Notes (Optional)
                      </h4>
                      <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-400 font-bold uppercase">Optional</span>
                    </div>
                    <textarea
                      rows={2}
                      placeholder="Add key commands, checklists, passwords, or study codes..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-slate-205 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-sm font-semibold outline-none focus:border-blue-500 text-slate-900 dark:text-white resize-none"
                      autoFocus
                    />
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-950/20 rounded-2xl border border-slate-100 dark:border-slate-850/60 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-xs font-black text-slate-800 dark:text-white block">
                        Pin to Favorites
                      </span>
                      <span className="text-[10px] text-slate-400 block font-medium">Keep it saved at the top of your list!</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsFavorite(prev => !prev)}
                      className={`px-4 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer flex items-center gap-1.5 ${
                        isFavorite
                          ? 'bg-amber-500 border-amber-600 text-white'
                          : 'bg-white border-slate-200 text-slate-600 hover:text-slate-800 dark:bg-slate-950 dark:border-slate-800/80 dark:text-slate-350'
                      }`}
                    >
                      <Star className={`w-4 h-4 ${isFavorite ? 'fill-white text-white' : 'text-slate-400'}`} />
                      <span>{isFavorite ? 'Starred' : 'No Star'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Wizard Nav buttons on modal foot */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-705 font-black rounded-xl text-xs transition-colors flex items-center gap-1 cursor-pointer dark:bg-slate-800 dark:text-slate-300"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                ) : (
                  <div />
                )}

                {currentStep < 3 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-505 text-white font-black rounded-xl text-xs transition-all flex items-center gap-1 cursor-pointer ml-auto"
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
                    <span>{editingItem ? 'Save Bookmark' : 'Add to Vault'}</span>
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
                          value={editingCategoryInput}
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
                  value={newCategoryInput}
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
