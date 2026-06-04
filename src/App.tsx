import React, { useState, useEffect, useRef } from 'react';
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
import { AllAssignmentsView } from './components/AllAssignmentsView';
import { Topic, Subtopic, DatabaseState, CustomUser } from './types';
import { initialData } from './initialData';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

const LOCAL_STORAGE_DB_KEY = 'codexshelf_database_state_v1';
const LOCAL_STORAGE_USER_KEY = 'codexshelf_active_user_v1';
const LOCAL_STORAGE_THEME_KEY = 'codexshelf_theme_preference_v1';

import { 
  Laptop, BookOpen
} from 'lucide-react';

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

  // Real-time synchronization state (Google Docs style)
  const [syncStatus, setSyncStatus] = useState<'saving' | 'saved' | 'offline' | 'syncing' | 'reconnecting'>('saved');

  // React Refs to manage race conditions, typing/save debounces, and state streams
  const latestStateRef = useRef<DatabaseState>(dbState);
  const lastSavedStateStrRef = useRef<string>('');
  const saveTimeoutRef = useRef<any>(null);

  // Keep latest state ref in sync
  useEffect(() => {
    latestStateRef.current = dbState;
  }, [dbState]);

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

  // Load user session and theme settings on launch, plus restore temporary cache
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

    // 3. Temporary cache pre-load (overwritten instantly when cloud doc snap returns)
    const savedDb = localStorage.getItem(LOCAL_STORAGE_DB_KEY);
    if (savedDb) {
      try {
        const parsed = JSON.parse(savedDb) as DatabaseState;
        if (parsed && typeof parsed === 'object') {
          setDbState(parsed);
          latestStateRef.current = parsed;
        }
      } catch (e) {
        console.warn("Failed to load temporary local DB cache");
      }
    }
  }, []);

  // Monitor window connectivity to display "Offline" or "Reconnecting" states instantly
  useEffect(() => {
    const handleOnline = () => {
      setSyncStatus('reconnecting');
      setTimeout(() => {
        setSyncStatus('saved');
      }, 1500);
    };

    const handleOffline = () => {
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    if (!navigator.onLine) {
      setSyncStatus('offline');
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Firestore Real-Time Listener (Google Docs style auto-unification across tabs, browsers, and devices)
  useEffect(() => {
    if (!currentUser.isAuthenticated || !currentUser.uid) {
      return;
    }

    setSyncStatus('syncing');
    const userDocRef = doc(db, 'user_states', currentUser.uid);

    const unsubscribe = onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const docData = snapshot.data();
        if (docData && docData.state) {
          const freshCloudState = docData.state as DatabaseState;
          const freshCloudStr = JSON.stringify(freshCloudState);

          const currentLocalStr = JSON.stringify(latestStateRef.current);
          
          // Only update memory if the incoming state is physically different
          // AND different from our last completed local save to prevent loopback
          if (freshCloudStr !== currentLocalStr && freshCloudStr !== lastSavedStateStrRef.current) {
            setDbState(freshCloudState);
            latestStateRef.current = freshCloudState;
            localStorage.setItem(LOCAL_STORAGE_DB_KEY, freshCloudStr);
          }
        }
        setSyncStatus(navigator.onLine ? 'saved' : 'offline');
      } else {
        // Document does not exist (first-time login): automatically seed the cloud document
        setSyncStatus('saving');
        setDoc(userDocRef, {
          userId: currentUser.uid,
          state: latestStateRef.current,
          updatedAt: new Date().toISOString()
        })
        .then(() => {
          lastSavedStateStrRef.current = JSON.stringify(latestStateRef.current);
          setSyncStatus(navigator.onLine ? 'saved' : 'offline');
        })
        .catch((err) => {
          console.error("Failed to seed initial user schema in Firestore:", err);
          setSyncStatus(navigator.onLine ? 'saved' : 'offline');
        });
      }
    }, (error) => {
      console.error("Firestore onSnapshot subscription failed:", error);
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser.isAuthenticated, currentUser.uid]);

  // Root state updater hook - Updates the UI instantly (Optimistic UI) and debounces the server save background task
  const handleUpdateDatabase = (updates: Partial<DatabaseState>) => {
    const nextState = { ...latestStateRef.current, ...updates };
    setDbState(nextState);
    latestStateRef.current = nextState;
    
    // Maintain local storage merely as an offline buffer / speed optimizer
    localStorage.setItem(LOCAL_STORAGE_DB_KEY, JSON.stringify(nextState));

    // Update sync status indicator
    if (navigator.onLine) {
      setSyncStatus('saving');
    } else {
      setSyncStatus('offline');
    }

    // Debounce the save task (800ms) to bundle typing strokes or quick successive clicks
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      if (!currentUser.uid) return;

      try {
        const userDocRef = doc(db, 'user_states', currentUser.uid);
        await setDoc(userDocRef, {
          userId: currentUser.uid,
          state: nextState,
          updatedAt: new Date().toISOString()
        });

        lastSavedStateStrRef.current = JSON.stringify(nextState);
        if (navigator.onLine) {
          setSyncStatus('saved');
        }
      } catch (e) {
        console.warn("Background auto-save failed (changes are queued offline):", e);
        if (!navigator.onLine) {
          setSyncStatus('offline');
        } else {
          setSyncStatus('saved'); // let Firestore underlying layer handle offline propagation
        }
      }
    }, 800);
  };

  // Handle Authentication callbacks
  const handleLoginSuccess = async (user: CustomUser) => {
    setCurrentUser(user);
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(user));

    if (user.uid) {
      setSyncStatus('syncing');
      try {
        const userDocRef = doc(db, 'user_states', user.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const cloudData = docSnap.data();
          if (cloudData && cloudData.state) {
            const nextCloudState = cloudData.state as DatabaseState;
            setDbState(nextCloudState);
            latestStateRef.current = nextCloudState;
            localStorage.setItem(LOCAL_STORAGE_DB_KEY, JSON.stringify(nextCloudState));
            setSyncStatus('saved');
          }
        }
      } catch (e) {
        console.warn("Silent login check skipped / offline:", e);
      }
    }
  };

  const handleLogout = async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
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
    setSyncStatus('saved');
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

    if (activeView === 'assignments') {
      return (
        <AllAssignmentsView
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
        syncStatus={syncStatus}
      />

      {/* 2. Main study content canvas scroll board */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-8 lg:px-12 py-8 md:py-12 relative">
        {/* Floating Top Right Knowledge Vault Trigger */}
        <div className="absolute top-4 right-4 md:top-6 md:right-8 z-30 flex items-center gap-3">
          <button
            onClick={() => setActiveView(activeView === 'vault' ? 'dashboard' : 'vault')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono tracking-wider uppercase transition-all duration-150 flex items-center gap-2 border shadow-xs select-none cursor-pointer ${
              activeView === 'vault'
                ? 'bg-blue-600 hover:bg-blue-500 border-transparent text-white'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-350 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 hover:text-slate-700 dark:hover:text-white'
            }`}
            title={activeView === 'vault' ? "Back to Dashboard" : "Open Knowledge Vault"}
            id="knowledge-vault-trigger"
          >
            <BookOpen className={`w-4 h-4 shrink-0 transition-colors ${activeView === 'vault' ? 'text-white' : 'text-blue-500 dark:text-blue-400'}`} />
            <span className="hidden sm:inline">Knowledge Vault</span>
          </button>
        </div>

        <div className="max-w-5xl mx-auto">
          {renderWorkspace()}
        </div>
      </main>

    </div>
  );
}
