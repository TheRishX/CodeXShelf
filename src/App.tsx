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

const LOCAL_STORAGE_DB_KEY = 'codexshelf_database_state_v1';
const LOCAL_STORAGE_USER_KEY = 'codexshelf_active_user_v1';
const LOCAL_STORAGE_THEME_KEY = 'codexshelf_theme_preference_v1';

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

  // View Router state
  // Can be: 'dashboard'
  // Or: 'topicId' (e.g. 'javascript')
  // Or: 'topicId::subtopicId' (e.g. 'javascript::closures')
  const [activeView, setActiveView] = useState<string>('dashboard');

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

    // 2. Authentication load
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
  }, [currentUser.isAuthenticated]);

  // Read current database from node-express backend
  const fetchCloudDatabase = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/data');
      const resJSON = await response.json();
      
      if (resJSON.success && resJSON.data) {
        // Successful sync, load from cloud
        setDbState(resJSON.data);
        localStorage.setItem(LOCAL_STORAGE_DB_KEY, JSON.stringify(resJSON.data));
        setOfflineMode(false);
      } else {
        // Fallback to local storage or initial data presets
        const localCopy = localStorage.getItem(LOCAL_STORAGE_DB_KEY);
        if (localCopy) {
          setDbState(JSON.parse(localCopy));
        } else {
          setDbState(initialData);
        }
        setOfflineMode(true);
      }
    } catch (e) {
      console.warn("Failed to fetch cloud db. Retaining offline mode caches.", e);
      // Fallback to local
      const localCopy = localStorage.getItem(LOCAL_STORAGE_DB_KEY);
      if (localCopy) {
        setDbState(JSON.parse(localCopy));
      }
      setOfflineMode(true);
    } finally {
      setSyncing(false);
    }
  };

  // Synchronize state down to server (Writes state to disk/db)
  const syncToCloud = async (newState: DatabaseState) => {
    setSyncing(true);
    try {
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

  const handleLogout = () => {
    const emptyUser: CustomUser = {
      email: '',
      name: '',
      isAuthenticated: false
    };
    setCurrentUser(emptyUser);
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    localStorage.removeItem(LOCAL_STORAGE_DB_KEY);
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

    </div>
  );
}
