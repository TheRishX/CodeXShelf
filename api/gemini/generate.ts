import { GoogleGenAI, Type } from "@google/genai";

let ai: any = null;
const apiKey = process.env.GEMINI_API_KEY;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

async function generateWithRetry(options: any, maxAttempts = 3, initialDelayMs = 1500) {
  let lastError: any = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (!ai) {
        throw new Error("Gemini AI client is not configured.");
      }
      return await ai.models.generateContent(options);
    } catch (error: any) {
      lastError = error;
      const errMsg = String(error.message || "").toLowerCase();
      const errStatus = error.status || error.statusCode || error.code || 0;
      
      const isRetryable = 
        errStatus === 503 || 
        errStatus === 429 || 
        errStatus === 500 ||
        errMsg.includes("503") || 
        errMsg.includes("429") || 
        errMsg.includes("500") || 
        errMsg.includes("unavailable") || 
        errMsg.includes("demand") || 
        errMsg.includes("limit") || 
        errMsg.includes("overloaded");

      if (attempt < maxAttempts && isRetryable) {
        const delay = initialDelayMs * Math.pow(2, attempt - 1);
        console.warn(`[GEMINI RETRY] Attempt ${attempt} failed with error statement: "${error.message}". Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        break;
      }
    }
  }
  throw lastError;
}

export default async function handler(req: any, res: any) {
  console.log(`[Gemini Generate Vercel API] Received ${req.method} request`);

  // CORS Headers support
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  // Parse body
  const bodyObj = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
  const { type: rawType, topicName, subtopicName } = bodyObj;

  if (!ai) {
    return res.status(503).json({
      success: false,
      error: "Gemini AI client is not configured. Please add your GEMINI_API_KEY in Settings."
    });
  }

  if (!rawType || !topicName || !subtopicName) {
    return res.status(400).json({ success: false, error: "Missing required parameters (type, topicName, subtopicName)" });
  }

  let type = rawType;
  if (type === "concepts") type = "concept";
  if (type === "interviews") type = "interview";
  if (type === "quizzes") type = "quiz";
  if (type === "trackers") type = "tracker";

  try {
    let prompt = "";
    let schema: any = null;

    if (type === "notes") {
      prompt = `You are a professional senior compiler engineer/web educator. Write a highly detailed, extremely elegant, production-focused Markdown study note for the subtopic "${subtopicName}" under the larger category "${topicName}". 
Include:
- High level overview
- Complete, functional, beautifully styled syntax code code blocks
- Interactive code scenario (e.g. debugging scenarios, MERN integrations, optimization notes).
Keep the formatting strictly clean and readable with bold key parameters. Avoid verbose introductions, jump straight into the notes.`;

      const response = await generateWithRetry({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      return res.status(200).json({ success: true, result: response.text });
    }

    if (type === "interview") {
      prompt = `Generate a realistic and highly technical Web Developer core interview Question and Answer (Q&A) pair for the subtopic "${subtopicName}" (Topic: "${topicName}").
Avoid dry or generic summaries. Craft deep senior-level insight with complete code examples if applicable.`;
      
      schema = {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING, description: "A realistic developer interview question." },
          answer: { type: Type.STRING, description: "Detailed, complete answer with code snippets in markdown." },
          level: { type: Type.STRING, description: "Interview seniority level (junior, mid, senior)." }
        },
        required: ["question", "answer", "level"]
      };
    } else if (type === "quiz") {
      prompt = `Generate an engaging multiple-choice code questions about "${subtopicName}" (Topic: "${topicName}"). Make the question tricky (e.g. related to closure variables, closures in loops, React batching triggers).`;
      
      schema = {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING, description: "The multiple choice question. It should test actual edge cases." },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Exactly 4 options to choose from."
          },
          correctIndex: { type: Type.INTEGER, description: "0-indexed position of the correct answer." },
          explanation: { type: Type.STRING, description: "Detailed structural explanation of the underlying runtime mechanics." }
        },
        required: ["question", "options", "correctIndex", "explanation"]
      };
    } else if (type === "concept") {
      prompt = `Generate a modern, highly focused syntax concept snippet or layout pattern for the subtopic "${subtopicName}" (Topic: "${topicName}"). Outline a clean practical scenario.`;
      
      schema = {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Clear descriptive concept name." },
          content: { type: Type.STRING, description: "Concept summary, explain why it works." },
          codeSnippet: { type: Type.STRING, description: "A highly-polished complete code block." }
        },
        required: ["title", "content"]
      };
    } else if (type === "coding") {
      prompt = `Generate a practical hands-on coding challenge or layout exercise for the subtopic "${subtopicName}" (Topic: "${topicName}").`;
      
      schema = {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Name of the problem." },
          difficulty: { type: Type.STRING, description: "Problem difficulty: easy, medium, hard." },
          problemStatement: { type: Type.STRING, description: "Clear, engaging problem description and instruction guides in markdown." },
          starterCode: { type: Type.STRING, description: "Initial setup code pattern or skeletal layout function." },
          solution: { type: Type.STRING, description: "Complete functional reference solution code for validation checks." }
        },
        required: ["title", "difficulty", "problemStatement", "solution"]
      };
    } else if (type === "flashcards") {
      prompt = `Generate a set of 5 highly helpful study flashcards for "${subtopicName}" (Topic: "${topicName}"). Each flashcard should have a clear concise front (question or term) and back (answer, explanation, or key takeaways with syntax examples).`;
      
      schema = {
        type: Type.OBJECT,
        properties: {
          flashcards: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                front: { type: Type.STRING, description: "A study question or key technical term." },
                back: { type: Type.STRING, description: "Clear definition, brief code snippet, or explanation." }
              },
              required: ["front", "back"]
            }
          }
        },
        required: ["flashcards"]
      };
    } else if (type === "roadmap") {
      prompt = `Generate a highly practical 4-step roadmap to master the concept "${subtopicName}" (Topic: "${topicName}"). Provide clear titles, estimated learning timeframe, core focus details, and 3 actionable checkable tasks for each milestone.`;
      
      schema = {
        type: Type.OBJECT,
        properties: {
          steps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                stepNum: { type: Type.INTEGER, description: "Step number from 1 to 4." },
                title: { type: Type.STRING, description: "Milestone focus title." },
                timeframe: { type: Type.STRING, description: "Estimated timeframe, e.g. 2 hours, 1 day." },
                focus: { type: Type.STRING, description: "Core description of what to master." },
                tasks: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "3 highly actionable tasks to check off."
                }
              },
              required: ["stepNum", "title", "timeframe", "focus", "tasks"]
            }
          }
        },
        required: ["steps"]
      };
    } else if (type === "tracker") {
      prompt = `Generate 1 crucial, high-yield interview topic or architectural scenario for the subtopic "${subtopicName}" (Topic: "${topicName}") that developers frequently get asked or fail at in FAANG/high-growth start-up interviews.`;
      
      schema = {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "A concise 10-15 word description of the interview topic/scenario (e.g., 'Debounce with trailing & leading edge configuration under heavy mousemove event bursts')." },
          notes: { type: Type.STRING, description: "A brief practical tip or hint for revision (e.g., 'Remember the difference between setTimeout id clearing and microtask scheduling')." }
        },
        required: ["title", "notes"]
      };
    } else {
      return res.status(400).json({ success: false, error: "Invalid type specified" });
    }

    const response = await generateWithRetry({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    const textResult = response.text || "{}";
    const parsed = JSON.parse(textResult.trim());
    return res.status(200).json({ success: true, result: parsed });

  } catch (error: any) {
    console.error("Gemini Generation API Error:", error);
    let friendlyMessage = "The AI study helper is currently experiencing extra high peak demand now. Please click the button to try again in a few seconds, or manually insert your learning entry!";
    if (error.message && error.message.includes("API_KEY")) {
      friendlyMessage = "API Key error: Please make sure a valid Gemini API Key is configured in your application environment.";
    }
    return res.status(503).json({ success: false, error: friendlyMessage });
  }
}
