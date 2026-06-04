import React, { useState } from 'react';
import { 
  Plus, Sun, Moon, Sparkles, LogOut, Check, CloudLightning, RefreshCw, Menu, X,
  GraduationCap, Code, Database, Cloud, Cpu, Layers, Atom, Terminal, Globe,
  Network, BrainCircuit, Compass, Award, Coffee, Lock, FileText, Server, Landmark,
  Lightbulb, ClipboardCheck, Video, BookOpen, HelpCircle, Laptop
} from 'lucide-react';
import { Topic, CustomUser } from '../types';

interface SidebarProps {
  topics: Topic[];
  activeView: 'dashboard' | string; // 'dashboard' or topicId
  onSelectView: (view: 'dashboard' | string) => void;
  onAddTopic: (topic: Omit<Topic, 'id' | 'createdAt'>) => void;
  currentUser: CustomUser;
  onLogout: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  syncStatus: 'saving' | 'saved' | 'offline' | 'syncing' | 'reconnecting';
}

const AVAILABLE_ICONS = [
  { name: 'graduation-cap', icon: GraduationCap },
  { name: 'code', icon: Code },
  { name: 'database', icon: Database },
  { name: 'cloud', icon: Cloud },
  { name: 'cpu', icon: Cpu },
  { name: 'layers', icon: Layers },
  { name: 'atom', icon: Atom },
  { name: 'terminal', icon: Terminal },
  { name: 'globe', icon: Globe },
  { name: 'brain', icon: BrainCircuit },
  { name: 'sparkle', icon: Sparkles },
  { name: 'compass', icon: Compass },
  { name: 'coffee', icon: Coffee },
  { name: 'lock', icon: Lock },
  { name: 'pdf', icon: FileText },
  { name: 'server', icon: Server },
  { name: 'landmark', icon: Landmark }
];

const ACCENT_COLORS = [
  { name: 'Olive Drab', hex: '#556b2f' },
  { name: 'Olive Green', hex: '#6b8243' },
  { name: 'Forest Green', hex: '#3b5220' },
  { name: 'Sage Green', hex: '#7a8c6a' },
  { name: 'Emerald', hex: '#059669' },
  { name: 'Lime Mint', hex: '#84cc16' },
  { name: 'Earthy Amber', hex: '#cd853f' },
  { name: 'Thick Bronze', hex: '#826c36' }
];

export function Sidebar({
  topics,
  activeView,
  onSelectView,
  onAddTopic,
  currentUser,
  onLogout,
  isDarkMode,
  onToggleTheme,
  syncStatus
}: SidebarProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // New Topic details form state
  const [topicName, setTopicName] = useState('');
  const [topicDesc, setTopicDesc] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('code');
  const [selectedColor, setSelectedColor] = useState('#556b2f');

  const handleSubmitTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicName.trim()) return;

    onAddTopic({
      name: topicName,
      description: topicDesc,
      icon: selectedIcon,
      color: selectedColor
    });

    // Reset states
    setTopicName('');
    setTopicDesc('');
    setSelectedIcon('code');
    setSelectedColor('#556b2f');
    setModalOpen(false);
  };

  const currentIconDetails = AVAILABLE_ICONS.find(i => i.name === selectedIcon) || AVAILABLE_ICONS[0];

  return (
    <>
      {/* Mobile Top Navigation Head */}
      <div className="flex md:hidden items-center justify-between px-4 py-3 bg-white dark:bg-slate-950 border-b border-slate-250/70 dark:border-slate-800 z-40 transition-colors">
        <div 
          onClick={() => onSelectView('dashboard')}
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          title="Go to Home Dashboard"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold shrink-0">
            <Laptop className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-slate-850 dark:text-white text-base leading-none font-sans">
              CodeXshelf
            </h1>
            <span className="text-[10px] font-mono tracking-wider text-slate-400">YOUR LEARNING VAULT</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={onToggleTheme}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {isDarkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
          </button>
          <button 
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Left Drawer (Desktop) & Floating Panel (Mobile Drawer overlay) */}
      <div className={`
        fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-900/95 border-r border-slate-200 dark:border-slate-800 flex flex-col z-50 transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:flex
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Header brand details */}
        <div className="p-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-800/40">
          <div 
            onClick={() => {
              onSelectView('dashboard');
              setMobileMenuOpen(false);
            }}
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            title="Go to Home Dashboard"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-600 dark:text-blue-450 font-bold shrink-0">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-slate-800 dark:text-white text-lg leading-none font-sans tracking-tight">
                CodeXshelf
              </h1>
              <span className="text-[9px] font-mono tracking-wider text-slate-400 block mt-1">YOUR LEARNING VAULT</span>
            </div>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Sync Status bar details */}
        <div className="px-6 py-2 bg-slate-50 dark:bg-slate-850/50 border-b border-slate-200/85 dark:border-slate-800/50 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
          <div className="flex items-center gap-2">
            {syncStatus === 'saving' && (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                <span className="font-semibold text-blue-600 dark:text-blue-400">Saving...</span>
              </>
            )}
            {syncStatus === 'saved' && (
              <>
                <Cloud className="w-3.5 h-3.5 text-emerald-500" />
                <span className="font-semibold text-slate-705 dark:text-slate-350">Saved to Cloud</span>
              </>
            )}
            {syncStatus === 'offline' && (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="font-semibold text-amber-600 dark:text-amber-500">Offline</span>
              </>
            )}
            {syncStatus === 'syncing' && (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-indigo-505 animate-spin" />
                <span className="font-semibold text-indigo-650 dark:text-indigo-400">Syncing...</span>
              </>
            )}
            {syncStatus === 'reconnecting' && (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-amber-505 animate-spin" />
                <span className="font-semibold text-amber-600 dark:text-amber-450">Reconnecting...</span>
              </>
            )}
          </div>
          <span className="text-[9px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold">REALTIME</span>
        </div>

        {/* Navigation topics */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-7">
          <div className="space-y-1.5">
            <button
              onClick={() => {
                onSelectView('dashboard');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold tracking-wide transition-all duration-150 text-left border-r-3
                ${activeView === 'dashboard'
                  ? 'bg-blue-50/50 dark:bg-blue-950/10 text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-500 font-bold' 
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/30 hover:text-slate-900 dark:hover:text-white'
                }
              `}
            >
              <Compass className="w-4.5 h-4.5" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => {
                onSelectView('vault');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold tracking-wide transition-all duration-150 text-left border-r-3
                ${activeView === 'vault'
                  ? 'bg-blue-50/50 dark:bg-blue-950/10 text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-500 font-bold' 
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/30 hover:text-slate-900 dark:hover:text-white'
                }
              `}
            >
              <BookOpen className="w-4.5 h-4.5" />
              <span>Knowledge Vault</span>
            </button>

            <button
              onClick={() => {
                onSelectView('pdfs');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold tracking-wide transition-all duration-150 text-left border-r-3
                ${activeView === 'pdfs'
                  ? 'bg-blue-50/50 dark:bg-blue-950/10 text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-500 font-bold' 
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/30 hover:text-slate-900 dark:hover:text-white'
                }
              `}
            >
              <FileText className="w-4.5 h-4.5" />
              <span>PDF Reference Links</span>
            </button>

            <button
              onClick={() => {
                onSelectView('videos');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold tracking-wide transition-all duration-150 text-left border-r-3
                ${activeView === 'videos'
                  ? 'bg-blue-50/50 dark:bg-blue-950/10 text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-500 font-bold' 
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/30 hover:text-slate-900 dark:hover:text-white'
                }
              `}
            >
              <Video className="w-4.5 h-4.5" />
              <span>Videos</span>
            </button>

            <button
              onClick={() => {
                onSelectView('concepts');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold tracking-wide transition-all duration-150 text-left border-r-3
                ${activeView === 'concepts'
                  ? 'bg-blue-50/50 dark:bg-blue-950/10 text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-500 font-bold' 
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/30 hover:text-slate-900 dark:hover:text-white'
                }
              `}
            >
              <Lightbulb className="w-4.5 h-4.5" />
              <span>Concepts</span>
            </button>

            <button
              onClick={() => {
                onSelectView('trackers');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold tracking-wide transition-all duration-150 text-left border-r-3
                ${activeView === 'trackers'
                  ? 'bg-blue-50/50 dark:bg-blue-950/10 text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-500 font-bold' 
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/30 hover:text-slate-900 dark:hover:text-white'
                }
              `}
            >
              <ClipboardCheck className="w-4.5 h-4.5" />
              <span>Topic Tracker</span>
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between px-3">
              <span className="text-[11px] font-bold font-mono tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                Topicshelf
              </span>
              <button 
                onClick={() => setModalOpen(true)}
                className="p-1 rounded hover:bg-slate-105 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                title="Create a topic"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              {topics.map(topic => {
                // Find matching icon component
                const item = AVAILABLE_ICONS.find(i => i.name === topic.icon) || AVAILABLE_ICONS[0];
                const TopicIcon = item.icon;
                const isSelected = activeView === topic.id;

                return (
                  <button
                    key={topic.id}
                    onClick={() => {
                      onSelectView(topic.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all duration-150 text-left group border-r-3
                      ${isSelected
                        ? 'bg-blue-50/50 dark:bg-blue-950/10 text-blue-600 dark:text-blue-400 font-semibold border-blue-600 dark:border-blue-500'
                        : 'border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/30 hover:text-slate-900 dark:hover:text-white'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div 
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors shadow-2xs"
                        style={{ backgroundColor: `${topic.color}15`, color: topic.color }}
                      >
                        <TopicIcon className="w-4.5 h-4.5" />
                      </div>
                      <span className="truncate">{topic.name}</span>
                    </div>
                  </button>
                );
              })}

              {topics.length === 0 && (
                <p className="text-xs text-gray-400 px-3 py-2 italic font-sans">
                  No topics added yet.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer controls: dynamic profile and theme toggle */}
        <div className="p-4 border-t border-slate-205 dark:border-slate-800/40 bg-slate-50/50 dark:bg-slate-900/50 space-y-4">
          <button
            onClick={() => setModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 font-medium text-xs tracking-wider uppercase font-mono rounded-xl transition-all"
          >
            <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>New topic</span>
          </button>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <img 
                src={currentUser.picture || "https://api.dicebear.com/7.x/adventurer/svg?seed=Rish"}
                alt={currentUser.name}
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-full ring-2 ring-blue-500/10 object-cover shrink-0 bg-blue-500/10"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                  {currentUser.name}
                </p>
                <p className="text-[10px] text-slate-400 truncate font-mono">
                  {currentUser.email}
                </p>
              </div>
            </div>
            <button 
              onClick={onLogout}
              className="p-2 shrink-0 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-400 hover:text-red-600 transition-all duration-150"
              title="Sign Out"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
          </div>

          <div className="flex items-center justify-between pt-1 text-xs">
            <span className="text-slate-400 font-mono text-[10px] uppercase">Theme controls</span>
            <button
              onClick={onToggleTheme}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-650 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-slate-300 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer font-medium"
            >
              {isDarkMode ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-blue-500" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-slate-500" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Background Mask click overlays (Mobile Menu) */}
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-gray-900/50 dark:bg-black/70 backdrop-blur-xs z-40 md:hidden"
        />
      )}

      {/* Creation Modal Window: matching Topic Specifications exactly */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop screen mask */}
          <div onClick={() => setModalOpen(false)} className="absolute inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-xs" />

          {/* Dialog Container */}
          <div className="relative w-full max-w-xl bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 shadow-2xl p-6 overflow-y-auto max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold font-sans text-xl text-gray-900 dark:text-white">
                Create a topic
              </h3>
              <button 
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitTopic} className="space-y-6">
              <div>
                <label className="block text-xs font-bold tracking-wider text-gray-400 dark:text-gray-500 uppercase mb-2 font-mono">
                  Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. JavaScript"
                  value={topicName}
                  onChange={(e) => setTopicName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-250 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-500 transition-all font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-bold tracking-wider text-gray-400 dark:text-gray-500 uppercase mb-2 font-mono">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="What this topic covers"
                  value={topicDesc}
                  onChange={(e) => setTopicDesc(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-250 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-500 transition-all font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-bold tracking-wider text-gray-400 dark:text-gray-500 uppercase mb-3 font-mono">
                  Icon
                </label>
                <div className="grid grid-cols-6 sm:grid-cols-9 gap-3">
                  {AVAILABLE_ICONS.map(item => {
                    const IconComponent = item.icon;
                    const isSelected = selectedIcon === item.name;

                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => setSelectedIcon(item.name)}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer border
                          ${isSelected 
                            ? 'bg-amber-500/10 border-amber-500 text-amber-500 font-bold scale-105' 
                            : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-750 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/30'
                          }
                        `}
                        title={item.name}
                      >
                        <IconComponent className="w-5 h-5" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold tracking-wider text-gray-400 dark:text-gray-500 uppercase mb-3 font-mono">
                  Accent Color
                </label>
                <div className="flex flex-wrap gap-3">
                  {ACCENT_COLORS.map(color => {
                    const isSelected = selectedColor === color.hex;

                    return (
                      <button
                        key={color.name}
                        type="button"
                        onClick={() => setSelectedColor(color.hex)}
                        className={`w-9 h-9 rounded-full relative flex items-center justify-center border-2 transition-all hover:scale-105 cursor-pointer shadow-xs
                          ${isSelected ? 'border-gray-950 dark:border-white scale-110' : 'border-transparent'}
                        `}
                        style={{ backgroundColor: color.hex }}
                        title={color.name}
                      >
                        {isSelected && (
                          <Check className="w-4 h-4 text-white drop-shadow-md" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-150 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-gray-500 hover:text-gray-800 dark:hover:text-white hover:bg-gray-55/70 dark:hover:bg-gray-800 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-950 font-semibold shadow-md active:scale-98 transition-all"
                >
                  Create topic
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
