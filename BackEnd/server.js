const express = require("express");
const axios = require("axios");
const cors = require("cors");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

dotenv.config();
const app = express();
app.use(cors(
  {
  origin: "http://localhost:5173", // or your frontend URL
  methods: ["GET", "POST"],
  credentials: true
  }
));
app.use(express.json());

const PORT = process.env.PORT || 5000;

// ✅ Health check
app.get("/", (req, res) => {
  res.send("🚀 Code Karaoke Backend Running!");
});

// Helper function to poll Suno API for task completion
async function pollSunoTask(taskId, maxAttempts = 30, intervalMs = 10000) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await axios.get(`https://api.sunoapi.org/api/v1/generate/record-info?taskId=${taskId}`, {
        headers: {
          "Authorization": `Bearer ${process.env.SUNO_API_KEY}`,
        },
      });
      
      console.log(`Poll attempt ${attempt + 1} response:`, response.data);
      
      if (response.data.code === 200 && response.data.data) {
        const taskData = response.data.data;
        
        // Check if task is successful and has audio data
        if (taskData.status === 'SUCCESS' && taskData.response && taskData.response.sunoData) {
          const songs = taskData.response.sunoData;
          const completedSong = songs.find(song => song.audioUrl);
          if (completedSong) {
            return completedSong;
          }
        }
        
        // Also check during TEXT_SUCCESS or FIRST_SUCCESS for available audio
        if ((taskData.status === 'TEXT_SUCCESS' || taskData.status === 'FIRST_SUCCESS') && taskData.response && taskData.response.sunoData) {
          const songs = taskData.response.sunoData;
          console.log(`Checking sunoData array (length: ${songs.length}):`, songs.map(s => ({ id: s.id, audioUrl: s.audioUrl, status: s.status })));
          
          // Look for a song with audioUrl available
          const completedSong = songs.find(song => song.audioUrl && song.audioUrl.trim() !== '');
          if (completedSong) {
            console.log('Found completed song with audioUrl:', completedSong.audioUrl);
            return completedSong;
          }
        }
        
        // Check if task failed
        if (taskData.status === 'CREATE_TASK_FAILED' || taskData.status === 'GENERATE_AUDIO_FAILED') {
          throw new Error(`Suno task failed: ${taskData.errorMessage || taskData.status}`);
        }
        
        // If still pending, continue polling
        if (taskData.status === 'PENDING' || taskData.status === 'TEXT_SUCCESS' || taskData.status === 'FIRST_SUCCESS') {
          console.log(`Task status: ${taskData.status}, continuing to poll...`);
        }
      }
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    } catch (error) {
      console.error(`Poll attempt ${attempt + 1} failed:`, error.response?.data || error.message);
      if (attempt === maxAttempts - 1) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }
  
  throw new Error('Suno task timed out - song generation took too long');
}

// 🎤🎶 Generate Karaoke Audio using Suno API
app.post("/api/karaoke-audio", async (req, res) => {
  try {
    const { lyrics, genre, voice } = req.body;
    
    if (!lyrics) {
      return res.status(400).json({ error: "Lyrics are required" });
    }
    
    console.log('SUNO REQUEST:', { lyrics, genre, voice });
    
    // Map genre to music style
    const genreMapping = {
      'anime': 'J-Pop, Anime',
      'pop': 'Pop',
      'rap': 'Hip-Hop, Rap',
      'rock': 'Rock',
      'jazz': 'Jazz',
      'classical': 'Classical'
    };
    
    const musicStyle = genreMapping[genre?.toLowerCase()] || 'Pop';
    
    // Prepare Suno API request
    const sunoPayload = {
      customMode: true,
      instrumental: false,
      model: "V4",
      prompt: lyrics, // This will be sung as lyrics
      style: musicStyle,
      title: "Code Karaoke Song",
      vocalGender: voice?.toLowerCase() === 'female' ? 'f' : 'm',
      styleWeight: 0.7,
      weirdnessConstraint: 0.3,
      audioWeight: 0.7,
      callBackUrl: `http://localhost:${PORT}/api/suno-callback` // Required by Suno API
    };
    
    // Generate music with Suno API
    const sunoResponse = await axios.post(
      process.env.SUNO_API_URL,
      sunoPayload,
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.SUNO_API_KEY}`,
        },
      }
    );
    
    console.log('SUNO RESPONSE:', sunoResponse.data);
    
    if (sunoResponse.data.code !== 200) {
      throw new Error(`Suno API error: ${sunoResponse.data.msg || 'Unknown error'}`);
    }
    
    const taskId = sunoResponse.data.data.taskId;
    console.log('SUNO TASK ID:', taskId);
    
    // Poll for completion
    console.log('Polling for Suno task completion...');
    const completedSong = await pollSunoTask(taskId, 60, 5000); // Increased attempts and reduced interval
    
    console.log('SUNO SONG COMPLETED:', completedSong.audioUrl);
    
    // Download the generated audio
    const audioResponse = await axios.get(completedSong.audioUrl, {
      responseType: "arraybuffer",
    });
    
    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Disposition": "inline; filename=karaoke.mp3",
    });
    res.send(audioResponse.data);
    
  } catch (error) {
    console.error('SUNO KARAOKE ERROR:', error.response?.data || error.message);
    res.status(500).json({ 
      error: "Failed to generate karaoke audio", 
      details: error.response?.data || error.message 
    });
  }
});

// 🎤 Generate Lyrics
app.post("/api/lyrics", async (req, res) => {
  try {
    const { code, genre, language } = req.body;
    console.log('LYRICS REQUEST:', { code, genre, language });
    // GPT-4o expects a chat completion format
      let systemPrompt = `You are a creative assistant that turns code into karaoke lyrics. Genre: ${genre}, Language: ${language}.`;
      let userPrompt = `Convert this code to karaoke lyrics. The lyrics should be suitable for singing and flowing musically.\n${code}`;
      let maxTokens = 256;

    const payload = {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: maxTokens,
      temperature: 0.8
    };
    const response = await axios.post(
      process.env.LYRICS_API_URL,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.LYRICS_API_KEY}`,
        },
      }
    );
    console.log('LYRICS RESPONSE:', response.data);
    // Extract lyrics from OpenAI response and trim empty lines
    let lyrics = '';
    if (response.data.choices && response.data.choices[0]?.message?.content) {
      lyrics = response.data.choices[0].message.content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    } else {
      lyrics = ['No lyrics generated.'];
    }
    res.json({ lyrics });
  } catch (error) {
    console.error('LYRICS ERROR:', error.response?.data || error.message, error.config || '');
    res.status(500).json({ error: "Failed to generate lyrics", details: error.response?.data || error.message });
  }
});

// 🎵 Suno API Callback Endpoint (required but we use polling instead)
app.post("/api/suno-callback", (req, res) => {
  console.log('SUNO CALLBACK RECEIVED:', req.body);
  res.json({ status: "received" });
});


// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});
