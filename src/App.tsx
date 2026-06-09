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
import { AllTopicshelfView } from './components/AllTopicshelfView';
import { QuickNotesView } from './components/QuickNotesView';
import { Topic, Subtopic, DatabaseState, CustomUser } from './types';
import { initialData } from './initialData';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

const LOCAL_STORAGE_DB_KEY = 'codexshelf_database_state_v1';
const LOCAL_STORAGE_USER_KEY = 'codexshelf_active_user_v1';
const LOCAL_STORAGE_THEME_KEY = 'codexshelf_theme_preference_v1';

import { StudyTodoView } from './components/StudyTodoView';
import { BookshelfView } from './components/BookshelfView';

import { 
  Laptop, BookOpen, CheckSquare, ClipboardList, Flame, Sparkles, Award, X
} from 'lucide-react';

const getLocalDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDaysDifference = (dateStr1: string, dateStr2: string) => {
  if (!dateStr1 || !dateStr2) return -1;
  const d1 = new Date(dateStr1 + 'T12:00:00');
  const d2 = new Date(dateStr2 + 'T12:00:05');
  const diffTime = d2.getTime() - d1.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
};

const detectNewActivity = (prev: DatabaseState, next: DatabaseState): boolean => {
  const getCompletedCount = (state: DatabaseState) => {
    const completedTodos = (state.todos || []).filter(t => t.status === 'completed').length;
    const completedPdfs = (state.pdfs || []).filter(p => p.isCompleted || p.status === 'completed').length;
    const readPdfs = (state.pdfs || []).filter(p => p.isReading || p.status === 'reading').length;
    const completedNotes = (state.notes || []).filter(n => n.isCompleted || n.status === 'completed').length;
    const readNotes = (state.notes || []).filter(n => n.isReading || n.status === 'reading').length;
    const completedVideos = (state.videos || []).filter(v => v.isCompleted).length;
    const completedAssignments = (state.assignments || []).filter(a => a.status === 'Completed' || a.status === 'Perfected').length;
    const completedTrackers = (state.trackers || []).filter(t => t.completed).length;
    
    // Include user logs as active study markers
    const streakLogsCount = Object.keys(state.streakLogs || {}).length;
    
    return completedTodos + completedPdfs + readPdfs + completedNotes + readNotes + completedVideos + completedAssignments + completedTrackers + streakLogsCount;
  };

  return getCompletedCount(next) > getCompletedCount(prev);
};

export default function App() {
  // Theme state representation
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [streakCelebration, setStreakCelebration] = useState<{ show: boolean; newCount: number } | null>(null);

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
  const [activeView, setActiveView] = useState<string>(() => {
    return localStorage.getItem('last_active_view') || 'dashboard';
  });

  // Save active view state transitions to remember what was opened last time
  useEffect(() => {
    localStorage.setItem('last_active_view', activeView);
  }, [activeView]);

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
    const prev = latestStateRef.current;
    const nextState = { ...prev, ...updates };

    // Daily Study Streak increment/maintenance
    let updatedStreakState = nextState.streak || { count: 0, lastActiveDate: '' };
    const todayStr = getLocalDateString();
    const daysSinceLastActive = getDaysDifference(updatedStreakState.lastActiveDate, todayStr);

    let currentStreakCount = updatedStreakState.count;
    if (daysSinceLastActive > 1) {
      currentStreakCount = 0; // decayed
    }

    const wasActivityDetected = detectNewActivity(prev, nextState);
    if (wasActivityDetected) {
      if (daysSinceLastActive === 0) {
        // Already active today! Make sure count is at least 1 if they completed a task
        updatedStreakState = {
          count: Math.max(1, currentStreakCount),
          lastActiveDate: todayStr
        };
        nextState.streak = updatedStreakState;
      } else {
        // Yesterday (1) or broken/new (>1 or -1)
        const newCount = daysSinceLastActive === 1 ? currentStreakCount + 1 : 1;
        updatedStreakState = {
          count: newCount,
          lastActiveDate: todayStr
        };
        nextState.streak = updatedStreakState;
        
        // Trigger visual announcement
        setStreakCelebration({
          show: true,
          newCount: newCount
        });
      }
    } else {
      // If no new activity, propagate decayed count if it's broken
      if (daysSinceLastActive > 1 && updatedStreakState.count !== 0) {
        updatedStreakState = {
          ...updatedStreakState,
          count: 0
        };
        nextState.streak = updatedStreakState;
      }
    }

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

    if (activeView === 'quicknotes') {
      return (
        <QuickNotesView
          dbState={dbState}
          onUpdateDb={handleUpdateDatabase}
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
          onSelectView={setActiveView}
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
          onSelectView={setActiveView}
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

    if (activeView === 'bookshelf') {
      return (
        <BookshelfView
          dbState={dbState}
          onUpdateDb={handleUpdateDatabase}
          onSelectView={setActiveView}
        />
      );
    }

    if (activeView === 'todo') {
      return (
        <StudyTodoView
          dbState={dbState}
          onUpdateDb={handleUpdateDatabase}
          onOpenSubtopic={handleOpenSubtopic}
          onBackToDashboard={() => setActiveView('dashboard')}
        />
      );
    }

    if (activeView === 'assignments') {
      return (
        <AllAssignmentsView
          dbState={dbState}
          onUpdateDb={handleUpdateDatabase}
          onSelectView={setActiveView}
        />
      );
    }

    if (activeView === 'topicshelf') {
      return (
        <AllTopicshelfView
          dbState={dbState}
          onSelectView={setActiveView}
          onOpenSubtopic={handleOpenSubtopic}
          onAddTopic={handleAddTopic}
          onDeleteTopic={handleDeleteTopic}
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
            onSelectView={setActiveView}
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
        streak={dbState.streak}
        sidebarOrder={dbState.sidebarOrder}
        onUpdateDb={handleUpdateDatabase}
        customMenuLabels={dbState.customMenuLabels}
        activeSidebarItems={dbState.activeSidebarItems}
      />

      {/* 2. Main study content canvas scroll board - flex container with sticky child bar */}
      <main className="flex-1 overflow-y-auto relative flex flex-col">
        {/* Elegant Sticky Top Navigation Bar with generous item groupings preventing overlaps */}
        <div className="sticky top-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/40 z-30 px-4 sm:px-8 lg:px-12 py-3 md:py-4 flex items-center justify-between transition-colors shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Context location indicator for fluid mental clarity */}
            <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest truncate">
              {activeView === 'dashboard' ? 'Overview' : 
               activeView === 'todo' ? 'Cognitive Tasks' : 
               activeView === 'vault' ? 'Digital Curator' : 
               activeView === 'quicknotes' ? 'Neural Intake' :
               activeView === 'concepts' ? 'Framework Concepts' :
               activeView === 'trackers' ? 'Study Tracker' :
               activeView === 'videos' ? 'Video Reference Lectures' :
               activeView === 'notes' ? 'Topic Scratchpads' :
               activeView === 'coding' ? 'Sandbox Labs' :
               activeView === 'interviews' ? 'Simulations' :
               activeView === 'quizzes' ? 'Assessment Arena' :
               activeView === 'pdfs' ? 'Reference Documents' :
               activeView === 'assignments' ? 'Laboratory Assignments' :
               activeView.includes('::') ? 'Subtopic Lab' : 'Topic Overview'}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Daily Streak Indicator */}
            {dbState.streak && dbState.streak.count > 0 && (
              <div 
                onClick={() => setActiveView('dashboard')}
                className="px-3 py-1.5 rounded-xl text-xs font-black font-mono tracking-wider uppercase border bg-amber-500/[0.04] dark:bg-amber-500/[0.02] border-amber-500/20 text-amber-600 dark:text-amber-450 flex items-center gap-2 cursor-pointer shadow-3xs hover:bg-amber-500/10 transition-colors"
                title="Your Daily Study Streak!"
              >
                <Flame className="w-4 h-4 shrink-0 text-amber-550 fill-amber-500 animate-pulse" />
                <span>{dbState.streak.count} DAYS</span>
              </div>
            )}

            <button
              onClick={() => setActiveView(activeView === 'todo' ? 'dashboard' : 'todo')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono tracking-wider uppercase transition-all duration-150 flex items-center gap-1.5 border shadow-xs select-none cursor-pointer ${
                activeView === 'todo'
                  ? 'bg-amber-500 hover:bg-amber-400 border-transparent text-white'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-350 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 hover:text-slate-700 dark:hover:text-white'
              }`}
              title={activeView === 'todo' ? "Back to Dashboard" : "Open Psychological To-Do"}
              id="todo-list-trigger"
            >
              <ClipboardList className={`w-4 h-4 shrink-0 transition-colors ${activeView === 'todo' ? 'text-white' : 'text-amber-500 dark:text-amber-450'}`} />
              <span>To-Do</span>
            </button>

            <button
              onClick={() => setActiveView(activeView === 'vault' ? 'dashboard' : 'vault')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono tracking-wider uppercase transition-all duration-150 flex items-center gap-1.5 border shadow-xs select-none cursor-pointer ${
                activeView === 'vault'
                  ? 'bg-blue-600 hover:bg-blue-500 border-transparent text-white'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-350 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 hover:text-slate-700 dark:hover:text-white'
              }`}
              title={activeView === 'vault' ? "Back to Dashboard" : "Open Knowledge Vault"}
              id="knowledge-vault-trigger"
            >
              <BookOpen className={`w-4 h-4 shrink-0 transition-colors ${activeView === 'vault' ? 'text-white' : 'text-blue-550 dark:text-blue-400'}`} />
              <span className="hidden sm:inline">Knowledge Vault</span>
            </button>
          </div>
        </div>

        {/* Content body container - keeps pristine, isolated vertical gap to avoid overlay */}
        <div className="flex-1 px-4 sm:px-8 lg:px-12 py-6 md:py-8">
          <div className="max-w-5xl mx-auto">
            {renderWorkspace()}
          </div>
        </div>
      </main>

      {/* 3. Daily Streak Milestone Celebrator */}
      {streakCelebration && streakCelebration.show && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4">
          <div 
            onClick={() => setStreakCelebration(null)}
            className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs transition-opacity duration-300" 
          />
          <div className="relative bg-white dark:bg-slate-900 rounded-3xl border border-amber-500/30 p-6 md:p-8 max-w-sm w-full text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-200 text-left">
            <button
              onClick={() => setStreakCelebration(null)}
              className="absolute right-4 top-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-450 flex items-center justify-center mx-auto relative">
              <Flame className="w-10 h-10 fill-amber-500 text-amber-500 animate-bounce" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500"></span>
              </span>
            </div>

            <div className="space-y-2 text-center">
              <span className="text-[10px] font-mono font-black text-amber-500 uppercase tracking-widest block">
                🧠 HABIT STRENGTHENED!
              </span>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">
                {streakCelebration.newCount} Day Streak!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans mt-2">
                Cognitive momentum built! By completing a study target today, you have defended your memory matrix against the natural decay curve. Keep the fire burning!
              </p>
            </div>

            <button
              onClick={() => setStreakCelebration(null)}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer select-none"
            >
              CRUSH NEXT CHALLENGE ➔
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
