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

function mergeItemLists<T extends { id: string; createdAt: string; updatedAt?: string }>(
  localList: T[] = [],
  cloudList: T[] = [],
  lastSyncedAt: number
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
      const cloudTime = new Date(cloudItem.updatedAt || cloudItem.createdAt || 0).getTime();
      if (lastSyncedAt === 0 || cloudTime > lastSyncedAt) {
        merged.push(cloudItem);
      }
    }
  }

  return merged.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
}

function mergeDatabaseStates(local: DatabaseState, cloud: DatabaseState, lastSyncedAt: number): DatabaseState {
  return {
    topics: mergeItemLists(local.topics || [], cloud.topics || [], lastSyncedAt),
    subtopics: mergeItemLists(local.subtopics || [], cloud.subtopics || [], lastSyncedAt),
    pdfs: mergeItemLists(local.pdfs || [], cloud.pdfs || [], lastSyncedAt),
    notes: mergeItemLists(local.notes || [], cloud.notes || [], lastSyncedAt),
    videos: mergeItemLists(local.videos || [], cloud.videos || [], lastSyncedAt),
    concepts: mergeItemLists(local.concepts || [], cloud.concepts || [], lastSyncedAt),
    coding: mergeItemLists(local.coding || [], cloud.coding || [], lastSyncedAt),
    interviews: mergeItemLists(local.interviews || [], cloud.interviews || [], lastSyncedAt),
    quizzes: mergeItemLists(local.quizzes || [], cloud.quizzes || [], lastSyncedAt),
    trackers: mergeItemLists(local.trackers || [], cloud.trackers || [], lastSyncedAt),
    vaultItems: mergeItemLists(local.vaultItems || [], cloud.vaultItems || [], lastSyncedAt),
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
  }, []);

  // Fetch / Sync with cloud database when current user logs in
  useEffect(() => {
    if (currentUser.isAuthenticated) {
      fetchCloudDatabase();
    }
  }, [currentUser.isAuthenticated, currentUser.uid]);

  // Read current database from Firestore or fall back to node-express backend
  const fetchCloudDatabase = async () => {
    setSyncing(true);
    setSyncToast({
      show: true,
      status: 'loading',
      message: 'Fetching latest changes from study network...'
    });
    try {
      if (currentUser.uid) {
        const userDocRef = doc(db, 'user_states', currentUser.uid);
        const docSnap = await getDoc(userDocRef);
        
        const lastSyncedAtStr = localStorage.getItem(LOCAL_STORAGE_LAST_SYNCED_KEY);
        const lastSyncedAt = lastSyncedAtStr ? new Date(lastSyncedAtStr).getTime() : 0;
        
        let mergedState: DatabaseState;
        let isFirstInit = false;

        if (docSnap.exists()) {
          const cloudData = docSnap.data();
          if (cloudData && cloudData.state) {
            // Smart bi-directional merge!
            mergedState = mergeDatabaseStates(dbState, cloudData.state as DatabaseState, lastSyncedAt);
          } else {
            mergedState = dbState;
          }
        } else {
          isFirstInit = true;
          mergedState = dbState;
        }

        // Save merged state locally
        setDbState(mergedState);
        localStorage.setItem(LOCAL_STORAGE_DB_KEY, JSON.stringify(mergedState));

        const finalSyncTime = new Date().toISOString();
        // Sync back merged state to cloud so both is in sync
        await setDoc(userDocRef, {
          userId: currentUser.uid,
          state: mergedState,
          updatedAt: finalSyncTime
        });

        localStorage.setItem(LOCAL_STORAGE_LAST_SYNCED_KEY, finalSyncTime);
        setOfflineMode(false);
        setSyncing(false);

        // Highlight merges
        if (isFirstInit) {
          setSyncToast({
            show: true,
            status: 'success',
            message: 'First-time online vault initialized successfully!'
          });
        } else {
          const pdfDiff = mergedState.pdfs.length - dbState.pdfs.length;
          const noteDiff = mergedState.notes.length - dbState.notes.length;
          const videoDiff = mergedState.videos.length - dbState.videos.length;
          const trackerDiff = ((mergedState.trackers || []).length) - ((dbState.trackers || []).length);

          const parts = [];
          if (pdfDiff > 0) parts.push(`${pdfDiff} PDFs`);
          if (noteDiff > 0) parts.push(`${noteDiff} notes`);
          if (videoDiff > 0) parts.push(`${videoDiff} videos`);
          if (trackerDiff > 0) parts.push(`${trackerDiff} trackers`);

          const msg = parts.length > 0 
            ? `Successfully synchronized & merged ${parts.join(', ')} from the cloud!`
            : 'All topics, PDF workbooks, videos, notes, and progress links are fully up to date!';

          setSyncToast({
            show: true,
            status: 'success',
            message: msg
          });
        }

        setTimeout(() => {
          setSyncToast(prev => ({ ...prev, show: false }));
        }, 4050);
        return;
      }

      // --- Sandbox Simulator Backup API Fallback ---
      const response = await fetch('/api/data');
      const resJSON = await response.json();
      
      if (resJSON.success && resJSON.data) {
        setDbState(resJSON.data);
        localStorage.setItem(LOCAL_STORAGE_DB_KEY, JSON.stringify(resJSON.data));
        setOfflineMode(false);
        setSyncToast({
          show: true,
          status: 'success',
          message: 'Local fallback database loaded cleanly.'
        });
      } else {
        const localCopy = localStorage.getItem(LOCAL_STORAGE_DB_KEY);
        if (localCopy) {
          setDbState(JSON.parse(localCopy));
        } else {
          setDbState(initialData);
        }
        setOfflineMode(true);
        setSyncToast({
          show: true,
          status: 'error',
          message: 'Unable to connect to cloud services. Running in sandbox mode.'
        });
      }
    } catch (e) {
      console.warn("Failed to fetch cloud db. Retaining offline mode caches.", e);
      const localCopy = localStorage.getItem(LOCAL_STORAGE_DB_KEY);
      if (localCopy) {
        setDbState(JSON.parse(localCopy));
      }
      setOfflineMode(true);
      setSyncToast({
        show: true,
        status: 'error',
        message: 'Network offline. Your changes are safely saved in local cache.'
      });
    } finally {
      setSyncing(false);
      setTimeout(() => {
        setSyncToast(prev => ({ ...prev, show: false }));
      }, 5000);
    }
  };

  // Synchronize state down to server (Writes state to Firestore / fallback disk db)
  const syncToCloud = async (newState: DatabaseState) => {
    setSyncing(true);
    setSyncToast({
      show: true,
      status: 'loading',
      message: 'Automative background syncing to network...'
    });
    try {
      if (currentUser.uid) {
        const userDocRef = doc(db, 'user_states', currentUser.uid);
        const finalSyncTime = new Date().toISOString();
        await setDoc(userDocRef, {
          userId: currentUser.uid,
          state: newState,
          updatedAt: finalSyncTime
        });
        localStorage.setItem(LOCAL_STORAGE_LAST_SYNCED_KEY, finalSyncTime);
        setOfflineMode(false);
        setSyncing(false);
        setSyncToast({
          show: true,
          status: 'success',
          message: 'Cloud background check completed successfully.'
        });
        setTimeout(() => {
          setSyncToast(prev => ({ ...prev, show: false }));
        }, 3000);
        return;
      }

      // --- Sandbox Simulator Backup API Fallback ---
      const response = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newState)
      });
      const resJSON = await response.json();
      if (resJSON.success) {
        setOfflineMode(false);
      } else {
        setOfflineMode(true);
      }
    } catch (e) {
      console.warn("Synchronization batch failed. Client remains in local cache mode.", e);
      setOfflineMode(true);
    } finally {
      setSyncing(false);
      setTimeout(() => {
        setSyncToast(prev => ({ ...prev, show: false }));
      }, 3050);
    }
  };

  // Root state updater hook
  const handleUpdateDatabase = (updates: Partial<DatabaseState>) => {
    const nextState = { ...dbState, ...updates };
    setDbState(nextState);
    
    // Save to local
    localStorage.setItem(LOCAL_STORAGE_DB_KEY, JSON.stringify(nextState));

    // Push cloud sync
    if (currentUser.isAuthenticated) {
      syncToCloud(nextState);
    }
  };

  // Handle Authentication callbacks
  const handleLoginSuccess = (user: CustomUser) => {
    setCurrentUser(user);
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(user));
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
        onManualSync={fetchCloudDatabase}
        offlineMode={offlineMode}
      />

      {/* 2. Main study content canvas scroll board */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-8 lg:px-12 py-8 md:py-12 relative">
        <div className="max-w-5xl mx-auto">
          {renderWorkspace()}
        </div>
      </main>

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
