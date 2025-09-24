const express = require("express");
const axios = require("axios");
const cors = require("cors");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegStatic = require("ffmpeg-static");

// Configure ffmpeg to use the static binary
ffmpeg.setFfmpegPath(ffmpegStatic);

const execAsync = require("util").promisify(require("child_process").exec);

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

// 🎵 Calculate dynamic lyrics duration based on content
function calculateLyricsDuration(lyrics) {
  if (!lyrics || typeof lyrics !== 'string') {
    return 40; // Fallback to 40 seconds
  }
  
  // Clean up lyrics and split into meaningful lines
  const cleanLyrics = lyrics.trim().replace(/\n\s*\n/g, '\n'); // Remove empty lines
  const lines = cleanLyrics.split('\n').filter(line => line.trim().length > 0);
  const totalWords = lyrics.split(/\s+/).filter(word => word.trim().length > 0).length;
  
  console.log(`📊 Lyrics analysis: ${lines.length} lines, ${totalWords} words`);
  
  // Base calculation: 1.8 words per second (slower singing pace)
  // Plus 4 seconds intro music, 3 seconds outro
  const lyricsTime = totalWords / 1.8;
  const introTime = 4;
  const outroTime = 3;
  const pauseTime = lines.length * 0.5; // 0.5 seconds pause between lines
  
  const totalDuration = lyricsTime + introTime + outroTime + pauseTime;
  
  // Keep between 30-50 seconds for optimal karaoke experience
  const finalDuration = Math.max(30, Math.min(50, Math.ceil(totalDuration)));
  
  console.log(`📊 Duration calculation: ${lyricsTime.toFixed(1)}s lyrics + ${introTime}s intro + ${outroTime}s outro + ${pauseTime.toFixed(1)}s pauses = ${finalDuration}s total`);
  
  return finalDuration;
}

// 🎵 Audio trimming function using fluent-ffmpeg
async function trimAudioWithFFmpeg(audioUrl, durationSeconds, outputFileName) {
  try {
    console.log(`🎬 Trimming audio to ${durationSeconds} seconds...`);
    
    // Create temp directory if it doesn't exist
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const outputPath = path.join(tempDir, outputFileName);
    
    // Use fluent-ffmpeg with better audio processing to prevent repetition
    return new Promise((resolve, reject) => {
      ffmpeg(audioUrl)
        .seekInput(0) // Start from beginning
        .duration(durationSeconds) // Trim to specified duration
        .outputOptions([
          '-c:a libmp3lame', // Re-encode with MP3 codec for better compatibility
          '-b:a 128k', // Set audio bitrate
          '-avoid_negative_ts make_zero',
          '-fflags +genpts', // Generate presentation timestamps
          '-async 1' // Audio sync method
        ])
        .on('start', (commandLine) => {
          console.log('🎵 FFmpeg command:', commandLine);
        })
        .on('progress', (progress) => {
          console.log(`🎬 Trimming progress: ${Math.round(progress.percent || 0)}%`);
        })
        .on('end', () => {
          console.log('✅ Audio trimmed successfully with re-encoding');
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error('❌ FFmpeg re-encoding failed, trying stream copy:', err.message);
          
          // Fallback: Use stream copy method
          ffmpeg(audioUrl)
            .seekInput(0)
            .duration(durationSeconds)
            .outputOptions([
              '-c:a copy',
              '-avoid_negative_ts make_zero'
            ])
            .on('end', () => {
              console.log('✅ Audio trimmed successfully with stream copy');
              resolve(outputPath);
            })
            .on('error', (err2) => {
              console.error('❌ Both FFmpeg methods failed:', err2.message);
              reject(new Error(`Audio trimming failed: ${err2.message}`));
            })
            .save(outputPath);
        })
        .save(outputPath);
    });
  } catch (error) {
    console.error('❌ FFmpeg setup failed:', error.message);
    throw new Error(`Audio trimming setup failed: ${error.message}`);
  }
}

// 🎵 Serve trimmed audio files
app.get("/api/audio/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'temp', filename);
  
  if (fs.existsSync(filePath)) {
    // Add CORS headers for audio files
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } else {
    res.status(404).json({ error: 'Audio file not found' });
  }
});

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
      duration: 50,
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
    
    // 🎬 STEP 1: Trim audio first to prevent repetition
    let finalAudioUrl = completedSong.audioUrl;
    let trimmedAudioPath = null;
    
    try {
      console.log('🎬 Starting audio trimming process...');
      
      // Calculate dynamic duration based on lyrics content
      const estimatedLyricsDuration = calculateLyricsDuration(lyrics);
      console.log(`📊 Using calculated duration for trimming: ${estimatedLyricsDuration} seconds`);
      
      const trimFileName = `trimmed_${completedSong.id}.mp3`;
      
      // Trim the audio using ffmpeg
      trimmedAudioPath = await trimAudioWithFFmpeg(
        completedSong.audioUrl, 
        estimatedLyricsDuration, 
        trimFileName
      );
      
      // Create local URL for the trimmed audio
      finalAudioUrl = `http://localhost:${PORT}/api/audio/${trimFileName}`;
      console.log('✅ Audio trimmed successfully, serving from:', finalAudioUrl);
      
    } catch (trimError) {
      console.warn('⚠️ Audio trimming failed, using original:', trimError.message);
      // Fall back to original audio if trimming fails
      finalAudioUrl = completedSong.audioUrl;
    }
    
    // 🎵 STEP 2: Generate timestamped lyrics from the trimmed audio
    let timestampedLyrics = null;
    
    // Create a new audio file for timestamped lyrics if we have trimmed audio
    let audioIdForTimestamps = completedSong.id;
    let audioUrlForTimestamps = finalAudioUrl;
    
    // If we successfully trimmed the audio, we need to upload it back to get timestamps
    if (trimmedAudioPath && finalAudioUrl !== completedSong.audioUrl) {
      console.log('🎵 Using trimmed audio for timestamped lyrics generation...');
      // Note: For now, we'll use the original taskId and audioId since Suno API might need them
      // In a more advanced implementation, we could upload the trimmed audio as a new file
    }
    
    const timeStampPayload = {
      taskId: taskId,
      audioId: audioIdForTimestamps,
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
        console.log('✅ Successfully fetched timestamped lyrics from trimmed audio');
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
      audioUrl: finalAudioUrl, // Use trimmed audio URL
      originalAudioUrl: completedSong.audioUrl, // Keep original for reference
      audioId: completedSong.id,
      taskId: taskId,
      timestampedLyrics: timestampedLyrics, // Include timestamped lyrics in response
      trimmed: finalAudioUrl !== completedSong.audioUrl, // Indicate if audio was trimmed
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
      Target length: 30–40 seconds.\n${code}`;
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
