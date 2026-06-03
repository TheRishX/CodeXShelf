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
  ]
};
