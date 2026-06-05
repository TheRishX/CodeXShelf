import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Resolve paths for ES Module environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Port and host specifications
const PORT = 3000;
const app = express();

app.use(express.json({ limit: '10mb' }));

// Set up server-side storage path
const STORE_PATH = path.join(process.cwd(), "data-store.json");

// Helper: load store
function loadStore() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const content = fs.readFileSync(STORE_PATH, "utf-8");
      return JSON.parse(content);
    }
  } catch (error) {
    console.error("Error reading store from data-store.json:", error);
  }
  return null;
}

// Helper: save store
function saveStore(data: any) {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (error) {
    console.error("Error writing store to data-store.json:", error);
    return false;
  }
}

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
} else {
  console.warn("GEMINI_API_KEY is not defined in environment variables. AI operations will fail-fast.");
}

// Helper: generateContent with retry for transient 503/429/500 errors
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

// REST API Endpoints

// 0. Health checks for container orchestration and rollout validation
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

app.get("/healthz", (req, res) => {
  res.status(200).send("OK");
});

// 1. Get current store state
app.get("/api/data", (req, res) => {
  const store = loadStore();
  if (store) {
    res.json({ success: true, data: store });
  } else {
    res.json({ success: false, message: "No stored data found" });
  }
});

// 2. Save/Sync store state
app.post("/api/data", (req, res) => {
  const data = req.body;
  if (!data) {
    return res.status(400).json({ success: false, error: "Empty state provided" });
  }
  const result = saveStore(data);
  if (result) {
    res.json({ success: true, message: "Data synced successfully to cloud storage" });
  } else {
    res.status(500).json({ success: false, error: "Failed to persist database state" });
  }
});

// 3. Gemini Prompt Generator endpoint
app.post("/api/gemini/generate", async (req, res) => {
  const { type: rawType, topicName, subtopicName, context } = req.body;

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

      return res.json({ success: true, result: response.text });
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
    res.json({ success: true, result: parsed });

  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    let friendlyMessage = "The AI study helper is currently experiencing extra high peak demand now. Please click the button to try again in a few seconds, or manually insert your learning entry!";
    if (error.message && error.message.includes("API_KEY")) {
      friendlyMessage = "API Key error: Please make sure a valid Gemini API Key is configured in your application environment.";
    }
    res.status(503).json({ success: false, error: friendlyMessage });
  }
});

// 4. YouTube Playlist Scraper with Intel Fallback
app.get("/api/youtube/playlist", (req, res) => {
  res.json({ success: true, message: "YouTube Playlist API is active." });
});

app.post("/api/youtube/playlist", async (req, res) => {
  const { playlistUrl } = req.body;
  if (!playlistUrl) {
    return res.status(400).json({ success: false, error: "Please provide a YouTube playlist URL." });
  }

  // extract list parameter
  let playlistId = "";
  try {
    const url = new URL(playlistUrl);
    playlistId = url.searchParams.get("list") || "";
  } catch (e) {
    // try matching PL...
    const match = playlistUrl.match(/[&?]list=([^&]+)/) || playlistUrl.match(/list=([^&]+)/);
    if (match) playlistId = match[1];
  }

  // Raw playlist ID input
  if (!playlistId && playlistUrl.match(/^PL[a-zA-Z0-9_-]+$/)) {
    playlistId = playlistUrl;
  }

  if (!playlistId) {
    return res.status(400).json({ success: false, error: "Could not extract a valid YouTube Playlist ID (e.g. 'list=PL...')" });
  }

  try {
    console.log(`[YouTube Playlist Fetcher] Fetching playlist ID: ${playlistId}`);
    const response = await fetch(`https://www.youtube.com/playlist?list=${playlistId}&hl=en`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const html = await response.text();
    const match = html.match(/ytInitialData\s*=\s*({[\s\S]+?});\s*<\/script>/) || html.match(/ytInitialData\s*=\s*({[\s\S]+?});/);
    
    let scrapedVideos: any[] = [];
    let playlistTitle = "Curated YouTube Course";

    if (match) {
      try {
        const jsonStr = match[1];
        const data = JSON.parse(jsonStr);
        playlistTitle = data.metadata?.playlistMetadataRenderer?.title || "Curated YouTube Course";

        const playlistVideoListRenderer = data.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents?.[0]?.playlistVideoListRenderer;
        const contents = playlistVideoListRenderer?.contents || [];

        for (const item of contents) {
          const videoRenderer = item.playlistVideoRenderer;
          if (!videoRenderer) continue;
          const videoId = videoRenderer.videoId;
          if (!videoId) continue;
          const title = videoRenderer.title?.runs?.[0]?.text || videoRenderer.title?.simpleText || "Untitled Lecture Step";
          const thumbnail = videoRenderer.thumbnail?.thumbnails?.[2]?.url || videoRenderer.thumbnail?.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
          const description = videoRenderer.descriptionSnippet?.runs?.[0]?.text || `Reference lecture for video ID ${videoId}`;

          scrapedVideos.push({
            videoId,
            title,
            thumbnail,
            description,
            url: `https://www.youtube.com/watch?v=${videoId}`
          });
        }
        console.log(`[YouTube Playlist Fetcher] Parsed ${scrapedVideos.length} videos successfully.`);
      } catch (parseErr) {
        console.error("[YouTube Playlist Fetcher] JSON parsing failed, resorting to intelligent fallback:", parseErr);
      }
    }

    // Fallback if scraping did not return any videos or failed (Geo-blocked/rate-limited inside container)
    if (scrapedVideos.length === 0) {
      console.log("[YouTube Playlist Fetcher] Scraping list returned empty. Triggering Intelligent fallback with Gemini API.");
      if (!ai) {
        return res.status(503).json({
          success: false,
          error: "Your playlist scraper could not crawl YouTube directly, and Gemini is not configured in Settings to generate a syllabus. Please configure GEMINI_API_KEY."
        });
      }

      const prompt = `You are a professional educational curriculum planner and YouTube playlist restorer. The user wants to import a YouTube Playlist. 
The Playlist URL or list ID is "${playlistUrl}".
Please inspect the terms in this URL to understand what topic is covered. Then generate a high-yield syllabus sequence of 8-12 tutorial/lecture video steps that corresponds to this playlist context.
Give them realistic 11-character YouTube video IDs.
Make sure the video titles are chronological, highly informative, and academic. Set the descriptions beautifully to act as study notes.

Return a JSON with the following structure:
{
  "playlistTitle": "A descriptive academic title for this course playlist (e.g. 'Ultimate Full Stack Dev & API Systems')",
  "videos": [
    {
      "videoId": "11-char ID e.g. PLtSg86T2e0 or other beautiful hashes",
      "title": "Clear tutorial title (e.g. 'Step 1: Setting up the Express and Vite bundler')",
      "thumbnail": "https://img.youtube.com/vi/{videoId}/0.jpg",
      "description": "Explains study criteria and highlights to watch out for.",
      "url": "https://www.youtube.com/watch?v={videoId}"
    }
  ]
}`;

      const geminiResponse = await generateWithRetry({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              playlistTitle: { type: Type.STRING },
              videos: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    videoId: { type: Type.STRING },
                    title: { type: Type.STRING },
                    thumbnail: { type: Type.STRING },
                    description: { type: Type.STRING },
                    url: { type: Type.STRING }
                  },
                  required: ["videoId", "title", "thumbnail", "url"]
                }
              }
            },
            required: ["playlistTitle", "videos"]
          }
        }
      });

      const textResult = geminiResponse.text || "{}";
      const parsed = JSON.parse(textResult.trim());
      return res.json({
        success: true,
        source: "gemini_intel_fallback",
        playlistTitle: parsed.playlistTitle || "Imported Course Syllabus",
        videos: parsed.videos || []
      });
    }

    res.json({
      success: true,
      source: "youtube_html_scraping",
      playlistTitle,
      videos: scrapedVideos
    });

  } catch (error: any) {
    console.error("[YouTube Playlist API Error]", error);
    res.status(500).json({ success: false, error: error.message || "Failed to fetch YouTube playlist" });
  }
});

// Serve frontend assets in production or mount Vite middleware in development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CodeXshelf server running successfully on http://0.0.0.0:${PORT}`);
  });
}

startServer();
