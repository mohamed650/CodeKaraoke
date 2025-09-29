const express = require("express");
const axios = require("axios");
const cors = require("cors");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

dotenv.config();
const app = express();
app.use(
  cors({
    origin: "http://localhost:5173", // or your frontend URL
    methods: ["GET", "POST"],
    credentials: true,
  })
);
app.use(express.json());

const PORT = process.env.PORT || 5000;

// ✅ Health check
app.get("/", (req, res) => {
  res.send("🚀 Code Karaoke Backend Running!");
});

// 🎵 Calculate lyrics duration (English only)
function calculateLyricsDuration(lyrics) {
  if (!lyrics || typeof lyrics !== "string") {
    return 40; // fallback
  }

  const cleanLyrics = lyrics.trim().replace(/\n\s*\n/g, "\n");
  const lines = cleanLyrics.split("\n").filter((line) => line.trim().length > 0);

  // Count English words
  const englishWords = (lyrics.match(/\b[a-zA-Z]+\b/g) || []).length;

  console.log(`📊 Lyrics analysis: ${lines.length} lines, ${englishWords} words`);

  const timingRate = 1.8; // words per second
  const lyricsTime = englishWords / timingRate;
  const introTime = 4;
  const outroTime = 3;
  const pauseTime = lines.length * 0.5;

  const totalDuration = lyricsTime + introTime + outroTime + pauseTime;

  console.log(
    `📊 Duration calculation: ${lyricsTime.toFixed(
      1
    )}s lyrics + ${introTime}s intro + ${outroTime}s outro + ${pauseTime.toFixed(
      1
    )}s pauses = ${totalDuration.toFixed(1)}s total`
  );

  return Math.ceil(totalDuration);
}

// Helper function to poll Suno API for task completion
async function pollSunoTask(
  taskId,
  maxAttempts = 30,
  intervalMs = 10000,
  waitForFullSuccess = false
) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await axios.get(
        `https://api.sunoapi.org/api/v1/generate/record-info?taskId=${taskId}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.SUNO_API_KEY}`,
          },
        }
      );

      console.log(`Poll attempt ${attempt + 1} response:`, response.data);

      if (response.data.code === 200 && response.data.data) {
        const taskData = response.data.data;

        if (
          taskData.status === "SUCCESS" &&
          taskData.response &&
          taskData.response.sunoData
        ) {
          const songs = taskData.response.sunoData;
          const completedSong = songs.find((song) => song.audioUrl);
          if (completedSong) {
            return { song: completedSong, fullSuccess: true };
          }
        }

        if (
          !waitForFullSuccess &&
          (taskData.status === "TEXT_SUCCESS" ||
            taskData.status === "FIRST_SUCCESS") &&
          taskData.response &&
          taskData.response.sunoData
        ) {
          const songs = taskData.response.sunoData;
          console.log(
            `Checking sunoData array (length: ${songs.length}):`,
            songs.map((s) => ({
              id: s.id,
              audioUrl: s.audioUrl,
              status: s.status,
            }))
          );

          const completedSong = songs.find(
            (song) => song.audioUrl && song.audioUrl.trim() !== ""
          );
          if (completedSong) {
            console.log("Found completed song with audioUrl:", completedSong.audioUrl);
            return { song: completedSong, fullSuccess: false };
          }
        }

        if (
          taskData.status === "CREATE_TASK_FAILED" ||
          taskData.status === "GENERATE_AUDIO_FAILED"
        ) {
          throw new Error(
            `Suno task failed: ${taskData.errorMessage || taskData.status}`
          );
        }

        if (
          taskData.status === "PENDING" ||
          taskData.status === "TEXT_SUCCESS" ||
          taskData.status === "FIRST_SUCCESS"
        ) {
          console.log(`Task status: ${taskData.status}, continuing to poll...`);
        }
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    } catch (error) {
      console.error(
        `Poll attempt ${attempt + 1} failed:`,
        error.response?.data || error.message
      );
      if (attempt === maxAttempts - 1) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  throw new Error("Suno task timed out - song generation took too long");
}

// 🎤🎶 Generate Karaoke Audio using Suno API
app.post("/api/karaoke-audio", async (req, res) => {
  try {
    const { lyrics, genre, voice } = req.body;

    if (!lyrics) {
      return res.status(400).json({ error: "Lyrics are required" });
    }

    console.log("SUNO REQUEST:", { lyrics, genre, voice });

    const genreMapping = {
      anime: "J-Pop, Anime",
      pop: "Pop",
      rap: "Hip-Hop, Rap",
      rock: "Rock",
      jazz: "Jazz",
      classical: "Classical",
    };

    const musicStyle = genreMapping[genre?.toLowerCase()] || "Pop";

    const sunoPayload = {
      customMode: true,
      instrumental: false,
      model: "V4",
      prompt: lyrics,
      style: musicStyle,
      title: "Code Karaoke Song",
      vocalGender: voice?.toLowerCase() === "female" ? "f" : "m",
      styleWeight: 0.7,
      weirdnessConstraint: 0.3,
      audioWeight: 0.7,
      callBackUrl: `http://localhost:${PORT}/api/suno-callback`,
    };

    const sunoResponse = await axios.post(process.env.SUNO_API_URL, sunoPayload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SUNO_API_KEY}`,
      },
    });

    console.log("SUNO RESPONSE:", sunoResponse.data);

    if (sunoResponse.data.code !== 200) {
      throw new Error(`Suno API error: ${sunoResponse.data.msg || "Unknown error"}`);
    }

    const taskId = sunoResponse.data.data.taskId;
    console.log("SUNO TASK ID:", taskId);

    console.log("Polling for Suno task completion...");
    const result = await pollSunoTask(taskId, 60, 5000);
    const completedSong = result.song;

    console.log("SUNO SONG COMPLETED:", completedSong.audioUrl);

    const finalAudioUrl = completedSong.audioUrl;
    console.log("✅ Using full audio for karaoke:", finalAudioUrl);

    let timestampedLyrics = null;

    const timeStampPayload = {
      taskId: taskId,
      audioId: completedSong.id,
      musicIndex: 0,
    };
    console.log("Timestamp payload:", timeStampPayload);

    try {
      console.log("🎵 Fetching timestamped lyrics from audio...");

      if (!result.fullSuccess) {
        console.log(
          "⏱️ Audio ready but waiting for full completion before fetching timestamps..."
        );
        try {
          await pollSunoTask(taskId, 20, 3000, true);
          console.log("✅ Full success achieved, proceeding with timestamp fetch");
        } catch (timeoutError) {
          console.log("⚠️ Full success timeout, proceeding anyway with delay...");
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }

      const timestampedResponse = await axios.post(
        process.env.SUNO_TIMESTAMPED_API_URL,
        timeStampPayload,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.SUNO_API_KEY}`,
          },
        }
      );

      console.log("Timestamped response:", timestampedResponse.data);

      if (timestampedResponse.data.code === 200) {
        timestampedLyrics = timestampedResponse.data.data;
        console.log("✅ Successfully fetched timestamped lyrics from full audio");
      } else {
        console.warn("⚠️ Could not fetch timestamped lyrics:", timestampedResponse.data.msg);
      }
    } catch (timestampError) {
      console.warn("⚠️ Error fetching timestamped lyrics:", timestampError.message);
    }

    res.json({
      audioUrl: finalAudioUrl,
      audioId: completedSong.id,
      taskId: taskId,
      timestampedLyrics: timestampedLyrics,
      success: true,
    });
  } catch (error) {
    console.error("SUNO KARAOKE ERROR:", error.response?.data || error.message);
    res.status(500).json({
      error: "Failed to generate karaoke audio",
      details: error.response?.data || error.message,
    });
  }
});

function cleanLyrics(rawLyrics) {
  return rawLyrics
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.replace(/^\(.*?\)\s*/g, ""))
    .map((line) => line.replace(/^\[.*?\]\s*/g, ""))
    .map((line) => line.replace(/^(Verse|Chorus|Outro).*$/gi, ""))
    .filter((line) => line.length > 0);
}

// 🎤 Generate Lyrics
app.post("/api/lyrics", async (req, res) => {
  try {
    const { code, genre, language } = req.body;
    console.log("LYRICS REQUEST:", { code, genre, language });

    let systemPrompt = `You are a creative assistant that turns code into karaoke lyrics. 
      Always output lyrics as plain lines only — no labels, no headings, no section names. Genre: ${genre}, Language: ${language}.`;
    let userPrompt = `Convert this code to karaoke lyrics. 
      ⚠️ STRICT RULE: Do NOT include any section labels like "chorus", "verse", "outro", 
      or anything in parentheses/brackets. ONLY output plain lyric lines. 
      The lyrics should flow musically and be suitable for singing.
      Create a complete song.\n${code}`;
    let maxTokens = 512;

    const payload = {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature: 0.8,
    };

    const response = await axios.post(process.env.LYRICS_API_URL, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.LYRICS_API_KEY}`,
      },
    });

    console.log("LYRICS RESPONSE:", response.data);

    let lyrics = "";
    if (response.data.choices && response.data.choices[0]?.message?.content) {
      let rawLyrics = response.data.choices[0].message.content;
      lyrics = cleanLyrics(rawLyrics);
    } else {
      lyrics = ["No lyrics generated."];
    }
    res.json({ lyrics });
  } catch (error) {
    console.error(
      "LYRICS ERROR:",
      error.response?.data || error.message,
      error.config || ""
    );
    res.status(500).json({
      error: "Failed to generate lyrics",
      details: error.response?.data || error.message,
    });
  }
});

// 🎵 Suno API Callback Endpoint
app.post("/api/suno-callback", (req, res) => {
  console.log("SUNO CALLBACK RECEIVED:", req.body);
  res.json({ status: "received" });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});
