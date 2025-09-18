const express = require("express");
const axios = require("axios");
const cors = require("cors");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

// 🎶 Add BGM to existing TTS audio file
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
ffmpeg.setFfmpegPath(ffmpegPath);

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

// 🎤🎶 Generate Karaoke Audio (BGM + Vocals)
app.post("/api/karaoke-audio", async (req, res) => {
  try {
    const { lyrics, genre, voice } = req.body;
    // 1. Select BGM file by genre and voice
    const bgmDir = path.join(__dirname, "bgm");
    const lowerGenre = (genre || '').toLowerCase();
    const lowerVoice = (voice || '').toLowerCase();
    const bgmFile = path.join(bgmDir, `${lowerGenre}-${lowerVoice}.mp3`);
    if (!fs.existsSync(bgmFile)) {
      return res.status(404).json({ error: `No BGM found for genre: ${genre} and voice: ${voice}` });
    }

    // 2. Generate TTS vocals (using current API)
    const ttsPayload = {
      input: lyrics,
      voice: voice || "default"
    };
    const ttsResponse = await axios.post(
      process.env.TTS_API_URL,
      ttsPayload,
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.TTS_API_KEY}`,
        },
        responseType: "arraybuffer",
      }
    );
    // Save TTS vocals to temp file
    const vocalsPath = path.join(__dirname, `vocals_${Date.now()}.mp3`);
    fs.writeFileSync(vocalsPath, Buffer.from(ttsResponse.data));

    // 3. Mix BGM and vocals using ffmpeg
    const outputPath = path.join(__dirname, `karaoke_${Date.now()}.mp3`);
    ffmpeg()
      .input(bgmFile)
      .input(vocalsPath)
      .complexFilter([
        // Adjust volumes if needed
        '[0:a]volume=0.5[a0];[1:a]volume=1.0[a1];[a0][a1]amix=inputs=2:duration=longest'
      ])
      .outputOptions('-y')
      .on('end', () => {
        // Send mixed audio
        const audio = fs.readFileSync(outputPath);
        res.set({
          "Content-Type": "audio/mpeg",
          "Content-Disposition": "inline; filename=karaoke.mp3",
        });
        res.send(audio);
        // Clean up temp files
        fs.unlinkSync(vocalsPath);
        fs.unlinkSync(outputPath);
      })
      .on('error', (err) => {
        console.error('FFMPEG ERROR:', err);
        // Clean up temp files
        if (fs.existsSync(vocalsPath)) fs.unlinkSync(vocalsPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        res.status(500).json({ error: "Failed to mix audio", details: err.message });
      })
      .save(outputPath);
  } catch (error) {
    console.error('KARAOKE AUDIO ERROR:', error.response?.data || error.message, error.config || '');
    res.status(500).json({ error: "Failed to generate karaoke audio", details: error.response?.data || error.message });
  }
});

// 🎤 Generate Lyrics
app.post("/api/lyrics", async (req, res) => {
  try {
    const { code, genre, language } = req.body;
    console.log('LYRICS REQUEST:', { code, genre, language });
    // GPT-4o expects a chat completion format
      let systemPrompt = `You are a creative assistant that turns code into karaoke lyrics. Genre: ${genre}, Language: ${language}.`;
      let userPrompt = `Convert this code to karaoke lyrics. Do NOT include section labels like "chorus", "verse", "outro", or any similar headings—just provide the lyrics lines only.Make the lyrics fit a song of about 30 to 40 seconds duration\n${code}`;
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

// 🎶 Generate TTS Audio
app.get("/api/tts", async (req, res) => {
  try {
    const lyrics = req.query.lyrics;
    const voice = req.query.voice;
    console.log('TTS REQUEST:', { lyrics, voice });
    const ttsPayload = {
      input: lyrics,
      voice: voice
    };
    const response = await axios.post(
      process.env.TTS_API_URL,
      ttsPayload,
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.TTS_API_KEY}`,
        },
        responseType: "arraybuffer", // important for audio
      }
    );
    console.log('TTS RESPONSE:', response.status, response.headers);
    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Disposition": "inline; filename=karaoke.mp3",
    });
    res.send(response.data);
    console.log('LYRICS RESPONSE:', response.data);
  } catch (error) {
    console.error('TTS ERROR:', error.response?.data || error.message, error.config || '');
    res.status(500).json({ error: "Failed to generate audio", details: error.response?.data || error.message });
  }
});

app.post('/api/add-bgm', upload.single('ttsAudio'), async (req, res) => {
  try {
    const { genre, voice } = req.body;
    if (!req.file) {
      return res.status(400).json({ error: 'No TTS audio file uploaded.' });
    }
    // Find BGM file
    const bgmDir = path.join(__dirname, 'bgm');
    const lowerGenre = (genre || '').toLowerCase();
    const lowerVoice = (voice || '').toLowerCase();
    const bgmFile = path.join(bgmDir, `${lowerGenre}-${lowerVoice}.mp3`);
    if (!fs.existsSync(bgmFile)) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: `No BGM found for genre: ${genre} and voice: ${voice}` });
    }
    // Mix BGM and TTS audio, then pad/trim to 35 seconds
    const mixedPath = path.join(__dirname, `karaoke_mixed_${Date.now()}.mp3`);
    const finalPath = path.join(__dirname, `karaoke_final_${Date.now()}.mp3`);
    ffmpeg()
      .input(bgmFile)
      .input(req.file.path)
      .complexFilter([
        '[0:a]volume=0.5[a0];[1:a]volume=1.0[a1];[a0][a1]amix=inputs=2:duration=longest'
      ])
      .outputOptions('-y')
      .on('end', () => {
        // Pad/trim to 35 seconds
        ffmpeg()
          .input(mixedPath)
          .outputOptions('-t 35') // trim to 35 seconds
          .on('end', () => {
            const audio = fs.readFileSync(finalPath);
            res.set({
              'Content-Type': 'audio/mpeg',
              'Content-Disposition': 'inline; filename=karaoke.mp3',
            });
            res.send(audio);
            fs.unlinkSync(req.file.path);
            fs.unlinkSync(mixedPath);
            fs.unlinkSync(finalPath);
          })
          .on('error', (err) => {
            console.error('FFMPEG FINAL ERROR:', err);
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            if (fs.existsSync(mixedPath)) fs.unlinkSync(mixedPath);
            if (fs.existsSync(finalPath)) fs.unlinkSync(finalPath);
            res.status(500).json({ error: 'Failed to pad/trim audio', details: err.message });
          })
          .save(finalPath);
      })
      .on('error', (err) => {
        console.error('FFMPEG ERROR:', err);
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        if (fs.existsSync(mixedPath)) fs.unlinkSync(mixedPath);
        res.status(500).json({ error: 'Failed to mix audio', details: err.message });
      })
      .save(mixedPath);
  } catch (error) {
    console.error('ADD BGM ERROR:', error.response?.data || error.message, error.config || '');
    res.status(500).json({ error: 'Failed to add BGM', details: error.response?.data || error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});
