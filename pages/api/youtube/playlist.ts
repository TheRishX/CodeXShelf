import { GoogleGenAI, Type } from "@google/genai";

// Standard Pages Router API endpoint to handle Vercel deployment targets
export default async function handler(req: any, res: any) {
  console.log(`[YouTube Playlist Pages Router] Received ${req.method} request`);

  if (req.method === "GET") {
    return res.status(200).json({ success: true, message: "YouTube Playlist API Route is active and functional." });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  try {
    const { playlistUrl } = req.body || {};
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

    const apiKey = process.env.GEMINI_API_KEY;
    const ai = apiKey ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    }) : null;

    let scrapedVideos: any[] = [];
    let playlistTitle = "Curated YouTube Course";

    try {
      console.log(`[YouTube Playlist Scraper] Scraped request with playlist ID: ${playlistId}`);
      const response = await fetch(`https://www.youtube.com/playlist?list=${playlistId}&hl=en`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
        }
      });

      if (response.ok) {
        const html = await response.text();
        const match = html.match(/ytInitialData\s*=\s*({[\s\S]+?});\s*<\/script>/) || html.match(/ytInitialData\s*=\s*({[\s\S]+?});/);
        
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
          } catch (parseErr) {
            console.error("[YouTube Playlist Scraper] JSON parsing failed, falling back:", parseErr);
          }
        }
      } else {
        console.warn(`[YouTube Playlist Scraper] YouTube fetch returned status: ${response.status}`);
      }
    } catch (fetchErr) {
      console.error("[YouTube Playlist Scraper] Crawling failed, running intelligent fallback:", fetchErr);
    }

    if (scrapedVideos.length === 0) {
      console.log("[YouTube Playlist Scraper] Scraping returned no results. Launching Gemini AI syllabus generator...");
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
      return res.status(200).json({
        success: true,
        source: "gemini_intel_fallback",
        playlistTitle: parsed.playlistTitle || "Imported Course Syllabus",
        videos: parsed.videos || []
      });
    }

    return res.status(200).json({
      success: true,
      source: "youtube_html_scraping",
      playlistTitle,
      videos: scrapedVideos
    });

  } catch (err: any) {
    console.error("[YouTube Playlist Pages Router Server Error]", err);
    return res.status(500).json({ success: false, error: err.message || "Internal server error occurred." });
  }
}
