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

// Helper: check or create screenshots folder in Google Drive
async function getOrCreateFolder(username: string, token: string): Promise<string> {
  const folderName = `${username} Screenshots Notes`;
  
  // 1. Search for folder
  const query = encodeURIComponent(`name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!searchRes.ok) {
    const errText = await searchRes.text();
    throw new Error(`Failed to search for folder in Google Drive: ${errText}`);
  }

  const searchData = await searchRes.json() as any;
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // 2. Folder not found, create it
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
    })
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create screenshots folder: ${errText}`);
  }

  const createData = await createRes.json() as any;
  return createData.id;
}

// Google Drive Screenshots Integration APIs

// API to list screenshots
app.get("/api/drive/screenshots", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  const username = req.query.username as string || "DefaultUser";

  if (!token) {
    return res.status(401).json({ success: false, error: "Missing authorization token" });
  }

  try {
    const folderId = await getOrCreateFolder(username, token);
    
    // List all files inside parents of folderId
    const query = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
    const listRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,createdTime,webViewLink,size)&orderBy=createdTime%20desc`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!listRes.ok) {
      const errText = await listRes.text();
      return res.status(listRes.status).json({ success: false, error: `Failed to list files: ${errText}` });
    }

    const listData = await listRes.json() as any;
    res.json({ success: true, files: listData.files || [] });
  } catch (error: any) {
    console.error("Error in /api/drive/screenshots GET:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API to upload pasted screenshot
app.post("/api/drive/screenshots", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  const { username, name, mimeType, base64Data } = req.body;

  if (!token) {
    return res.status(401).json({ success: false, error: "Missing authorization token" });
  }

  if (!base64Data) {
    return res.status(400).json({ success: false, error: "Missing base64Data image payload" });
  }

  try {
    const folderId = await getOrCreateFolder(username || "DefaultUser", token);

    // Filter out potential metadata header if exists (e.g. data:image/png;base64,...)
    const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Clean, "base64");

    const boundary = "screenshot_boundary_token_xyz_998877";
    const delimiter = `\r\n--${boundary}\r\n`;
    const close_delim = `\r\n--${boundary}--`;

    const metadata = {
      name: name || `screenshot_${Date.now()}.png`,
      parents: [folderId]
    };

    const multipartBody = Buffer.concat([
      Buffer.from(delimiter + "Content-Type: application/json; charset=UTF-8\r\n\r\n" + JSON.stringify(metadata) + delimiter + "Content-Type: " + (mimeType || "image/png") + "\r\n\r\n"),
      buffer,
      Buffer.from(close_delim)
    ]);

    const uploadRes = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
        "Content-Length": multipartBody.length.toString()
      },
      body: multipartBody
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      return res.status(uploadRes.status).json({ success: false, error: `Google Drive file write failed: ${errText}` });
    }

    const uploadData = await uploadRes.json() as any;
    res.json({ success: true, file: uploadData });
  } catch (error: any) {
    console.error("Error in /api/drive/screenshots POST:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API file downloading proxy with in-line query param token support (perfect for img elements)
app.get("/api/drive/file/:fileId", async (req, res) => {
  const fileId = req.params.fileId;
  const token = req.query.token as string || req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ success: false, error: "Missing credential token" });
  }

  try {
    // 1. Fetch metadata in parallel or sequence to read mimeType
    const metadataRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=mimeType`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    let mimeType = "image/png";
    if (metadataRes.ok) {
      const metadata = await metadataRes.json() as any;
      mimeType = metadata.mimeType || "image/png";
    }

    // 2. Fetch media bytes
    const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!fileRes.ok) {
      const errText = await fileRes.text();
      return res.status(fileRes.status).json({ success: false, error: `Failed to download file: ${errText}` });
    }

    const arrayBuffer = await fileRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader("Content-Type", mimeType);
    res.setHeader("Cache-Control", "public, max-age=31536000"); // 1 year cache
    res.send(buffer);
  } catch (error: any) {
    console.error("Error in /api/drive/file proxy:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API to delete a screenshot
app.delete("/api/drive/screenshots/:fileId", async (req, res) => {
  const fileId = req.params.fileId;
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ success: false, error: "Missing authorization token" });
  }

  try {
    const deleteRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: "DELETE",
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!deleteRes.ok) {
      const errText = await deleteRes.text();
      return res.status(deleteRes.status).json({ success: false, error: `Failed to delete file: ${errText}` });
    }

    res.json({ success: true, message: "File removed successfully" });
  } catch (error: any) {
    console.error("Error in /api/drive/screenshots delete:", error);
    res.status(500).json({ success: false, error: error.message });
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

// AI Rich-Text Note Polisher and Enterprise Enhancement Endpoint
app.post("/api/gemini/polish", async (req, res) => {
  const { content, mode } = req.body;

  if (!ai) {
    return res.status(503).json({
      success: false,
      error: "Gemini AI client is not configured. Please add your GEMINI_API_KEY in Settings."
    });
  }

  if (!content) {
    return res.status(400).json({ success: false, error: "Missing content payload to polish." });
  }

  try {
    let prompt = "";
    if (mode === "summarize") {
      prompt = `You are an elite research note summary architect. Take the following HTML content from a technical study note and generate an elegant executive summary block. At the end, compile the absolute top "Golden Takeaways" in clean bullet-points.
      
      CRITICAL INSTRUCTION: Return ONLY clean, beautifully formatted raw HTML. Do NOT wrap your output in standard markdown \`\`\`html code blocks. Return ONLY legal HTML tags (like headings, bold, standard lists, paragraph markers) fit to be injected directly inside a contentEditable document editor div.

      Input study note content:
      ${content}
      `;
    } else if (mode === "checklist") {
      prompt = `You are a curriculum coordinator. Take this technical study notepad content and identify all implied action items, practice tasks, concepts to research, or coding projects mentioned. Restructure them into a comprehensive series of actionable checklist items.
      
      CRITICAL INSTRUCTION: Return ONLY clean raw HTML where each checklist item is formatted exactly like our system design:
      <div style="margin-top: 0.35rem; margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.5rem;" contenteditable="true">
        <input type="checkbox" style="width: 1.15rem; height: 1.15rem; border-radius: 4px; border: 1.5px solid #d1d5db; accent-color: #fbbf24; cursor: pointer; margin: 0; flex-shrink: 0;" />
        <span style="flex: 1; outline: none; margin-left: 0.25rem;">[Core Task Title]</span>
      </div>
      Do NOT wrap your output in markdown \`\`\`html blocks. Return ONLY the raw HTML checklist list. 
      Ensure tasks cover all technical aspects mentioned.

      Input study note content:
      ${content}
      `;
    } else {
      // Default: polish
      prompt = `You are an elite, academy-level technical editor and academic editor. Review the following HTML study node. Polish any spelling or grammatical issues, organize information into balanced headings, format key terms or code keywords so they look clear using code font markers or bold text, and dramatically enhance the formatting, alignment, and structure to look extremely clean, mature, and professional. Keep all source content intact.
      
      CRITICAL INSTRUCTION: Return ONLY clean, beautifully formatted raw HTML. Do NOT wrap your output in standard markdown \`\`\`html blocks. Return ONLY raw legal HTML tags.

      Input study note content:
      ${content}
      `;
    }

    const response = await generateWithRetry({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    let cleanedHtml = (response.text || "").trim();
    
    // Safety clean: strip markdown code blocks if the model ignored instructions
    if (cleanedHtml.startsWith("```html")) {
      cleanedHtml = cleanedHtml.substring(7);
    } else if (cleanedHtml.startsWith("```")) {
      cleanedHtml = cleanedHtml.substring(3);
    }
    if (cleanedHtml.endsWith("```")) {
      cleanedHtml = cleanedHtml.substring(0, cleanedHtml.length - 3);
    }
    cleanedHtml = cleanedHtml.trim();

    return res.json({ success: true, result: cleanedHtml });

  } catch (error: any) {
    console.error("Note Polishing Error:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to process note alignment with AI." });
  }
});

// AI Command Execution Inside the Notepad
app.post("/api/gemini/command", async (req, res) => {
  const { content, command } = req.body;

  if (!ai) {
    return res.status(503).json({
      success: false,
      error: "Gemini AI client is not configured. Please add your GEMINI_API_KEY in Settings."
    });
  }

  if (!command) {
    return res.status(400).json({ success: false, error: "Missing command payload." });
  }

  try {
    const prompt = `You are an elite, AI-driven notepad assistant called "Notepad AI".
You receive the existing content of a study note (which may be empty, plain text, or rich HTML) and a natural language instruction or command from the user.
Your task is to modify, reformat, translate, extend, or rewrite the HTML content strictly following the user's instructions.

CRITICAL INSTRUCTIONS FOR CHECKLIST CREATION:
If the user asks to format materials into a checklist, write items as a checklist, arrange questions/list items into a checklist, or any similar checklist command, you MUST convert each item into the exact checklist HTML element template.
Checklist Item HTML Template (one per item):
<div style="margin-top: 0.35rem; margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.5rem;" contenteditable="true">
  <input type="checkbox" style="width: 1.15rem; height: 1.15rem; border-radius: 4px; border: 1.5px solid #d1d5db; accent-color: #fbbf24; cursor: pointer; margin: 0; flex-shrink: 0;" />
  <span style="flex: 1; outline: none; margin-left: 0.25rem;">[CONTENT]</span>
</div>

Replace [CONTENT] with the text of the item, preserving any code formatting, bolding, or styles if applicable.

OTHER FORMATTING INSTRUCTIONS:
- Return ONLY valid, clean, and beautifully structured HTML tags that are safe to insert inside a contenteditable workspace (e.g. <div>, <span>, <h2>, <h3>, <ul>, <li>, <p>, <b>, <i>, <pre>, <code>).
- Keep styles inline or use standard semantic HTML tags.
- NEVER wrap your output in markdown \`\`\`html blocks or other markdown decorators. Your response must be the raw HTML string itself!
- Be direct and concise; do not add introductory phrases like "Here is your updated checklist" or concluding remarks. Jump directly into the edited HTML note content.

User's Existing HTML Content:
${content || "*(Empty note)*"}

User's Command:
"${command}"

Provide the final HTML after executing the command:`;

    const response = await generateWithRetry({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    let cleanedHtml = (response.text || "").trim();

    // Safety clean: strip markdown code blocks if the model ignored instructions
    if (cleanedHtml.startsWith("```html")) {
      cleanedHtml = cleanedHtml.substring(7);
    } else if (cleanedHtml.startsWith("```")) {
      cleanedHtml = cleanedHtml.substring(3);
    }
    if (cleanedHtml.endsWith("```")) {
      cleanedHtml = cleanedHtml.substring(0, cleanedHtml.length - 3);
    }
    cleanedHtml = cleanedHtml.trim();

    return res.json({ success: true, result: cleanedHtml });

  } catch (error: any) {
    console.error("AI Command Error:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to process AI command in note." });
  }
});

// 4. YouTube Playlist Scraper with Intel Fallback
app.get("/api/youtube/playlist", async (req, res) => {
  const listIdQuery = req.query.list || req.query.playlistId || req.query.playlistUrl;
  const requestedToken = req.query.pageToken || req.query.nextPageToken || undefined;

  if (!listIdQuery) {
    return res.status(400).json({ 
      success: false, 
      error: "Please provide a 'list' query parameter (YouTube playlist ID/URL)." 
    });
  }

  try {
    const data = await fetchPlaylistDetailsAndItems(String(listIdQuery), requestedToken ? String(requestedToken) : undefined);
    return res.status(200).json(data);
  } catch (err: any) {
    console.error("[YouTube Playlist GET Express Error]", err);
    return res.status(500).json({ success: false, error: err.message || "Failed to process GET response" });
  }
});

app.post("/api/youtube/playlist", async (req, res) => {
  const { playlistUrl, playlistId, pageToken, nextPageToken } = req.body || {};
  const targetUrlOrId = playlistUrl || playlistId;
  const requestedToken = pageToken || nextPageToken || undefined;

  if (!targetUrlOrId) {
    return res.status(400).json({ 
      success: false, 
      error: "Please provide a 'playlistUrl' or 'playlistId' in the request body." 
    });
  }

  try {
    const data = await fetchPlaylistDetailsAndItems(targetUrlOrId, requestedToken);
    return res.status(200).json(data);
  } catch (err: any) {
    console.error("[YouTube Playlist POST Express Error]", err);
    return res.status(500).json({ success: false, error: err.message || "Failed to process POST response" });
  }
});

// Resilient core helper servicing both GET and POST requests
async function fetchPlaylistDetailsAndItems(inputStr: string, requestedToken?: string) {
  // 1. Extract clean playlistId
  let playlistId = "";
  try {
    const url = new URL(inputStr);
    playlistId = url.searchParams.get("list") || "";
  } catch (e) {
    const match = inputStr.match(/[&?]list=([^&]+)/) || inputStr.match(/list=([^&]+)/);
    if (match) playlistId = match[1];
  }

  // Fallback if input is already clean PL ID
  if (!playlistId && inputStr.match(/^PL[a-zA-Z0-9_-]+$/)) {
    playlistId = inputStr;
  }

  if (!playlistId) {
    throw new Error("Could not extract a valid YouTube Playlist ID (e.g., list=PL...)");
  }

  // 2. Resolve API Keys for official YouTube API lookup
  const ytApiKey = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_API_KEY || process.env.YOUTUBE_DEVELOPER_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY;

  let playlistTitle = "Curated YouTube Course";
  let videos: any[] = [];
  let nextToken: string | null = null;
  let sourceOfData = "";

  if (ytApiKey) {
    console.log(`[YouTube Playlist Fetcher] Utilizing official YouTube API key for ID: ${playlistId}`);
    try {
      // A. Fetch playlist title list metadata
      const metaRes = await fetch(
        `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${ytApiKey}`
      );
      if (metaRes.ok) {
        const metaData = await metaRes.json();
        if (metaData.items && metaData.items[0]) {
          playlistTitle = metaData.items[0].snippet?.title || "Curated YouTube Course";
        }
      }

      // B. Fetch playlist list items
      if (requestedToken) {
        // Fetch only single requested page
        const itemsRes = await fetch(
          `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,status,contentDetails&maxResults=50&playlistId=${playlistId}&pageToken=${requestedToken}&key=${ytApiKey}`
        );
        if (itemsRes.ok) {
          const itemsData = await itemsRes.json();
          nextToken = itemsData.nextPageToken || null;
          const items = itemsData.items || [];
          for (const item of items) {
            const snip = item.snippet;
            const status = item.status;
            if (!snip) continue;
            
            // Filter deleted or private videos
            const videoTitle = snip.title || "";
            const isPrivate = status?.privacyStatus === "private" || status?.privacyStatus === "privacyStatusUnspecified";
            const isDeleted = videoTitle === "Deleted video" || videoTitle === "Private video";
            if (isDeleted || isPrivate) continue;

            const videoId = snip.resourceId?.videoId;
            if (!videoId) continue;

            const thumbnail = snip.thumbnails?.maxres?.url || snip.thumbnails?.high?.url || snip.thumbnails?.medium?.url || snip.thumbnails?.default?.url || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
            videos.push({
              videoId,
              title: videoTitle,
              thumbnail,
              description: snip.description || `Lecture tutorial step for video ID ${videoId}`,
              url: `https://www.youtube.com/watch?v=${videoId}`
            });
          }
          sourceOfData = "official_youtube_api_paginated";
        } else {
          throw new Error(`YouTube API items fetch returned status: ${itemsRes.status}`);
        }
      } else {
        // Fetch recursively up to 150 items for user convenience
        let currentToken: string | undefined = undefined;
        let pagesCount = 0;
        
        while (pagesCount < 3) {
          const pageParam = currentToken ? `&pageToken=${currentToken}` : "";
          const itemsRes = await fetch(
            `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,status,contentDetails&maxResults=50&playlistId=${playlistId}${pageParam}&key=${ytApiKey}`
          );
          
          if (!itemsRes.ok) break;
          const itemsData = await itemsRes.json();
          const items = itemsData.items || [];
          
          for (const item of items) {
            const snip = item.snippet;
            const status = item.status;
            if (!snip) continue;
            
            const videoTitle = snip.title || "";
            const isPrivate = status?.privacyStatus === "private" || status?.privacyStatus === "privacyStatusUnspecified";
            const isDeleted = videoTitle === "Deleted video" || videoTitle === "Private video";
            if (isDeleted || isPrivate) continue;

            const videoId = snip.resourceId?.videoId;
            if (!videoId) continue;

            const thumbnail = snip.thumbnails?.maxres?.url || snip.thumbnails?.high?.url || snip.thumbnails?.medium?.url || snip.thumbnails?.default?.url || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
            videos.push({
              videoId,
              title: videoTitle,
              thumbnail,
              description: snip.description || `Lecture tutorial step for video ID ${videoId}`,
              url: `https://www.youtube.com/watch?v=${videoId}`
            });
          }

          currentToken = itemsData.nextPageToken;
          nextToken = currentToken || null;
          if (!currentToken) break;
          pagesCount++;
        }
        sourceOfData = "official_youtube_api";
      }

    } catch (apiErr) {
      console.error("[YouTube Playlist Fetcher] Official YouTube API call failed, attempting Scraping Fallback:", apiErr);
    }
  }

  // 3. HTML Scraping Fallback (No API Keys available or API Quota limited)
  if (videos.length === 0) {
    console.log(`[YouTube Playlist Fetcher] Running raw HTML scraper fallback for ID: ${playlistId}`);
    try {
      const response = await fetch(`https://www.youtube.com/playlist?list=${playlistId}&hl=en`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
        }
      });

      if (response.ok) {
        const html = await response.text();
        const match = html.match(/ytInitialData\s*=\s*({[\s\S]+?});\s*<\/script>/) || html.match(/ytInitialData\s*=\s*({[\s\S]+?});/);
        
        if (match) {
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
            
            const videoTitle = videoRenderer.title?.runs?.[0]?.text || videoRenderer.title?.simpleText || "Untitled Lecture Step";
            if (videoTitle === "Deleted video" || videoTitle === "Private video") continue;

            const thumbnail = videoRenderer.thumbnail?.thumbnails?.[2]?.url || videoRenderer.thumbnail?.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
            const description = videoRenderer.descriptionSnippet?.runs?.[0]?.text || `Reference lecture for video ID ${videoId}`;

            videos.push({
              videoId,
              title: videoTitle,
              thumbnail,
              description,
              url: `https://www.youtube.com/watch?v=${videoId}`
            });
          }
          sourceOfData = "youtube_html_scraping";
          console.log(`[YouTube Playlist Fetcher] Scraped ${videos.length} videos from html layout.`);
        }
      }
    } catch (scrapingErr) {
      console.error("[YouTube Playlist Fetcher] Scraping failed:", scrapingErr);
    }
  }

  // 4. Intelligent syllabus reconstruction generator using Gemini (Geo-blocked/rate-limited fallback)
  if (videos.length === 0) {
    console.log("[YouTube Playlist Fetcher] Scraping and official API returned no results. Launching Gemini AI fallback...");
    if (!geminiApiKey) {
      throw new Error("YouTube API and web crawler could not retrieve this playlist. Please configure GEMINI_API_KEY in the Settings menu to resolve missing playlist information instantly using intelligent fallback.");
    }

    const ai = new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const prompt = `You are a professional educational curriculum planner and YouTube playlist restorer. The user wants to import a YouTube Playlist. 
The Playlist URL or list ID refers to: "${inputStr}".
Please inspect the terms/slugs/words in this URL or playlist state to understand what academic or programming topic of information is covered. 
Then, generate a high-yield syllabus sequence of 8-12 tutorial/lecture video steps that perfectly corresponds to this playlist context.
Create realistic 11-character YouTube video IDs.
Make sure the video titles are chronological, highly informative, and academic. Set description notes beautifully.

Return standard JSON:
{
  "playlistTitle": "A descriptive beautiful title for this course playlist (e.g. 'Ultimate Full Stack Dev & API Systems')",
  "videos": [
    {
      "videoId": "11-char ID e.g. dQw4w9WgXcQ or other simulated hashes",
      "title": "Topic tutorial title (e.g. 'Section 1: Setting up the server environment')",
      "thumbnail": "https://img.youtube.com/vi/{videoId}/0.jpg",
      "description": "Critical study criteria, key takeaways, and what notes to document.",
      "url": "https://www.youtube.com/watch?v={videoId}"
    }
  ]
}`;

    const geminiResponse = await ai.models.generateContent({
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
    
    return {
      success: true,
      source: "gemini_intel_fallback",
      playlistTitle: parsed.playlistTitle || "Imported Course Syllabus (AI Restored)",
      videos: parsed.videos || []
    };
  }

  return {
    success: true,
    source: sourceOfData,
    playlistTitle,
    videos,
    nextPageToken: nextToken
  };
}

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
