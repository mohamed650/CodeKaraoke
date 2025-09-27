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

// 🎵 Helper function to analyze content for language-specific timing
function analyzeContentForTiming(lyrics) {
  // Unicode ranges for different character types
  const hiraganaRegex = /[\u3040-\u309F]/g;
  const katakanaRegex = /[\u30A0-\u30FF]/g;
  const kanjiRegex = /[\u4E00-\u9FAF]/g;
  const chineseRegex = /[\u4E00-\u9FFF]/g; // Extended Chinese range
  const koreanRegex = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/g;
  const englishWordsRegex = /\b[a-zA-Z]+\b/g;
  
  const hiraganaCount = (lyrics.match(hiraganaRegex) || []).length;
  const katakanaCount = (lyrics.match(katakanaRegex) || []).length;
  const kanjiCount = (lyrics.match(kanjiRegex) || []).length;
  const chineseCount = (lyrics.match(chineseRegex) || []).length;
  const koreanCount = (lyrics.match(koreanRegex) || []).length;
  const englishWords = (lyrics.match(englishWordsRegex) || []).length;
  
  const totalJapanese = hiraganaCount + katakanaCount + kanjiCount;
  const totalChars = lyrics.length;
  
  console.log(`🎭 Language analysis: Hiragana: ${hiraganaCount}, Katakana: ${katakanaCount}, Kanji: ${kanjiCount}, Chinese: ${chineseCount}, Korean: ${koreanCount}, English words: ${englishWords}`);
  
  // Determine primary language and calculate timing
  let primaryLanguage = 'english';
  let timingRate = 1.8; // words per second for English
  let contentUnits = englishWords;
  
  if (totalJapanese > totalChars * 0.3) {
    primaryLanguage = 'japanese';
    timingRate = 1.0; // characters per second for Japanese
    contentUnits = totalJapanese;
  } else if (chineseCount > totalChars * 0.3) {
    primaryLanguage = 'chinese';
    timingRate = 1.2; // characters per second for Chinese
    contentUnits = chineseCount;
  } else if (koreanCount > totalChars * 0.3) {
    primaryLanguage = 'korean';
    timingRate = 1.1; // characters per second for Korean
    contentUnits = koreanCount;
  }
  
  console.log(`🌏 Detected primary language: ${primaryLanguage}, Content units: ${contentUnits}, Timing rate: ${timingRate} units/sec`);
  
  return { primaryLanguage, timingRate, contentUnits };
}

// 🎵 Calculate dynamic lyrics duration based on content (language-aware)
function calculateLyricsDuration(lyrics) {
  if (!lyrics || typeof lyrics !== 'string') {
    return 40; // Fallback to 40 seconds
  }
  
  // Clean up lyrics and split into meaningful lines
  const cleanLyrics = lyrics.trim().replace(/\n\s*\n/g, '\n'); // Remove empty lines
  const lines = cleanLyrics.split('\n').filter(line => line.trim().length > 0);
  
  // Analyze content for language-specific timing
  const { primaryLanguage, timingRate, contentUnits } = analyzeContentForTiming(lyrics);
  
  console.log(`📊 Lyrics analysis: ${lines.length} lines, ${contentUnits} ${primaryLanguage === 'english' ? 'words' : 'characters'}`);
  
  // Language-aware timing calculation
  const lyricsTime = contentUnits / timingRate;
  const introTime = 4;
  const outroTime = 3;
  const pauseTime = lines.length * 0.5; // 0.5 seconds pause between lines
  
  const totalDuration = lyricsTime + introTime + outroTime + pauseTime;
  
  console.log(`📊 Duration calculation (${primaryLanguage}): ${lyricsTime.toFixed(1)}s lyrics + ${introTime}s intro + ${outroTime}s outro + ${pauseTime.toFixed(1)}s pauses = ${totalDuration.toFixed(1)}s total`);
  
  return Math.ceil(totalDuration);
}



// Helper function to poll Suno API for task completion
async function pollSunoTask(taskId, maxAttempts = 30, intervalMs = 10000, waitForFullSuccess = false) {
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
            return { song: completedSong, fullSuccess: true };
          }
        }
        
        // If not waiting for full success, also check during TEXT_SUCCESS or FIRST_SUCCESS for available audio
        if (!waitForFullSuccess && (taskData.status === 'TEXT_SUCCESS' || taskData.status === 'FIRST_SUCCESS') && taskData.response && taskData.response.sunoData) {
          const songs = taskData.response.sunoData;
          console.log(`Checking sunoData array (length: ${songs.length}):`, songs.map(s => ({ id: s.id, audioUrl: s.audioUrl, status: s.status })));
          
          // Look for a song with audioUrl available
          const completedSong = songs.find(song => song.audioUrl && song.audioUrl.trim() !== '');
          if (completedSong) {
            console.log('Found completed song with audioUrl:', completedSong.audioUrl);
            return { song: completedSong, fullSuccess: false };
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
    const result = await pollSunoTask(taskId, 60, 5000); // Increased attempts and reduced interval
    const completedSong = result.song;
    
    console.log('SUNO SONG COMPLETED:', completedSong.audioUrl);
    
    // � Use the full audio without trimming
    const finalAudioUrl = completedSong.audioUrl;
    console.log('✅ Using full audio for karaoke:', finalAudioUrl);
    
    // 🎵 Generate timestamped lyrics from the complete audio
    let timestampedLyrics = null;
    
    const timeStampPayload = {
      taskId: taskId,
      audioId: completedSong.id,
      musicIndex: 0
    }
    console.log('Timestamp payload:', timeStampPayload);
    
    try {
      console.log('🎵 Fetching timestamped lyrics from audio...');
      
      // If we don't have full success yet, wait for it or add delay
      if (!result.fullSuccess) {
        console.log('⏱️ Audio ready but waiting for full completion before fetching timestamps...');
        try {
          // Try to wait for full success
          const fullResult = await pollSunoTask(taskId, 20, 3000, true); // Wait for full success
          console.log('✅ Full success achieved, proceeding with timestamp fetch');
        } catch (timeoutError) {
          console.log('⚠️ Full success timeout, proceeding anyway with delay...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
      
      const timestampedResponse = await axios.post(
        process.env.SUNO_TIMESTAMPED_API_URL,
        timeStampPayload,
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.SUNO_API_KEY}`,
          },
        }
      );

      console.log('Timestamped response:', timestampedResponse.data);
      
      if (timestampedResponse.data.code === 200) {
        timestampedLyrics = timestampedResponse.data.data;
        console.log('✅ Successfully fetched timestamped lyrics from full audio');
      } else {
        console.warn('⚠️ Could not fetch timestamped lyrics:', timestampedResponse.data.msg);
        
        // If it's still not ready, try one more time after additional delay
        if (timestampedResponse.data.msg && timestampedResponse.data.msg.includes('unsuccessful')) {
          console.log('🔄 Retrying timestamped lyrics fetch after 5 more seconds...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          const retryResponse = await axios.post(
            process.env.SUNO_TIMESTAMPED_API_URL,
            timeStampPayload,
            {
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.SUNO_API_KEY}`,
              },
            }
          );
          
          if (retryResponse.data.code === 200) {
            timestampedLyrics = retryResponse.data.data;
            console.log('✅ Successfully fetched timestamped lyrics on retry');
          } else {
            console.warn('⚠️ Retry failed for timestamped lyrics:', retryResponse.data.msg);
          }
        }
      }
    } catch (timestampError) {
      console.warn('⚠️ Error fetching timestamped lyrics:', timestampError.message);
      // Continue without timestamped lyrics - not a critical error
    }
    
    // Return audio metadata with ID and timestamped lyrics
    res.json({
      audioUrl: finalAudioUrl, // Use full audio URL
      audioId: completedSong.id,
      taskId: taskId,
      timestampedLyrics: timestampedLyrics, // Include timestamped lyrics in response
      success: true
    });
    
  } catch (error) {
    console.error('SUNO KARAOKE ERROR:', error.response?.data || error.message);
    res.status(500).json({ 
      error: "Failed to generate karaoke audio", 
      details: error.response?.data || error.message 
    });
  }
});


function cleanLyrics(rawLyrics) {
  return rawLyrics
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => line.replace(/^\(.*?\)\s*/g, ""))  // remove (Verse), (Chorus), etc
    .map(line => line.replace(/^\[.*?\]\s*/g, ""))  // remove [Verse], [Chorus], etc
    .map(line => line.replace(/^(Verse|Chorus|Outro).*$/gi, "")) // standalone section words
    .filter(line => line.length > 0);
}


// �🎤 Generate Lyrics
app.post("/api/lyrics", async (req, res) => {
  try {
    const { code, genre, language } = req.body;
    console.log('LYRICS REQUEST:', { code, genre, language });
    // GPT-4o expects a chat completion format
      let systemPrompt = `You are a creative assistant that turns code into karaoke lyrics. 
      Always output lyrics as plain lines only — no labels, no headings, no section names Genre: ${genre}, Language: ${language}.`;
      let userPrompt = `Convert this code to karaoke lyrics. 
      ⚠️ STRICT RULE: Do NOT include any section labels like "chorus", "verse", "outro", 
      or anything in parentheses/brackets. ONLY output plain lyric lines. 
      The lyrics should flow musically and be suitable for singing.
      Create a complete song.\n${code}`;
      let maxTokens = 512;

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
      //lyrics = response.data.choices[0].message.content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      let rawLyrics = response.data.choices[0].message.content;
      lyrics = cleanLyrics(rawLyrics);
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