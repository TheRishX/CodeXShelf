import React, { useState } from 'react';
import { 
  Award, Search, HelpCircle, CheckCircle2, XCircle, Plus, Trash2, 
  ExternalLink, Layers, Check, RefreshCw 
} from 'lucide-react';
import { DatabaseState, QuizItem, Subtopic, Topic } from '../types';

interface AllQuizzesViewProps {
  dbState: DatabaseState;
  onOpenSubtopic: (topicId: string, subtopicId: string) => void;
  onUpdateDb: (updates: Partial<DatabaseState>) => void;
}

export function AllQuizzesView({ dbState, onOpenSubtopic, onUpdateDb }: AllQuizzesViewProps) {
  const { topics, subtopics } = dbState;
  const quizzes = dbState.quizzes || [];

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('all');

  // Track users answers in state
  const [userSelections, setUserSelections] = useState<Record<string, number>>({});
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [totalAttempted, setTotalAttempted] = useState(0);

  // Form states for global add
  const [newQuestion, setNewQuestion] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [correctOptionIndex, setCorrectOptionIndex] = useState<number>(0);
  const [newExplanation, setNewExplanation] = useState('');
  const [newSubtopicId, setNewSubtopicId] = useState('');

  const getSubtopicPath = (subtopicId: string) => {
    const sub = subtopics.find(s => s.id === subtopicId);
    const topic = sub ? topics.find(t => t.id === sub.topicId) : null;
    return { sub, topic };
  };

  const handleDeleteItem = (itemId: string) => {
    const updated = quizzes.filter(q => q.id !== itemId);
    onUpdateDb({ quizzes: updated });
  };

  const handleSelectOption = (quizId: string, optionIdx: number, correctIdx: number) => {
    // Already answered?
    if (userSelections[quizId] !== undefined) return;

    setUserSelections(prev => ({
      ...prev,
      [quizId]: optionIdx
    }));

    setTotalAttempted(prev => prev + 1);
    if (optionIdx === correctIdx) {
      setCorrectAnswersCount(prev => prev + 1);
    }
  };

  const handleResetAttempts = () => {
    setUserSelections({});
    setCorrectAnswersCount(0);
    setTotalAttempted(0);
  };

  const handleAddQuizItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim() || !optionA.trim() || !optionB.trim() || !newSubtopicId) return;

    const optionsList = [optionA.trim(), optionB.trim()];
    if (optionC.trim()) optionsList.push(optionC.trim());
    if (optionD.trim()) optionsList.push(optionD.trim());

    const newQuiz: QuizItem = {
      id: `quiz-${Date.now()}`,
      subtopicId: newSubtopicId,
      question: newQuestion.trim(),
      options: optionsList,
      correctIndex: correctOptionIndex,
      explanation: newExplanation.trim() || 'Expert suggested answer guidelines.',
      createdAt: new Date().toISOString()
    };

    onUpdateDb({ quizzes: [...quizzes, newQuiz] });
    setNewQuestion('');
    setOptionA('');
    setOptionB('');
    setOptionC('');
    setOptionD('');
    setCorrectOptionIndex(0);
    setNewExplanation('');
  };

  // Filter lists
  const filteredQuizzes = quizzes.filter(quiz => {
    const { sub, topic } = getSubtopicPath(quiz.subtopicId);
    const query = searchTerm.toLowerCase();

    const matchesQuery = quiz.question.toLowerCase().includes(query) ||
      quiz.explanation.toLowerCase().includes(query) ||
      quiz.options.some(opt => opt.toLowerCase().includes(query)) ||
      (sub?.name.toLowerCase().includes(query) ?? false) ||
      (topic?.name.toLowerCase().includes(query) ?? false);

    const matchesTopic = selectedTopicId === 'all' || (sub?.topicId === selectedTopicId);

    return matchesQuery && matchesTopic;
  });

  const accuracy = totalAttempted > 0 
    ? Math.round((correctAnswersCount / totalAttempted) * 100) 
    : 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-200 text-left">
      
      {/* Header section */}
      <div>
        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">
          Global Simulator Vault
        </p>
        <h2 className="text-4xl font-extrabold text-slate-905 mt-1 tracking-tight flex items-center gap-2.5">
          <Award className="w-8 h-8 text-emerald-500 shrink-0" />
          <span>Interactive Quiz Practice Simulator</span>
        </h2>
        <p className="text-sm font-medium text-slate-550 dark:text-slate-400 mt-2 font-sans">
          Simulate assessments, test your language comprehension, and check your syntax memory. Answer flash quizzes, get instant feedback, and check score sheets.
        </p>
      </div>

      {/* Scores tally card metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-emerald-500/[0.02] dark:bg-emerald-500/[0.01] p-5 rounded-3xl border border-emerald-500/10">
        <div>
          <span className="text-[10px] font-bold text-slate-405 uppercase tracking-wide font-mono">Simulators</span>
          <h4 className="text-2xl font-black text-slate-905">{quizzes.length} total</h4>
          <span className="text-[10px] text-slate-450 italic">Across Bookshelf Databases</span>
        </div>

        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide font-mono">Score board</span>
          <h4 className="text-2.5xl font-extrabold text-slate-905">
            {correctAnswersCount} <span className="text-sm text-slate-400">/ {totalAttempted} solved</span>
          </h4>
          <span className="text-[10px] text-slate-400">Correctly Attempted</span>
        </div>

        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide font-mono">Accuracy Rating</span>
          <h4 className="text-2.5xl font-black text-slate-900">{accuracy}%</h4>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div className="bg-emerald-505 h-full rounded-full transition-all duration-300" style={{ width: `${accuracy}%` }} />
          </div>
        </div>

        <button
          onClick={handleResetAttempts}
          className="p-4 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-850 hover:border-slate-350 hover:bg-slate-50 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-bold text-slate-700 uppercase tracking-wider font-mono shadow-3xs cursor-pointer select-none"
        >
          <RefreshCw className="w-4.5 h-4.5 text-emerald-555 animate-spin-hover" />
          <span>Reset Test Attempts</span>
        </button>
      </div>

      {/* Control Actions toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white dark:bg-slate-905 p-4 rounded-2xl border border-slate-205 dark:border-slate-850 shadow-3xs">
        {/* Search */}
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-404" />
          <input
            type="text"
            placeholder="Search questions, multiple choice options, rationale explanations, pathway tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-205 dark:border-slate-800 bg-slate-50 border-slate-200 dark:bg-slate-950 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-sans"
          />
        </div>

        {/* Filters */}
        <div className="w-full sm:w-auto flex items-center gap-2">
          <Layers className="w-4 h-4 text-slate-405 shrink-0" />
          <select
            value={selectedTopicId}
            onChange={(e) => setSelectedTopicId(e.target.value)}
            className="w-full sm:w-auto px-4 py-2 border border-slate-202 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs outline-hidden text-slate-707 dark:text-slate-300 focus:border-emerald-500 font-sans"
          >
            <option value="all">All Topics (Default)</option>
            {topics.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Add New Quiz Globals */}
      <div className="p-5 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-250 dark:border-slate-855">
        <h4 className="text-sm font-bold text-slate-905 dark:text-white flex items-center gap-1.5 mb-3">
          <Plus className="w-4 h-4 text-emerald-500" />
          <span>Upload Custom Multiple Choice Quiz Card</span>
        </h4>
        <form onSubmit={handleAddQuizItem} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              required
              placeholder="Question Prompt, e.g., Which statement initializes a variable inside block scope?"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-202 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-905 focus:outline-none"
            />
            <select
              required
              value={newSubtopicId}
              onChange={(e) => setNewSubtopicId(e.target.value)}
              className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-202 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 focus:outline-none"
            >
              <option value="">-- Choose Subtopic Category --</option>
              {subtopics.map(sub => {
                const parent = topics.find(t => t.id === sub.topicId);
                return (
                  <option key={sub.id} value={sub.id}>
                    {parent ? `${parent.name} ➔ ` : ''}{sub.name}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input
              type="text"
              required
              placeholder="Option A (Required)"
              value={optionA}
              onChange={(e) => setOptionA(e.target.value)}
              className="px-3.5 py-2 text-xs rounded-xl border bg-white focus:outline-none"
            />
            <input
              type="text"
              required
              placeholder="Option B (Required)"
              value={optionB}
              onChange={(e) => setOptionB(e.target.value)}
              className="px-3.5 py-2 text-xs rounded-xl border bg-white focus:outline-none"
            />
            <input
              type="text"
              placeholder="Option C (Optional)"
              value={optionC}
              onChange={(e) => setOptionC(e.target.value)}
              className="px-3.5 py-2 text-xs rounded-xl border bg-white focus:outline-none"
            />
            <input
              type="text"
              placeholder="Option D (Optional)"
              value={optionD || ''}
              onChange={(e) => setOptionD(e.target.value)}
              className="px-3.5 py-2 text-xs rounded-xl border bg-white focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <select
              value={correctOptionIndex}
              onChange={(e) => setCorrectOptionIndex(parseInt(e.target.value, 10))}
              className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none"
            >
              <option value="0">Correct Choice: Option A</option>
              <option value="1">Correct Choice: Option B</option>
              <option value="2">Correct Choice: Option C</option>
              <option value="3">Correct Choice: Option D</option>
            </select>
            <input
              type="text"
              placeholder="Explanation Answer Rationale (e.g., 'let' and 'const' support block limitations)"
              value={newExplanation}
              onChange={(e) => setNewExplanation(e.target.value)}
              className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-202 bg-white text-slate-905 focus:outline-none animate-fade-in"
            />
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 bg-emerald-650 hover:bg-emerald-555 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Publish Quiz Card
          </button>
        </form>
      </div>

      {/* Main quizzes rendering list */}
      <div className="space-y-6">
        {filteredQuizzes.map(quiz => {
          const { sub, topic } = getSubtopicPath(quiz.subtopicId);
          const selectedOption = userSelections[quiz.id];
          const hasAnswered = selectedOption !== undefined;

          return (
            <div 
              key={quiz.id}
              className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-850 rounded-2xl shadow-3xs flex flex-col gap-4 text-left relative"
            >
              <div className="absolute top-5 right-5 flex items-center">
                <button
                  type="button"
                  onClick={() => handleDeleteItem(quiz.id)}
                  className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-50 transition-colors"
                  title="Remove quiz card"
                >
                  <Trash2 className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Path metadata */}
              <div className="flex flex-wrap items-center gap-2 select-none">
                {sub && topic ? (
                  <button
                    onClick={() => onOpenSubtopic(topic.id, sub.id)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 text-blue-600 dark:text-blue-400 text-[10px] font-bold font-mono tracking-wide border border-blue-500/10 cursor-pointer"
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: topic.color }} />
                    <span>{topic.name}</span>
                    <span className="text-slate-405 font-sans">/</span>
                    <span className="underline">{sub.name}</span>
                    <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                  </button>
                ) : (
                  <span className="text-[9px] text-slate-400 font-mono">Quiz deck</span>
                )}
              </div>

              {/* Question Text */}
              <h4 className="text-sm font-black text-slate-905 dark:text-white leading-normal select-text pr-10">
                {quiz.question}
              </h4>

              {/* Options lists checklist triggers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-2 select-none">
                {quiz.options.map((option, optIdx) => {
                  const isChoice = selectedOption === optIdx;
                  const isCorrectAnswer = optIdx === quiz.correctIndex;

                  let optionStyles = 'bg-slate-52 border-slate-205 dark:bg-slate-950/40 text-slate-705 dark:text-slate-300 hover:bg-slate-100/70 border-slate-200';
                  if (hasAnswered) {
                    if (isCorrectAnswer) {
                      optionStyles = 'bg-emerald-500/15 border border-emerald-505/45 text-emerald-600 font-extrabold';
                    } else if (isChoice) {
                      optionStyles = 'bg-rose-500/15 border border-rose-505/40 text-rose-600 dark:text-rose-450 font-extrabold';
                    } else {
                      optionStyles = 'opacity-55 border-slate-200 dark:border-slate-800 bg-slate-50/20';
                    }
                  }

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      disabled={hasAnswered}
                      onClick={() => handleSelectOption(quiz.id, optIdx, quiz.correctIndex)}
                      className={`p-4 rounded-xl border text-left text-xs transition-all flex items-center justify-between gap-3 ${
                        !hasAnswered ? 'cursor-pointer active:scale-98' : 'cursor-default'
                      } ${optionStyles}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-slate-100/60 font-mono font-black text-[10px] text-center flex items-center justify-center shrink-0">
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span>{option}</span>
                      </div>

                      {hasAnswered && (
                        <div>
                          {isCorrectAnswer && <CheckCircle2 className="w-4 h-4 text-emerald-555 shrink-0" />}
                          {!isCorrectAnswer && isChoice && <XCircle className="w-4 h-4 text-rose-555 shrink-0" />}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Solution Answer Rationale text explanation */}
              {hasAnswered && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-955/35 border border-slate-205/65 select-text text-left mt-1 animate-fade-in">
                  <span className="text-[9px] font-mono font-black uppercase text-slate-450 tracking-wider">Expert Rationale Explanation</span>
                  <p className="text-xs text-slate-650 mt-1 leading-relaxed font-sans font-medium">
                    {quiz.explanation}
                  </p>
                </div>
              )}
            </div>
          );
        })}

        {filteredQuizzes.length === 0 && (
          <div className="py-16 text-center border-2 border-dashed border-slate-205 dark:border-slate-855 rounded-3xl bg-slate-50/10">
            <HelpCircle className="w-10 h-10 text-slate-404 mx-auto mb-3" />
            <p className="text-slate-550 dark:text-slate-400 font-sans font-medium text-sm">
              No multiple choice quiz cards match your filter specifications.
            </p>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Add custom simulation quizzes above or load syllabus pages inside.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
