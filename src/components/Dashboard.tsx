import React, { useState } from 'react';
import { 
  Sparkles, Layers, BookOpen, FileText, HelpCircle, ArrowRight, CheckCircle2, AlertCircle,
  GraduationCap, Coffee, Code, Database, ChevronRight, PlayCircle, Download, Upload, ShieldAlert,
  Trash2, Plus, X
} from 'lucide-react';
import { DatabaseState, Topic, Subtopic } from '../types';

interface DashboardProps {
  dbState: DatabaseState;
  onSelectView: (view: 'dashboard' | string) => void;
  onOpenSubtopic: (topicId: string, subtopicId: string) => void;
  onUpdateDb: (updates: Partial<DatabaseState>) => void;
  onTriggerNewTopic: () => void;
}

export function Dashboard({ dbState, onSelectView, onOpenSubtopic, onUpdateDb, onTriggerNewTopic }: DashboardProps) {
  const { topics, subtopics, pdfs, notes, videos, concepts, coding, interviews, quizzes } = dbState;
  
  // Feedback states for importing data
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
            };
            
            // Validate at least some keys are set
            if (restored.topics.length === 0 && restored.subtopics.length === 0) {
              setErrorMsg("No active topics or subtopics found in the selected JSON database state.");
              return;
            }
            
            onUpdateDb(restored);
            setSuccessMsg(`Vault imported successfully! Loaded ${restored.topics.length} topics, ${restored.subtopics.length} subtopics, and ${restored.notes.length + restored.pdfs.length + restored.videos.length + restored.quizzes.length} study resource items.`);
          } else {
            setErrorMsg("Invalid data structure. The uploaded backup must be a valid CodeXShelf export JSON object.");
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
      
      {/* Header section */}
      <div>
        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">
          Today
        </p>
        <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white mt-1 tracking-tight">
          What to study next.
        </h2>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2 font-sans">
          One quiet place for everything you’re learning.
        </p>
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
        <div className="bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex items-center gap-4 shadow-sm hover:shadow transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/20 text-blue-600 flex items-center justify-center shrink-0">
            <BookOpen className="w-5.5 h-5.5" />
          </div>
          <div>
            <p className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-none">
              {totalTopicsCount}
            </p>
            <p className="text-[10px] font-extrabold font-mono tracking-wider text-slate-400 dark:text-slate-500 uppercase mt-2">
              Topics
            </p>
          </div>
        </div>

        {/* Subtopics Count */}
        <div className="bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex items-center gap-4 shadow-sm hover:shadow transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 flex items-center justify-center shrink-0">
            <Layers className="w-5.5 h-5.5" />
          </div>
          <div>
            <p className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-none">
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
