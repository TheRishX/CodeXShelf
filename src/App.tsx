import React, { useState, useEffect } from 'react';
import { AuthModal } from './components/AuthModal';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { TopicDetail } from './components/TopicDetail';
import { SubtopicView } from './components/SubtopicView';
import { AllConceptsView } from './components/AllConceptsView';
import { AllTrackersView } from './components/AllTrackersView';
import { AllVideosView } from './components/AllVideosView';
import { AllNotesView } from './components/AllNotesView';
import { AllCodingView } from './components/AllCodingView';
import { AllInterviewsView } from './components/AllInterviewsView';
import { AllQuizzesView } from './components/AllQuizzesView';
import { AllPdfsView } from './components/AllPdfsView';
import { KnowledgeVaultView } from './components/KnowledgeVaultView';
import { Topic, Subtopic, DatabaseState, CustomUser } from './types';
import { initialData } from './initialData';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const LOCAL_STORAGE_DB_KEY = 'codexshelf_database_state_v1';
const LOCAL_STORAGE_USER_KEY = 'codexshelf_active_user_v1';
const LOCAL_STORAGE_THEME_KEY = 'codexshelf_theme_preference_v1';
const LOCAL_STORAGE_LAST_SYNCED_KEY = 'codexshelf_last_synced_at_v1';

import { 
  Database, 
  Download, 
  Upload, 
  RefreshCw, 
  Trash2, 
  X, 
  ShieldCheck, 
  AlertTriangle, 
  HelpCircle,
  Clock,
  Cloud,
  CheckCircle2,
  HardDrive
} from 'lucide-react';

function unionMergeLists<T extends { id: string; createdAt?: string; updatedAt?: string }>(
  localList: T[] = [],
  cloudList: T[] = []
): T[] {
  const localMap = new Map(localList.map(item => [item.id, item]));
  const cloudMap = new Map(cloudList.map(item => [item.id, item]));

  const allIds = new Set([...localMap.keys(), ...cloudMap.keys()]);
  const merged: T[] = [];

  for (const id of allIds) {
    const localItem = localMap.get(id);
    const cloudItem = cloudMap.get(id);

    if (localItem && cloudItem) {
      const localTime = new Date(localItem.updatedAt || localItem.createdAt || 0).getTime();
      const cloudTime = new Date(cloudItem.updatedAt || cloudItem.createdAt || 0).getTime();
      if (localTime >= cloudTime) {
        merged.push(localItem);
      } else {
        merged.push(cloudItem);
      }
    } else if (localItem) {
      merged.push(localItem);
    } else if (cloudItem) {
      merged.push(cloudItem);
    }
  }

  // Sort chronologically
  return merged.sort((a, b) => {
    const tA = new Date(a.createdAt || 0).getTime();
    const tB = new Date(b.createdAt || 0).getTime();
    return tA - tB;
  });
}

function unionMergeDatabaseStates(local: DatabaseState, cloud: DatabaseState): DatabaseState {
  return {
    topics: unionMergeLists(local.topics || [], cloud.topics || []),
    subtopics: unionMergeLists(local.subtopics || [], cloud.subtopics || []),
    pdfs: unionMergeLists(local.pdfs || [], cloud.pdfs || []),
    notes: unionMergeLists(local.notes || [], cloud.notes || []),
    videos: unionMergeLists(local.videos || [], cloud.videos || []),
    concepts: unionMergeLists(local.concepts || [], cloud.concepts || []),
    coding: unionMergeLists(local.coding || [], cloud.coding || []),
    interviews: unionMergeLists(local.interviews || [], cloud.interviews || []),
    quizzes: unionMergeLists(local.quizzes || [], cloud.quizzes || []),
    trackers: unionMergeLists(local.trackers || [], cloud.trackers || []),
    vaultItems: unionMergeLists(local.vaultItems || [], cloud.vaultItems || []),
    vaultCategories: Array.from(new Set([
      ...(local.vaultCategories || []),
      ...(cloud.vaultCategories || [])
    ]))
  };
}

export default function App() {
  // Theme state representation
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // Authenticated student state
  const [currentUser, setCurrentUser] = useState<CustomUser>({
    email: 'therishx@gmail.com',
    name: 'Rish',
    picture: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Rish',
    isAuthenticated: false
  });

  // Database State representation
  const [dbState, setDbState] = useState<DatabaseState>(initialData);

  // Synchronizing progress indices
  const [syncing, setSyncing] = useState<boolean>(false);
  const [offlineMode, setOfflineMode] = useState<boolean>(false);
  const [syncToast, setSyncToast] = useState<{
    show: boolean;
    status: 'loading' | 'success' | 'error';
    message: string;
  }>({ show: false, status: 'success', message: '' });

  // View Router state
  // Can be: 'dashboard'
  // Or: 'topicId' (e.g. 'javascript')
  // Or: 'topicId::subtopicId' (e.g. 'javascript::closures')
  const [activeView, setActiveView] = useState<string>('dashboard');

  // Monitor Firebase Auth session state change
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const loggedUser = {
          email: user.email || '',
          name: user.displayName || 'Rish',
          picture: user.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(user.displayName || 'Rish')}`,
          isAuthenticated: true,
          uid: user.uid
        };
        setCurrentUser(loggedUser);
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(loggedUser));
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync Management Modal State
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);

  // Load user session and theme settings on launch
  useEffect(() => {
    // 1. Theme load
    const savedTheme = localStorage.getItem(LOCAL_STORAGE_THEME_KEY);
    const prefersDark = savedTheme !== 'light'; // default to dark if not set to light
    setIsDarkMode(prefersDark);
    if (prefersDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // 2. Authentication load (sandbox fallback default check)
    const savedUser = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser) as CustomUser;
        if (parsedUser.isAuthenticated) {
          setCurrentUser(parsedUser);
        }
      } catch (e) {
        console.error("Failed to parse saved user", e);
      }
    }

    // 3. Load DB state from local storage on mount so everything is retained
    const savedDb = localStorage.getItem(LOCAL_STORAGE_DB_KEY);
    if (savedDb) {
      try {
        const parsed = JSON.parse(savedDb) as DatabaseState;
        if (parsed && typeof parsed === 'object') {
          setDbState(parsed);
        }
      } catch (e) {
        console.warn("Failed to load saved local DB");
      }
    }
  }, []);

  // Execute advanced cloud database synchronization operations
  const executeVaultSyncOperation = async (operationType: 'merge' | 'pull' | 'push' | 'clear') => {
    if (!currentUser.uid && operationType !== 'clear') {
      setSyncToast({
        show: true,
        status: 'error',
        message: 'Could not resolve user credentials. Please sign in to sync.'
      });
      return;
    }

    setSyncing(true);
    setSyncToast({
      show: true,
      status: 'loading',
      message: operationType === 'merge' ? 'Performing bi-directional merge integrity review...' :
               operationType === 'pull' ? 'Securely retrieving learning database from cloud...' :
               operationType === 'push' ? 'Publishing current local schema to cloud servers...' :
               'Resetting browser database cache memory...'
    });

    try {
      if (operationType === 'clear') {
        localStorage.removeItem(LOCAL_STORAGE_DB_KEY);
        localStorage.removeItem(LOCAL_STORAGE_LAST_SYNCED_KEY);
        setDbState(initialData);
        setSyncToast({
          show: true,
          status: 'success',
          message: 'Local browser cache wiped clean. Reloaded study baseline.'
        });
        setIsSyncModalOpen(false);
        setSyncing(false);
        return;
      }

      if (currentUser.uid) {
        const userDocRef = doc(db, 'user_states', currentUser.uid);

        if (operationType === 'push') {
          const finalSyncTime = new Date().toISOString();
          await setDoc(userDocRef, {
            userId: currentUser.uid,
            state: dbState,
            updatedAt: finalSyncTime
          });
          localStorage.setItem(LOCAL_STORAGE_LAST_SYNCED_KEY, finalSyncTime);
          setOfflineMode(false);
          setSyncToast({
            show: true,
            status: 'success',
            message: 'Local study work published online. Overwrote server segments.'
          });
          setIsSyncModalOpen(false);
          setSyncing(false);
          return;
        }

        // Retrieve cloud document for Pull and Merge
        const docSnap = await getDoc(userDocRef);

        if (operationType === 'pull') {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data && data.state) {
              const pulledState = data.state as DatabaseState;
              setDbState(pulledState);
              localStorage.setItem(LOCAL_STORAGE_DB_KEY, JSON.stringify(pulledState));
              
              const nowCheck = new Date().toISOString();
              localStorage.setItem(LOCAL_STORAGE_LAST_SYNCED_KEY, nowCheck);
              setOfflineMode(false);

              const totalCount = 
                (pulledState.topics?.length || 0) + 
                (pulledState.pdfs?.length || 0) + 
                (pulledState.videos?.length || 0) +
                (pulledState.notes?.length || 0);

              setSyncToast({
                show: true,
                status: 'success',
                message: `Successfully loaded ${totalCount} nodes from secure cloud servers.`
              });
            } else {
              setSyncToast({
                show: true,
                status: 'error',
                message: 'No online data segments located inside database.'
              });
            }
          } else {
            setSyncToast({
              show: true,
              status: 'error',
              message: 'No online backup files discovered. Publish state to save backup.'
            });
          }
          setIsSyncModalOpen(false);
          setSyncing(false);
          return;
        }

        if (operationType === 'merge') {
          let mergedState: DatabaseState;
          if (docSnap.exists()) {
            const cloudData = docSnap.data();
            if (cloudData && cloudData.state) {
              // Bidirectional merge that protects both databases
              mergedState = unionMergeDatabaseStates(dbState, cloudData.state as DatabaseState);
            } else {
              mergedState = dbState;
            }
          } else {
            mergedState = dbState;
          }

          setDbState(mergedState);
          localStorage.setItem(LOCAL_STORAGE_DB_KEY, JSON.stringify(mergedState));

          const finalSyncTime = new Date().toISOString();
          await setDoc(userDocRef, {
            userId: currentUser.uid,
            state: mergedState,
            updatedAt: finalSyncTime
          });
          localStorage.setItem(LOCAL_STORAGE_LAST_SYNCED_KEY, finalSyncTime);
          setOfflineMode(false);

          const pdfDiff = mergedState.pdfs.length - dbState.pdfs.length;
          const noteDiff = mergedState.notes.length - dbState.notes.length;
          const videoDiff = mergedState.videos.length - dbState.videos.length;

          const parts = [];
          if (pdfDiff > 0) parts.push(`${pdfDiff} PDFs`);
          if (noteDiff > 0) parts.push(`${noteDiff} notes`);
          if (videoDiff > 0) parts.push(`${videoDiff} videos`);

          const msg = parts.length > 0
            ? `Sync merge successful! Retrieved ${parts.join(', ')} from online system.`
            : 'Unification completed! All device indices are fully in dynamic alignment.';

          setSyncToast({
            show: true,
            status: 'success',
            message: msg
          });
          setIsSyncModalOpen(false);
          setSyncing(false);
          return;
        }
      }
    } catch (e) {
      console.warn("Failed manual sync flow", e);
      setSyncToast({
        show: true,
        status: 'error',
        message: 'Could not connect to Firebase sync nodes. Retaining local backup.'
      });
    } finally {
      setSyncing(false);
      setTimeout(() => {
        setSyncToast(prev => ({ ...prev, show: false }));
      }, 5000);
    }
  };

  // Root state updater hook - Strict Offline-first local updates (Never auto-sync on edits/presses)
  const handleUpdateDatabase = (updates: Partial<DatabaseState>) => {
    const nextState = { ...dbState, ...updates };
    setDbState(nextState);
    
    // Save to local device storage safely
    localStorage.setItem(LOCAL_STORAGE_DB_KEY, JSON.stringify(nextState));
  };

  // Handle Authentication callbacks
  const handleLoginSuccess = async (user: CustomUser) => {
    setCurrentUser(user);
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(user));

    // Quiet first-time login retrieve (only pulls on login action so session begins with cloud state)
    if (user.uid) {
      setSyncing(true);
      try {
        const userDocRef = doc(db, 'user_states', user.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const cloudData = docSnap.data();
          if (cloudData && cloudData.state) {
            const nextCloudState = cloudData.state as DatabaseState;
            setDbState(nextCloudState);
            localStorage.setItem(LOCAL_STORAGE_DB_KEY, JSON.stringify(nextCloudState));
            localStorage.setItem(LOCAL_STORAGE_LAST_SYNCED_KEY, new Date().toISOString());
            setOfflineMode(false);
            setSyncToast({
              show: true,
              status: 'success',
              message: 'Authorized successfully! Downloaded cloud database.'
            });
          }
        }
      } catch (e) {
        console.warn("Silent login pull skipped", e);
      } finally {
        setSyncing(false);
        setTimeout(() => {
          setSyncToast(prev => ({ ...prev, show: false }));
        }, 4000);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn("Failed to sign out Firebase user:", e);
    }
    const emptyUser: CustomUser = {
      email: '',
      name: '',
      isAuthenticated: false
    };
    setCurrentUser(emptyUser);
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    localStorage.removeItem(LOCAL_STORAGE_DB_KEY);
    localStorage.removeItem(LOCAL_STORAGE_LAST_SYNCED_KEY);
    setSyncToast({ show: false, status: 'success', message: '' });
    setDbState(initialData); // reset to demo baseline
    setActiveView('dashboard');
  };

  // Handle Dark / Light Theme switching
  const handleToggleTheme = () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    localStorage.setItem(LOCAL_STORAGE_THEME_KEY, nextMode ? 'dark' : 'light');
    if (nextMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Actions: Topic mutations
  const handleAddTopic = (newTopicData: Omit<Topic, 'id' | 'createdAt'>) => {
    const textId = newTopicData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const newTopic: Topic = {
      ...newTopicData,
      id: `${textId}-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    handleUpdateDatabase({ topics: [...dbState.topics, newTopic] });
    setActiveView(newTopic.id); // auto redirect to detailed view
  };

  const handleUpdateTopic = (topicId: string, name: string, description: string) => {
    const updated = dbState.topics.map(t => t.id === topicId ? { ...t, name, description } : t);
    handleUpdateDatabase({ topics: updated });
  };

  const handleDeleteTopic = (topicId: string) => {
    const cleanTopics = dbState.topics.filter(t => t.id !== topicId);
    // Cascade delete subtopics and resources
    const cleanSubtopics = dbState.subtopics.filter(s => s.topicId !== topicId);
    const subtopicIds = dbState.subtopics.filter(s => s.topicId === topicId).map(s => s.id);
    
    const cleanPdfs = dbState.pdfs.filter(p => !subtopicIds.includes(p.subtopicId));
    const cleanNotes = dbState.notes.filter(n => !subtopicIds.includes(n.subtopicId));
    const cleanVideos = dbState.videos.filter(v => !subtopicIds.includes(v.subtopicId));
    const cleanConcepts = dbState.concepts.filter(c => !subtopicIds.includes(c.subtopicId));
    const cleanCoding = dbState.coding.filter(co => !subtopicIds.includes(co.subtopicId));
    const cleanInterviews = dbState.interviews.filter(i => !subtopicIds.includes(i.subtopicId));
    const cleanQuizzes = dbState.quizzes.filter(q => !subtopicIds.includes(q.subtopicId));

    handleUpdateDatabase({
      topics: cleanTopics,
      subtopics: cleanSubtopics,
      pdfs: cleanPdfs,
      notes: cleanNotes,
      videos: cleanVideos,
      concepts: cleanConcepts,
      coding: cleanCoding,
      interviews: cleanInterviews,
      quizzes: cleanQuizzes
    });
    setActiveView('dashboard');
  };

  // Actions: Subtopic mutations
  const handleAddSubtopic = (topicId: string, name: string, description: string) => {
    const cleanId = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const newSub: Subtopic = {
      id: `${cleanId}-${Date.now()}`,
      topicId,
      name,
      description,
      createdAt: new Date().toISOString()
    };
    handleUpdateDatabase({ subtopics: [...dbState.subtopics, newSub] });
  };

  const handleDeleteSubtopic = (subtopicId: string) => {
    const cleanSubtopics = dbState.subtopics.filter(s => s.id !== subtopicId);
    
    const cleanPdfs = dbState.pdfs.filter(p => p.subtopicId !== subtopicId);
    const cleanNotes = dbState.notes.filter(n => n.subtopicId !== subtopicId);
    const cleanVideos = dbState.videos.filter(v => v.subtopicId !== subtopicId);
    const cleanConcepts = dbState.concepts.filter(c => c.subtopicId !== subtopicId);
    const cleanCoding = dbState.coding.filter(co => co.subtopicId !== subtopicId);
    const cleanInterviews = dbState.interviews.filter(i => i.subtopicId !== subtopicId);
    const cleanQuizzes = dbState.quizzes.filter(q => q.subtopicId !== subtopicId);

    handleUpdateDatabase({
      subtopics: cleanSubtopics,
      pdfs: cleanPdfs,
      notes: cleanNotes,
      videos: cleanVideos,
      concepts: cleanConcepts,
      coding: cleanCoding,
      interviews: cleanInterviews,
      quizzes: cleanQuizzes
    });
  };

  // Routing parsing helpers
  const handleOpenSubtopic = (topicId: string, subtopicId: string) => {
    setActiveView(`${topicId}::${subtopicId}`);
  };

  // Content rendering based on current state route
  const renderWorkspace = () => {
    if (activeView === 'dashboard') {
      return (
        <Dashboard
          dbState={dbState}
          onSelectView={setActiveView}
          onOpenSubtopic={handleOpenSubtopic}
          onUpdateDb={handleUpdateDatabase}
          onTriggerNewTopic={() => {
            // Find Sidebar and trigger its modal
            const element = document.querySelector('[title="Create a topic"]') as HTMLButtonElement;
            if (element) element.click();
          }}
        />
      );
    }

    if (activeView === 'concepts') {
      return (
        <AllConceptsView
          dbState={dbState}
          onOpenSubtopic={handleOpenSubtopic}
        />
      );
    }

    if (activeView === 'trackers') {
      return (
        <AllTrackersView
          dbState={dbState}
          onOpenSubtopic={handleOpenSubtopic}
          onUpdateDb={handleUpdateDatabase}
        />
      );
    }

    if (activeView === 'videos') {
      return (
        <AllVideosView
          dbState={dbState}
          onOpenSubtopic={handleOpenSubtopic}
          onUpdateDb={handleUpdateDatabase}
        />
      );
    }

    if (activeView === 'notes') {
      return (
        <AllNotesView
          dbState={dbState}
          onOpenSubtopic={handleOpenSubtopic}
          onUpdateDb={handleUpdateDatabase}
        />
      );
    }

    if (activeView === 'coding') {
      return (
        <AllCodingView
          dbState={dbState}
          onOpenSubtopic={handleOpenSubtopic}
          onUpdateDb={handleUpdateDatabase}
        />
      );
    }

    if (activeView === 'interviews') {
      return (
        <AllInterviewsView
          dbState={dbState}
          onOpenSubtopic={handleOpenSubtopic}
          onUpdateDb={handleUpdateDatabase}
        />
      );
    }

    if (activeView === 'quizzes') {
      return (
        <AllQuizzesView
          dbState={dbState}
          onOpenSubtopic={handleOpenSubtopic}
          onUpdateDb={handleUpdateDatabase}
        />
      );
    }

    if (activeView === 'pdfs') {
      return (
        <AllPdfsView
          dbState={dbState}
          onOpenSubtopic={handleOpenSubtopic}
          onUpdateDb={handleUpdateDatabase}
        />
      );
    }

    if (activeView === 'vault') {
      return (
        <KnowledgeVaultView
          dbState={dbState}
          onUpdateDb={handleUpdateDatabase}
        />
      );
    }

    // Check if subtopic detailed route
    if (activeView.includes('::')) {
      const [topicId, subtopicId] = activeView.split('::');
      const topicObj = dbState.topics.find(t => t.id === topicId);
      const subtopicObj = dbState.subtopics.find(s => s.id === subtopicId);

      if (topicObj && subtopicObj) {
        return (
          <SubtopicView
            topic={topicObj}
            subtopic={subtopicObj}
            dbState={dbState}
            onBack={() => setActiveView(topicId)}
            onUpdateDb={handleUpdateDatabase}
            isDarkMode={isDarkMode}
            onToggleTheme={handleToggleTheme}
            onDeleteSubtopic={handleDeleteSubtopic}
          />
        );
      }
    }

    // Fallback: Selected single Topic Details View
    const topicObj = dbState.topics.find(t => t.id === activeView);
    if (topicObj) {
      const matchingSubtopics = dbState.subtopics.filter(s => s.topicId === activeView);

      return (
        <TopicDetail
          topic={topicObj}
          subtopics={matchingSubtopics}
          onBack={() => setActiveView('dashboard')}
          onOpenSubtopic={(subId) => handleOpenSubtopic(topicObj.id, subId)}
          onAddSubtopic={(name, description) => handleAddSubtopic(topicObj.id, name, description)}
          onUpdateTopic={(name, description) => handleUpdateTopic(topicObj.id, name, description)}
          onDeleteTopic={() => handleDeleteTopic(topicObj.id)}
          onDeleteSubtopic={handleDeleteSubtopic}
        />
      );
    }

    // Default Router Fail Safe fallback
    return <div className="p-8 text-center text-gray-400">View segment not found in vault schemas.</div>;
  };

  // Main login gate screen
  if (!currentUser.isAuthenticated) {
    return (
      <AuthModal 
        onLoginSuccess={handleLoginSuccess}
        userEmail="therishx@gmail.com"
      />
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300 overflow-hidden font-sans">
      
      {/* 1. Collapsible/Responsive Left Navigation Bar */}
      <Sidebar
        topics={dbState.topics}
        activeView={activeView.split('::')[0]} // highlight parent topic if viewing its subtopic
        onSelectView={setActiveView}
        onAddTopic={handleAddTopic}
        currentUser={currentUser}
        onLogout={handleLogout}
        isDarkMode={isDarkMode}
        onToggleTheme={handleToggleTheme}
        syncing={syncing}
        onManualSync={() => setIsSyncModalOpen(true)}
        offlineMode={offlineMode}
      />

      {/* 2. Main study content canvas scroll board */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-8 lg:px-12 py-8 md:py-12 relative">
        <div className="max-w-5xl mx-auto">
          {renderWorkspace()}
        </div>
      </main>

      {/* Sync Control Dial-In Center Modal */}
      {isSyncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            onClick={() => setIsSyncModalOpen(false)} 
            className="absolute inset-0 bg-slate-900/60 dark:bg-black/85 backdrop-blur-xs transition-opacity" 
          />
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 md:p-8 shadow-2xl animate-in zoom-in-95 duration-150 overflow-y-auto max-h-[90vh]">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800/50 mb-6 font-sans">
              <div>
                <h3 className="font-sans font-bold text-lg md:text-xl text-slate-900 dark:text-white flex items-center gap-2">
                  <Cloud className="w-5.5 h-5.5 text-blue-550 dark:text-blue-400 animate-pulse" />
                  Cloud Sync Center & Cache Hub
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Synchronize study topics, workbook PDFs, quizzes, notes, and activity logs across your devices securely.
                </p>
              </div>
              <button 
                onClick={() => setIsSyncModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Sync Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-50/75 dark:bg-slate-950/40 p-4 rounded-2xl flex items-center gap-3 border border-slate-150 dark:border-slate-800/60">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Database className="w-4.5 h-4.5" />
                </div>
                <div>
                  <p className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Indexed Work</p>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {dbState.topics?.length || 0} Topics • {dbState.pdfs?.length || 0} PDFs • {dbState.notes?.length || 0} Notes
                  </p>
                </div>
              </div>

              <div className="bg-slate-50/75 dark:bg-slate-950/40 p-4 rounded-2xl flex items-center gap-3 border border-slate-150 dark:border-slate-800/60">
                <div className="w-9 h-9 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                  <Clock className="w-4.5 h-4.5" />
                </div>
                <div>
                  <p className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Last Check-in</p>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {localStorage.getItem(LOCAL_STORAGE_LAST_SYNCED_KEY) 
                      ? new Date(localStorage.getItem(LOCAL_STORAGE_LAST_SYNCED_KEY)!).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) 
                      : 'Never Sync Checked'}
                  </p>
                </div>
              </div>
            </div>

            {/* Warning segment if companion sync stale */}
            <div className="p-4 bg-amber-500/5 border border-amber-500/20 text-amber-600 dark:text-amber-450 rounded-2xl flex items-start gap-3 text-xs mb-6 leading-relaxed">
              <AlertTriangle className="w-4.5 h-4.5 shrink-0 mt-0.5 text-amber-500" />
              <div>
                <span className="font-bold">Multi-device safety reminder:</span> Opening a tablet or companion device with older local storage can contaminate your data if auto-merged. Use <span className="font-bold text-blue-600 dark:text-blue-400">Force Pull Cloud</span> first on secondary devices to download your pristine data cleanly.
              </div>
            </div>

            {/* Sync actions cards list */}
            <div className="space-y-4 font-sans">
              {/* Card 1: Pull Cloud */}
              <button
                onClick={() => executeVaultSyncOperation('pull')}
                disabled={syncing}
                className="w-full text-left p-4 rounded-2xl border border-blue-100 hover:border-blue-400/50 dark:border-slate-800 dark:hover:border-blue-500/30 bg-blue-500/[0.02] hover:bg-blue-500/[0.04] transition-all flex items-center gap-4 cursor-pointer hover:-translate-y-0.5 duration-150 group disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-550/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
                  <Download className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-xs text-slate-800 dark:text-slate-200">Force Pull Cloud Data</p>
                    <span className="text-[9px] uppercase font-bold text-blue-500 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">SAFEST ON TABLET</span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Completely replace your tablet's local browser memory with the pristine backup on the cloud. Eliminates stale local caches.
                  </p>
                </div>
              </button>

              {/* Card 2: Run Bidirectional Merge */}
              <button
                onClick={() => executeVaultSyncOperation('merge')}
                disabled={syncing}
                className="w-full text-left p-4 rounded-2xl border border-violet-100 hover:border-violet-400/50 dark:border-slate-800 dark:hover:border-violet-500/30 bg-violet-500/[0.01]/[0.01] hover:bg-violet-500/[0.03] transition-all flex items-center gap-4 cursor-pointer hover:-translate-y-0.5 duration-150 group disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-xs text-slate-800 dark:text-slate-200">Smart Bidirectional Merge</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Combines local cache files and cloud segments together. Ideal when multiple devices have unique new links added offline. Keeps everything!
                  </p>
                </div>
              </button>

              {/* Card 3: Push Local */}
              <button
                onClick={() => executeVaultSyncOperation('push')}
                disabled={syncing}
                className="w-full text-left p-4 rounded-2xl border border-emerald-100 hover:border-emerald-400/50 dark:border-slate-800 dark:hover:border-emerald-500/30 bg-emerald-500/[0.01]/[0.02] hover:bg-emerald-500/[0.04] transition-all flex items-center gap-4 cursor-pointer hover:-translate-y-0.5 duration-150 group disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-550/10 text-emerald-600 dark:text-emerald-450 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-xs text-slate-800 dark:text-slate-200">Force Push Device State</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Overwrites your online cloud database using this device's current memory. Ensures your current device state becomes the global master.
                  </p>
                </div>
              </button>

              {/* Card 4: Clear Device Cache */}
              <button
                onClick={() => executeVaultSyncOperation('clear')}
                disabled={syncing}
                className="w-full text-left p-4 rounded-2xl border border-rose-100 hover:border-rose-400/50 dark:border-slate-800 dark:hover:border-rose-500/30 bg-rose-500/[0.01]/[0.02] hover:bg-rose-500/[0.05] transition-all flex items-center gap-4 cursor-pointer hover:-translate-y-0.5 duration-150 group disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-605 dark:text-rose-400 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-xs text-slate-800 dark:text-slate-200">Reset Local Device Cache</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Wipes local browser storage clean and resets workspace to default template. Discharges caches safely. (Does not touch your cloud data).
                  </p>
                </div>
              </button>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800/60 flex justify-end">
              <button
                type="button"
                onClick={() => setIsSyncModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-350 dark:hover:bg-slate-755 transition-colors cursor-pointer"
              >
                Close Panel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Professional Top-Right Sync Toast Banner */}
      {syncToast.show && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom-5 duration-300 max-w-sm">
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-blue-50 dark:bg-blue-950/30 text-blue-600">
            {syncToast.status === 'loading' ? (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : syncToast.status === 'success' ? (
              <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="h-4 w-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
              {syncToast.status === 'loading' ? 'Syncing Vault...' : syncToast.status === 'success' ? 'Vault Synced' : 'Sync Alert'}
            </p>
            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">
              {syncToast.message}
            </p>
          </div>
          <button 
            onClick={() => setSyncToast(prev => ({ ...prev, show: false }))}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg shrink-0"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

    </div>
  );
}
