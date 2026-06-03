import React, { useState, useEffect } from 'react';
import { 
  Lightbulb, Shuffle, Search, Copy, Check, ExternalLink, HelpCircle 
} from 'lucide-react';
import { DatabaseState, ConceptItem, Subtopic, Topic } from '../types';

interface AllConceptsViewProps {
  dbState: DatabaseState;
  onOpenSubtopic: (topicId: string, subtopicId: string) => void;
}

export function AllConceptsView({ dbState, onOpenSubtopic }: AllConceptsViewProps) {
  const { concepts, subtopics, topics } = dbState;
  
  const [searchTerm, setSearchTerm] = useState('');
  const [shuffledConcepts, setShuffledConcepts] = useState<ConceptItem[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Initialize and load all concepts
  useEffect(() => {
    setShuffledConcepts([...concepts]);
  }, [concepts]);

  // Handle Shuffle
  const handleShuffle = () => {
    const list = [...concepts];
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    setShuffledConcepts(list);
  };

  // Handle Copy Snippet
  const handleCopy = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 1500);
  };

  // Find subtopic and topic information for a concept
  const getConceptPath = (concept: ConceptItem) => {
    const sub = subtopics.find(s => s.id === concept.subtopicId);
    const parentTopic = sub ? topics.find(t => t.id === sub.topicId) : null;
    return { sub, topic: parentTopic };
  };

  // Filter the shuffled list of concepts
  const filteredConcepts = shuffledConcepts.filter(c => {
    const { sub, topic } = getConceptPath(c);
    const query = searchTerm.toLowerCase();
    
    return (
      c.title.toLowerCase().includes(query) ||
      c.content.toLowerCase().includes(query) ||
      (sub?.name.toLowerCase().includes(query) ?? false) ||
      (topic?.name.toLowerCase().includes(query) ?? false)
    );
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-200 text-left">
      {/* Header section */}
      <div>
        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">
          Global Knowledge Shelf
        </p>
        <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white mt-1 tracking-tight flex items-center gap-2.5">
          <Lightbulb className="w-8 h-8 text-amber-500 shrink-0" />
          <span>Core Concepts Deck</span>
        </h2>
        <p className="text-sm font-medium text-slate-550 dark:text-slate-400 mt-2 font-sans">
          Review complex programming language paradigms, architecture rules, and syntax cards compiled across your entire bookshelf.
        </p>
      </div>

      {/* Control Actions toolbar: Search & Shuffle */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-850 shadow-xs">
        {/* Search input field */}
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Filter concepts by name, paradigm content, subtopic or topic..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all font-sans"
          />
        </div>

        {/* Shuffle / Randomizer button */}
        <button
          onClick={handleShuffle}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-250 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 text-xs font-bold uppercase tracking-wider font-mono rounded-xl transition-all cursor-pointer border border-slate-200 dark:border-slate-800 shadow-3xs"
          title="Randomize the presentation flow of core concepts"
        >
          <Shuffle className="w-4 h-4 text-amber-500" />
          <span>Shuffle Deck</span>
        </button>
      </div>

      {/* Grid count stats and tips */}
      <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-2xl text-xs text-slate-600 dark:text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-sans">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span>Showing <strong>{filteredConcepts.length}</strong> of <strong>{concepts.length}</strong> total registered concepts active in your learning bookshelf databases.</span>
        </div>
        <span className="text-[10px] uppercase font-mono bg-amber-500/10 text-amber-600 dark:text-amber-500 px-2 py-0.5 rounded font-bold self-start sm:self-center">
          Active Sandbox Vault
        </span>
      </div>

      {/* Main concepts card list layout */}
      <div className="space-y-6">
        {filteredConcepts.map(concept => {
          const { sub, topic } = getConceptPath(concept);
          const isCopied = copiedId === concept.id;

          return (
            <div 
              key={concept.id}
              className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-850 hover:border-blue-400 dark:hover:border-slate-750 transition-all duration-200 relative group shadow-2xs hover:shadow-sm"
            >
              {/* Top Row: Path tags and navigational jump triggers */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800/65">
                {sub && topic ? (
                  <button
                    onClick={() => onOpenSubtopic(topic.id, sub.id)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50/80 hover:bg-blue-100 dark:bg-blue-950/20 dark:hover:bg-blue-950/45 text-blue-600 dark:text-blue-400 text-[11px] font-bold font-mono tracking-wide transition-all border border-blue-100/50 dark:border-blue-900/30 cursor-pointer"
                    title={`Jump directly to the ${sub.name} subtopic`}
                  >
                    <span 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: topic.color }}
                    />
                    <span>{topic.name}</span>
                    <span className="text-slate-400 dark:text-slate-600 text-[9px] font-sans">/</span>
                    <span className="underline">{sub.name}</span>
                    <ExternalLink className="w-3 h-3 text-blue-400 shrink-0 ml-0.5" />
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider bg-slate-50 dark:bg-slate-850 px-2.5 py-1 rounded-lg">
                    Orphan Concept
                  </span>
                )}
                
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                  {new Date(concept.createdAt || Date.now()).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                </span>
              </div>

              {/* Title & Description */}
              <h4 className="text-lg font-bold text-slate-950 dark:text-white font-sans tracking-tight">
                {concept.title}
              </h4>
              <p className="text-sm text-slate-650 dark:text-slate-350 mt-2.5 leading-relaxed font-sans whitespace-pre-wrap">
                {concept.content}
              </p>

              {/* Code snippet display */}
              {concept.codeSnippet && (
                <div className="mt-4 relative group/code">
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover/code:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleCopy(concept.id, concept.codeSnippet || '')}
                      className="p-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg transition-colors shadow-sm cursor-pointer border border-transparent hover:border-slate-600"
                      title="Copy code snippet to clipboard"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    {isCopied && <span className="text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-400 py-1 px-2 rounded-md animate-fade-in">Copied!</span>}
                  </div>

                  <pre className="p-4 bg-slate-950 text-emerald-400 font-mono text-xs rounded-2xl overflow-x-auto border border-slate-850 scrollbar-thin">
                    <code>{concept.codeSnippet}</code>
                  </pre>
                </div>
              )}
            </div>
          );
        })}

        {filteredConcepts.length === 0 && (
          <div className="py-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-850 rounded-3xl bg-slate-50/10">
            <HelpCircle className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-sans font-medium text-sm">
              No concepts match "{searchTerm}" in this lookup sequence.
            </p>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Try shuffling the deck or searching with another keyword.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
