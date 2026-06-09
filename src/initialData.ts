import { DatabaseState } from './types';

export const initialData: DatabaseState = {
  topics: [
    {
      id: 'html-css',
      name: 'HTML & CSS',
      description: 'Modern markup and responsive layout styles including Flexbox and CSS Grid.',
      icon: 'graduation-cap',
      color: '#2e7d32', // Sage/Dark green
      createdAt: '2026-05-01T10:00:00Z'
    },
    {
      id: 'javascript',
      name: 'Javascript',
      description: 'Deep dive into asynchronous runtimes, memory scopes, prototypes, and lexical environments.',
      icon: 'coffee',
      color: '#d84315', // Rust red/coral
      createdAt: '2026-05-02T11:00:00Z'
    },
    {
      id: 'mern-stack',
      name: 'MERN Stack',
      description: 'Full-stack engineering using MongoDB, Express, React, and Node.js.',
      icon: 'database',
      color: '#0277bd', // Slate blue
      createdAt: '2026-05-03T12:00:00Z'
    }
  ],
  subtopics: [
    {
      id: 'flexbox',
      topicId: 'html-css',
      name: 'Flexbox Alignment',
      description: 'Understanding parent-child flex directions, wrapping, justification, and alignment parameters.',
      createdAt: '2026-05-01T10:30:00Z'
    },
    {
      id: 'closures',
      topicId: 'javascript',
      name: 'Closures',
      description: 'Deconstructing inner functions retaining access to outer lexical environment variables.',
      createdAt: '2026-05-02T11:30:00Z'
    },
    {
      id: 'async-await',
      topicId: 'javascript',
      name: 'Asynchronous Loops',
      description: 'Managing sequence timing, error boundaries, and nested Promises with try-catch handles.',
      createdAt: '2026-05-02T12:30:00Z'
    },
    {
      id: 'react-state',
      topicId: 'mern-stack',
      name: 'React Fiber State',
      description: 'Inside modern React batch rendering cycles, state consolidation, and performance hooks.',
      createdAt: '2026-05-03T13:00:00Z'
    }
  ],
  pdfs: [
    {
      id: 'pdf-1',
      subtopicId: 'flexbox',
      title: 'Complete CSS Flexbox Cheat Sheet',
      fileName: 'css-flexbox-guide-2026.pdf',
      fileSize: '1.2 MB',
      createdAt: '2026-05-01T11:00:00Z'
    }
  ],
  notes: [
    {
      id: 'note-1',
      subtopicId: 'closures',
      title: 'Deep Dive: JavaScript Closures and Scopes',
      content: `A **closure** is the combination of a function bundled together (enclosed) with references to its surrounding state (the **lexical environment**). 

In JavaScript, closures are created every time a function is created, at function creation time.

### Quick Code Breakdown:
\`\`\`javascript
function makeCounter() {
  let count = 0; // Private outer local state
  return function() {
    count += 1;
    return count;
  };
}

const counter = makeCounter();
console.log(counter()); // Output: 1
console.log(counter()); // Output: 2
\`\`\`

### Key Mechanics:
1. **Lexical Scope**: Scope is determined statically by position in tree source lines.
2. **Double Binding**: The variable in outer count is binds by reference to closure scopes.
3. **Memory Tracing**: The Javascript garbage collector retains outer scopes until the child reference runs empty. Avoid closures in persistent global lists to prevent leaks!`,
      createdAt: '2026-05-02T12:00:00Z',
      updatedAt: '2026-05-02T12:00:00Z'
    },
    {
      id: 'note-2',
      subtopicId: 'react-state',
      title: 'Reconciler Schedules & Hook Batches',
      content: `React batch state triggers trigger atomic renders for superior timing performance.

### Fiber State Highlights:
- **Batch Processing**: Multiple triggers execute within single task frames.
- **Hook Closures**: Mind stale hook scopes when returning nested event timeouts! Ensure you pass full functional updates: \`setCount(c => c + 1)\`!`,
      createdAt: '2026-05-03T14:00:00Z',
      updatedAt: '2026-05-03T14:00:00Z'
    }
  ],
  videos: [
    {
      id: 'vid-1',
      subtopicId: 'closures',
      title: 'JavaScript Closures Visualized',
      url: 'https://www.youtube.com/watch?v=F3z77N6A4P8',
      platform: 'youtube',
      createdAt: '2026-05-02T12:15:00Z'
    },
    {
      id: 'vid-2',
      subtopicId: 'react-state',
      title: 'Understanding React State Synchronization Patterns',
      url: 'https://www.youtube.com/watch?v=3g6K8h_zQ2k',
      platform: 'youtube',
      createdAt: '2026-05-03T14:30:00Z'
    }
  ],
  concepts: [
    {
      id: 'concept-1',
      subtopicId: 'closures',
      title: 'The Execution Context Heap vs Stack',
      content: 'While local primitives reside strictly in stack frames for immediate cleanup, closures elevate lexical frames onto the heap. This ensures outer variable bindings survive parent frame de-scheduling.',
      codeSnippet: `// Lexical Environment Scope Lookup Map:
{
  env: { count: 1 },
  parent: { globalScope: true }
}`,
      createdAt: '2026-05-02T12:20:00Z'
    }
  ],
  coding: [
    {
      id: 'code-1',
      subtopicId: 'closures',
      title: 'Write a Custom Cache Memoizer',
      difficulty: 'medium',
      problemStatement: 'Write a memoization function `memoize(fn)` that caches execution result values according to dynamic invocation arguments. If the function is re-invoked with identical parameters, output the lookup cache without re-running the heavy process.',
      starterCode: `function memoize(fn) {
  // Write your code inside using a Closure Cache Map!
  return function(...args) {
    
  };
}`,
      solution: `function memoize(fn) {
  const cache = new Map();
  return function(...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}`,
      createdAt: '2026-05-02T12:40:00Z'
    }
  ],
  interviews: [
    {
      id: 'int-1',
      subtopicId: 'closures',
      question: 'Can you demonstrate a potential memory leak caused by improper Clouse usage, and describe how to solve it?',
      answer: `Memory leaks occur when closures run nested inside long-lived references, keeping heavy internal assets from garbage collection.

Example leak:
\`\`\`javascript
let leakReference = null;
function leak() {
  const originalReference = leakReference;
  const heavyPayload = new Array(1000000).fill('*'); // Massive payload
  
  leakReference = {
    someMethod: function() { // Closure holds hook to heavyPayload scope
      if (originalReference) return heavyPayload;
    }
  };
}
setInterval(leak, 100); // leakReference grows exponentially
\`\`\`

**Solution:** Manually nullify references or separate context execution modules so heavy variables do not get captured in scopes of long-lived event listeners or intervals.`,
      level: 'senior',
      createdAt: '2026-05-02T13:00:00Z'
    }
  ],
  quizzes: [
    {
      id: 'quiz-1',
      subtopicId: 'closures',
      question: 'What gets printed to the terminal console log?',
      options: [
        'Undefined',
        '0 then 1 then 2',
        '3 instances of the number 3',
        'ReferenceError'
      ],
      correctIndex: 2,
      explanation: 'Using standard var defines a single loop scope reference. Because task timeouts resolve asynchronously after the loop terminates, all closures look up the same terminal variable index.',
      createdAt: '2026-05-02T13:10:00Z'
    }
  ],
  trackers: [],
  vaultItems: [
    {
      id: 'vault-1',
      title: 'LeetCode',
      description: 'The world\'s leading platform for preparing technical coding interviews and practicing Data Structures and Algorithms.',
      url: 'https://leetcode.com',
      category: 'DSA',
      tags: ['Interview Prep', 'Algorithms', 'DSA Practice'],
      notes: 'Contains dynamic coding paradigms, graph problems, and blind 75 tracks. Highly recommended to practice closures, stacks, queues, and tree traversals.',
      isFavorite: true,
      createdAt: '2026-05-01T12:00:00Z'
    },
    {
      id: 'vault-2',
      title: 'MDN Web Docs',
      description: 'The premier open resource for developer-focused documentation on HTML, CSS, JavaScript, Web APIs, and browser standards.',
      url: 'https://developer.mozilla.org',
      category: 'Documentation',
      tags: ['Javascript', 'Standards', 'Web Development'],
      notes: 'Exceptional in-depth references for closures, event loops, execution contexts, and prototypes.',
      isFavorite: true,
      createdAt: '2026-05-02T13:00:00Z'
    },
    {
      id: 'vault-3',
      title: 'Roadmap.sh',
      description: 'Interactive roadmaps, guides, and learning paths for frontend, backend, DevOps, and full-stack engineering roles.',
      url: 'https://roadmap.sh',
      category: 'Learning Resources',
      tags: ['Career Guide', 'Roadmaps', 'Syllabus'],
      notes: 'Great directory of topics for planning study hierarchies and tracking core learning domains.',
      isFavorite: false,
      createdAt: '2026-05-03T11:00:00Z'
    },
    {
      id: 'vault-4',
      title: 'System Design Primer',
      description: 'An open source comprehensive guide and repository for learning how to build scalable, high-availability distributed systems.',
      url: 'https://github.com/donnemartin/system-design-primer',
      category: 'System Design',
      tags: ['Distributed Systems', 'Databases', 'Scalability'],
      notes: 'Outstanding illustrations of load balancers, CDN distributions, caching strategies, and database sharding.',
      isFavorite: true,
      createdAt: '2026-05-04T09:00:00Z'
    }
  ],
  vaultCategories: [
    'DSA',
    'Development',
    'DevOps',
    'System Design',
    'Interview Preparation',
    'Documentation',
    'AI',
    'Learning Resources'
  ],
  assignments: [
    {
      id: 'assignment-1',
      title: 'Dynamic Programming & Knapsack Optimization',
      description: 'Analyze subproblem recurrence relations and design space-optimized bottom-up formulations.',
      paperUrl: 'https://images.semanticscholar.org/example-paper.pdf',
      websiteUrl: 'https://leetcode.com/problems/01-matrix/',
      status: 'In Progress',
      notes: 'Cognitive check: Verify base cases with subproblem sizes 0 and 1 first to prevent boundary memory leaks.',
      createdAt: '2026-05-15T09:00:00Z'
    },
    {
      id: 'assignment-2',
      title: 'Distributed System Consensus Fault Tolerance (Raft)',
      description: 'Practice leader election timing thresholds, log replication, and safe state machines.',
      paperUrl: 'https://raft.github.io/raft.pdf',
      websiteUrl: 'https://raft.github.io/',
      status: 'Awaiting Solution',
      notes: 'Visualization represents an amazing neural anchor! Study the interactive visualization page closely.',
      createdAt: '2026-06-01T15:30:05Z'
    }
  ],
  todos: [
    {
      id: 'todo-1',
      title: 'Active Recall Check: React Fiber Scheduler vs Stack Reconciler',
      description: 'Force your brain to retrieve and verbally explain the difference out loud. Can you map how work units (fibers) bypass stack limitations?',
      category: 'active_recall',
      priority: 'learning_milestone',
      status: 'todo',
      createdAt: '2026-06-07T08:00:00Z',
      difficultyEstimate: 'deep_analytical',
      notes: ''
    },
    {
      id: 'todo-2',
      title: 'Blind Spot: Debunk the Myth of Client-Side API Security',
      description: 'Common developer trap: Storing third-party production secrets inside client React `.env` files. Build an Express proxy route to isolate them safely.',
      category: 'blind_spot_clarify',
      priority: 'critical_blocker',
      status: 'in_progress',
      createdAt: '2026-06-07T09:12:00Z',
      difficultyEstimate: 'quick_win',
      notes: 'Keep secrets strictly on server node environments.'
    },
    {
      id: 'todo-3',
      title: 'Interval Study: Space-Optimized Knapsack DP Formulation',
      description: 'Solidify your memory consolidation of the 1D-array DP state optimization before recall decays.',
      category: 'revision',
      priority: 'casual_deep_dive',
      status: 'completed',
      createdAt: '2026-06-06T14:30:00Z',
      completedAt: '2026-06-06T15:45:00Z',
      difficultyEstimate: 'epic_conceptual',
      notes: 'Iterate backwards from Capacity down to item weight to rely on the current step\'s unmutated states!'
    }
  ],
  quickNotes: [],
  streak: {
    count: 3,
    lastActiveDate: '2026-06-09'
  },
  streakLogs: {
    '2026-06-08': {
      text: 'Explored asynchronous runtime closures, practiced Javascript callbacks, and successfully solved 2 medium coding challenges.',
      questionsSolved: 2,
      topicsLearned: ['Javascript'],
      createdAt: '2026-06-08T18:30:00Z'
    },
    '2026-06-09': {
      text: 'Deeply reviewed CSS alignment properties, finished the Flexbox worksheet, and consolidated 1 crucial interview QA session.',
      questionsSolved: 1,
      topicsLearned: ['HTML & CSS'],
      createdAt: '2026-06-09T11:45:00Z'
    }
  },
  books: [
    {
      id: 'book-1',
      title: 'Designing Data-Intensive Applications',
      author: 'Martin Kleppmann',
      link: 'https://www.oreilly.com/library/view/designing-data-intensive-applications/9781491903063/',
      coverUrl: '',
      notes: 'Superb textbook parsing distributed systems, database storage engines, schemas, partition rules, consensus protocols, and offline scaling architectures.',
      rating: 5,
      status: 'reading',
      totalPages: 610,
      currentPage: 240,
      shelfLocation: 'middle',
      createdAt: '2026-06-05T09:00:00Z'
    },
    {
      id: 'book-2',
      title: 'Introduction to Algorithms',
      author: 'Thomas H. Cormen',
      link: 'https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/',
      coverUrl: '',
      notes: 'The definitive tome (CLRS) for analyzing time complexity, topological sort, flow networks, dynamic programming, and heap allocations.',
      rating: 4,
      status: 'want_to_read',
      totalPages: 1312,
      currentPage: 32,
      shelfLocation: 'bottom',
      createdAt: '2026-06-06T10:15:00Z'
    },
    {
      id: 'book-3',
      title: 'Clean Code',
      author: 'Robert C. Martin',
      link: 'https://www.oreilly.com/library/view/clean-code-a/9780136083238/',
      coverUrl: '',
      notes: 'A handbook of agile software craftsmanship. Focused on pristine naming layouts, tiny single-purpose function parameters, unit testing setups, and clean object wrappers.',
      rating: 5,
      status: 'completed',
      totalPages: 464,
      currentPage: 464,
      shelfLocation: 'top',
      createdAt: '2026-06-07T11:20:00Z'
    }
  ]
};
