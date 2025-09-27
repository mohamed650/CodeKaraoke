<!-- KaraokePlayer.vue -->
<template>
  <div v-if="singMode" class="vibe-coding-right d-flex flex-column align-center justify-center" style="width:600px; max-width:800px; margin-left:40px; position:relative; background:transparent; box-shadow:none;">
    <div v-if="loading" class="d-flex flex-column align-center justify-center" style="height:300px; width:100%;">
      <v-progress-circular indeterminate color="primary" size="64" />
      <span class="text-h6 mt-4" style="color:#fff;">
        Generating lyrics and audio...
      </span>
    </div>
    <template v-else>
      <!-- Add gap above image -->
      <div style="height: 20px;"></div>
      
  <video v-if="voiceType === 'Female'" ref="karaokeVideo" src="../assets/img/animeSinging_girl.mp4" style="width:500px; max-width:90vw; border-radius:16px; box-shadow:0 2px 16px #90caf9; background:transparent;" muted loop></video>
  <video v-if="voiceType === 'Male'" ref="karaokeVideo" src="../assets/img/animeSinging_boy.mp4" style="width:500px; max-width:90vw; border-radius:16px; box-shadow:0 2px 16px #90caf9; background:transparent;" muted loop></video>
      
      <!-- Waveform Display - Moved to top -->
      <div v-if="props.audioUrl" class="waveform-top-container" :class="{ 'active': isPlaying }">
        <div class="waveform-top-display">
          <div 
            class="wave-line-top" 
            v-for="i in 40" 
            :key="i" 
            :style="{ 
              animationDelay: (i * 0.05) + 's',
              height: getWaveHeight(i) + '%'
            }"
          ></div>
        </div>
      </div>
      
      <div class="lyrics-below" style="width:100%; text-align:center; background:none; overflow-wrap:break-word; word-break:break-word;">
        <div v-if="currentTimestampedLyric" class="lyric-story-container" style="height:120px;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;">
          <transition name="lyric-rise" mode="out-in">
            <span :key="currentTimestampedLyric.text" class="text-h5 font-weight-bold" style="color:#fff; border-radius:8px; padding:6px 20px; display:inline-block; background:none; line-height: 1.2;">
              {{ currentTimestampedLyric.text }}
            </span>
          </transition>
          <span v-if="nextTimestampedLyric">
            <transition name="lyric-rise" mode="out-in">
              <span :key="'next-' + nextTimestampedLyric.text"
                class="text-body1 font-weight-medium lyric-next"
                style="display:block; text-align:center; opacity:0.7; margin-top:8px; color:#fff; background:none;">
                {{ nextTimestampedLyric.text }}
              </span>
            </transition>
          </span>
          </div>
        
        <!-- Fallback to simple lyrics if no timestamped data -->
        <div v-else-if="lyrics && lyrics.length" class="lyric-story-container" style="height:120px;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;">
          <transition name="lyric-rise" mode="out-in">
            <span :key="currentLyric" class="text-h5 font-weight-bold" style="color:#fff; border-radius:8px; padding:6px 20px; display:inline-block; background:none; line-height: 1.2;">
              {{ lyrics[currentLyric] }}
            </span>
          </transition>
          <span v-if="lyrics[currentLyric+1]">
            <transition name="lyric-rise" mode="out-in">
              <span :key="'next-' + currentLyric"
                :class="['text-body1 font-weight-medium', currentLyric > 0 ? 'lyric-next' : '']"
                style="display:block; text-align:center; opacity:0.7; margin-top:8px; color:#fff; background:none;">
                {{ lyrics[currentLyric+1] }}
              </span>
            </transition>
          </span>
        </div>
        <div v-else>
          <span class="text-h6 font-weight-bold" style="color:#fff; border-radius:8px; padding:8px 24px; display:inline-block; background:none;">No lyrics generated.</span>
        </div>
      </div>
      <div class="w-100 d-flex justify-center mb-2" style="margin-top:10px; background:transparent;">
        <!-- Compact Modern Audio Player -->
        <div v-if="props.audioUrl" class="compact-audio-player">
          <audio
            ref="audioEl"
            :src="props.audioUrl"
            @play="handlePlayLyrics"
            @pause="handlePauseLyrics"
            @timeupdate="updateTimeAndLyrics"
            @loadedmetadata="updateDuration"
            @loadeddata="handleAudioLoaded"
            @canplay="handleCanPlay"
            @seeking="handleSeeking"
            @seeked="handleSeeked"
            @ended="handleAudioEnded"
            @error="handleAudioError"
            preload="metadata"
            style="display: none;"
          ></audio>
          
          <!-- Compact Player Container -->
          <div class="compact-player-container">
            <!-- Play/Pause Button -->
            <button @click="togglePlayPause" class="compact-play-btn">
              <v-icon v-if="!isPlaying" size="28" color="white">mdi-play</v-icon>
              <v-icon v-else size="28" color="white">mdi-pause</v-icon>
            </button>
            
            <!-- Progress and Time Section -->
            <div class="compact-progress-section">
              <!-- Time Display -->
              <div class="compact-time-display">
                <span class="current-time">{{ formatTime(currentTime) }}</span>
                <span class="duration">{{ formatTime(duration) }}</span>
              </div>
              
              <!-- Progress Bar -->
              <div class="compact-progress-container" @click="seekAudio">
                <div class="compact-progress-bg"></div>
                <div class="compact-progress-fill" :style="{ width: progressPercent + '%' }"></div>
                <div class="compact-progress-handle" :style="{ left: progressPercent + '%' }"></div>
              </div>
            </div>
            
            <!-- Controls Section -->
            <div class="compact-controls-section">
              <!-- Volume Control -->
              <div class="compact-volume-section">
                <v-icon @click="toggleMute" class="volume-icon" color="white" size="22">
                  {{ isMuted ? 'mdi-volume-off' : (volume > 0.5 ? 'mdi-volume-high' : 'mdi-volume-medium') }}
                </v-icon>
                <div class="compact-volume-slider" @click="setVolume">
                  <div class="compact-volume-bg"></div>
                  <div class="compact-volume-fill" :style="{ width: (isMuted ? 0 : volume * 100) + '%' }"></div>
                </div>
              </div>
              
              <!-- Playback Speed Control -->
              <div class="compact-speed-section">
                <v-menu offset-y>
                  <template v-slot:activator="{ props }">
                    <v-btn v-bind="props" icon size="small" class="compact-speed-btn">
                      <v-icon color="white" size="20">mdi-speedometer</v-icon>
                    </v-btn>
                  </template>
                  <v-list class="speed-menu">
                    <v-list-item 
                      v-for="speed in speedOptions" 
                      :key="speed"
                      @click="setPlaybackSpeed(speed)"
                      :class="{ 'active-speed': playbackRate === speed }"
                    >
                      <v-list-item-title>{{ speed }}x</v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-menu>
              </div>
              
              <!-- Download Button -->
              <div class="compact-download-section">
                <v-btn @click="downloadAudio" icon size="small" class="compact-download-btn">
                  <v-icon color="white" size="20">mdi-download</v-icon>
                </v-btn>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="d-flex justify-start" style="background:transparent;">
        <v-btn @click="handleBackClick" color="primary" class="mt-3">Back</v-btn>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, defineEmits, defineProps, onMounted, ref, watch } from 'vue';

const props = defineProps({
  lyrics: Array,
  audioUrl: String,
  singMode: Boolean,
  voiceType: String,
  loading: Boolean,
  audioId: String,
  timestampedLyrics: Object // Add timestampedLyrics prop from response
});
const emit = defineEmits(['back']);
const karaokeVideo = ref(null);
const audioEl = ref(null);
const currentLyric = ref(0);
let lyricsPlaying = ref(false);
const showManualPlay = ref(false);

// Timestamped lyrics state
const timestampedLyrics = ref([]);
const currentTimestampedLyric = ref(null);
const nextTimestampedLyric = ref(null);

// Modern audio player state
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const volume = ref(1);
const isMuted = ref(false);
const playbackRate = ref(1);
const speedOptions = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const isSeeking = ref(false); // Flag to prevent conflicts during seeking

const progressPercent = computed(() => {
  return duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0;
});

// Modern audio player methods
function togglePlayPause() {
  if (!audioEl.value) return;
  
  if (isPlaying.value) {
    audioEl.value.pause();
  } else {
    // If we're at or near the end of the song, reset to beginning
    // if (audioEl.value.currentTime >= duration.value - 1) {
    //   audioEl.value.currentTime = 0;
    //   currentTime.value = 0;
    //   currentLyric.value = 0;
    //   currentTimestampedLyric.value = null;
    //   nextTimestampedLyric.value = null;
    //   console.log('🔄 Restarting song from beginning');
    // }
    audioEl.value.play();
  }
  isPlaying.value = !isPlaying.value;
}

function updateDuration() {
  if (audioEl.value && !isNaN(audioEl.value.duration)) {
    duration.value = audioEl.value.duration || 0;
    console.log(`🎵 Audio duration loaded: ${duration.value.toFixed(2)}s`);
  }
}

function handleAudioLoaded() {
  console.log('🎵 Audio data loaded');
  updateDuration();
}

function handleCanPlay() {
  console.log('🎵 Audio can start playing');
  updateDuration();
}

function handleSeeking() {
  console.log('🎵 Audio seeking started');
  isSeeking.value = true;
}

function handleSeeked() {
  console.log(`🎵 Audio seeking completed to: ${audioEl.value?.currentTime.toFixed(2)}s`);
  isSeeking.value = false; // Clear seeking flag
  if (audioEl.value) {
    // Sync our tracked time with actual audio time
    currentTime.value = audioEl.value.currentTime;
    updateCurrentLyric();
  }
}

function handleAudioEnded() {
  console.log('🎵 Audio playback ended naturally');
  isPlaying.value = false;
  lyricsPlaying.value = false;
  
  // Keep the last lyric displayed - don't reset to first lyric
  if (timestampedLyrics.value.length > 0) {
    currentTimestampedLyric.value = timestampedLyrics.value[timestampedLyrics.value.length - 1];
    nextTimestampedLyric.value = null;
  } else if (props.lyrics && props.lyrics.length > 0) {
    currentLyric.value = props.lyrics.length - 1;
  }
  
  // Don't reset audio position when song ends naturally - let it stay at the end
  console.log('🎵 Song completed - keeping last lyric displayed');
}

function handleAudioError(event) {
  console.error('❌ Audio error:', event);
  if (audioEl.value) {
    console.error('Audio error details:', {
      error: audioEl.value.error,
      networkState: audioEl.value.networkState,
      readyState: audioEl.value.readyState
    });
  }
}

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function seekAudio(event) {
  if (!audioEl.value || !duration.value) {
    console.warn('⚠️ Audio or duration not available for seeking');
    return;
  }
  
  // Check if audio is sufficiently loaded
  if (audioEl.value.readyState < 2) {
    console.warn('⚠️ Audio not sufficiently loaded for seeking');
    return;
  }
  
  try {
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickPercent = Math.max(0, Math.min(1, clickX / rect.width)); // Clamp between 0 and 1
    const newTime = Math.max(0, Math.min(clickPercent * duration.value, duration.value - 0.5)); // Leave 0.5s buffer from end
    
    console.log(`🎵 Seeking to: ${newTime.toFixed(2)}s (${(clickPercent * 100).toFixed(1)}%) - Duration: ${duration.value.toFixed(2)}s`);
    
    // Prevent unnecessary seeks for very small differences
    if (Math.abs(audioEl.value.currentTime - newTime) > 0.5) {
      // Temporarily disable timeupdate to prevent conflicts
      const wasPlaying = !audioEl.value.paused;
      
      // Set the current time
      audioEl.value.currentTime = newTime;
      
      // Update our tracked time immediately
      currentTime.value = newTime;
      
      // Update lyrics for the new position
      updateCurrentLyric();
      
      console.log(`✅ Seeked to: ${audioEl.value.currentTime.toFixed(2)}s`);
    } else {
      console.log(`⏭️ Skipping seek - too small difference: ${Math.abs(audioEl.value.currentTime - newTime).toFixed(2)}s`);
    }
    
  } catch (error) {
    console.error('❌ Error seeking audio:', error);
  }
}

function toggleMute() {
  if (!audioEl.value) return;
  
  isMuted.value = !isMuted.value;
  audioEl.value.muted = isMuted.value;
}

function setVolume(event) {
  if (!audioEl.value) return;
  
  const rect = event.currentTarget.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const newVolume = Math.max(0, Math.min(1, clickX / rect.width));
  
  volume.value = newVolume;
  audioEl.value.volume = newVolume;
  if (newVolume > 0) isMuted.value = false;
}

function setPlaybackSpeed(speed) {
  if (!audioEl.value) return;
  
  playbackRate.value = speed;
  audioEl.value.playbackRate = speed;
}

async function downloadAudio() {
  if (!props.audioUrl) return;
  
  try {
    console.log('🎵 Starting download from:', props.audioUrl);
    
    // Show loading state (you could add a loading indicator here)
    const downloadBtn = document.querySelector('.compact-download-btn');
    if (downloadBtn) {
      downloadBtn.style.opacity = '0.5';
      downloadBtn.style.pointerEvents = 'none';
    }
    
    // Fetch the audio file as a blob
    const response = await fetch(props.audioUrl);
    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    console.log('✅ Audio blob created:', blob.size, 'bytes');
    
    // Create object URL for the blob
    const blobUrl = window.URL.createObjectURL(blob);
    
    // Create download link
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = 'karaoke-audio.mp3'; // You can make this dynamic based on song name
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
    
    console.log('✅ Download completed successfully');
    
  } catch (error) {
    console.error('❌ Download failed:', error);
    alert('Failed to download audio. Please try again.');
  } finally {
    // Restore button state
    const downloadBtn = document.querySelector('.compact-download-btn');
    if (downloadBtn) {
      downloadBtn.style.opacity = '1';
      downloadBtn.style.pointerEvents = 'auto';
    }
  }
}

function getWaveHeight(index) {
  // Create varied wave heights based on index and time for realistic effect
  const baseHeight = 20;
  const variation = Math.sin((index * 0.5) + (currentTime.value * 2)) * 30;
  const randomFactor = Math.sin(index * 1.2) * 20;
  return Math.max(10, baseHeight + variation + randomFactor);
}

// Calculate smart timing intervals based on lyric lengths
function calculateLyricTimings(lyrics, totalDuration) {
  if (!lyrics || lyrics.length === 0) return [];
  
  // Calculate relative weights based on lyric length and complexity
  const weights = lyrics.map(lyric => {
    const words = lyric.split(' ').length;
    const chars = lyric.length;
    // Weight based on both word count and character count
    return Math.max(1, (words * 0.7) + (chars * 0.01));
  });
  
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  
  // Dynamic intro/outro calculation based on song length
  const introTime = Math.min(totalDuration * 0.12, 4); // Slightly longer intro
  const outroTime = Math.min(totalDuration * 0.08, 3); // Shorter outro
  const contentDuration = totalDuration - introTime - outroTime;
  
  // Calculate cumulative timing with buffer zones
  const timings = [];
  let currentTime = introTime;
  
  for (let i = 0; i < lyrics.length; i++) {
    const lyricDuration = (weights[i] / totalWeight) * contentDuration;
    const bufferTime = lyricDuration * 0.1; // 10% buffer for natural transitions
    
    timings.push({
      startTime: currentTime,
      endTime: currentTime + lyricDuration - bufferTime,
      duration: lyricDuration,
      weight: weights[i],
      index: i
    });
    currentTime += lyricDuration;
  }
  
  return timings;
}

// The basic lyric timing functions remain for simple sync

// Process timestamped lyrics from props to match with lyrics array
function processTimestampedLyrics(timestampedData) {
  try {
    console.log("🎵 Processing timestamped lyrics from props:", timestampedData);

    if (timestampedData && timestampedData.alignedWords && props.lyrics && props.lyrics.length > 0) {
      // Match timestamped data with original lyrics array
      const matchedTimestamps = matchTimestampsToLyrics(timestampedData.alignedWords, props.lyrics);
      
      timestampedLyrics.value = matchedTimestamps.map((lyric, index) => ({
        start: lyric.start,
        end: lyric.end,
        text: lyric.text,
        index,
      }));
      
      console.log("✅ Processed timestamped lyrics matched to original:", timestampedLyrics.value.length, "lines");
      return true;
    } else {
      console.warn("⚠️ No alignedWords or original lyrics found for matching");
      timestampedLyrics.value = [];
      return false;
    }
  } catch (error) {
    console.error("❌ Error processing timestamped lyrics:", error);
    timestampedLyrics.value = [];
    return false;
  }
}

// Helper function to detect if text contains Japanese characters
function isJapaneseText(text) {
  const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
  return japaneseRegex.test(text);
}

// Helper function to extract meaningful text segments from Japanese text
function extractJapaneseSegments(text) {
  // Remove punctuation and split into meaningful segments
  const cleanText = text.replace(/[。、！？\s]/g, '');
  const segments = [];
  
  // For Japanese, we'll work with character sequences since there are no spaces
  let currentSegment = '';
  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    currentSegment += char;
    
    // Break segments at natural boundaries (hiragana-kanji transitions, etc.)
    if (i < cleanText.length - 1) {
      const nextChar = cleanText[i + 1];
      const currentIsHiragana = /[\u3040-\u309F]/.test(char);
      const nextIsHiragana = /[\u3040-\u309F]/.test(nextChar);
      const currentIsKanji = /[\u4E00-\u9FAF]/.test(char);
      const nextIsKanji = /[\u4E00-\u9FAF]/.test(nextChar);
      
      // Break on script transitions or every 3-4 characters
      if ((currentIsHiragana && nextIsKanji) || 
          (currentIsKanji && nextIsHiragana) || 
          currentSegment.length >= 3) {
        segments.push(currentSegment);
        currentSegment = '';
      }
    }
  }
  
  if (currentSegment) {
    segments.push(currentSegment);
  }
  
  return segments.filter(seg => seg.length > 0);
}

// Helper function to calculate character overlap between two strings
function getCharacterOverlap(str1, str2) {
  const chars1 = new Set(str1.split(''));
  const chars2 = new Set(str2.split(''));
  const intersection = new Set([...chars1].filter(x => chars2.has(x)));
  const union = new Set([...chars1, ...chars2]);
  return intersection.size / union.size;
}

// Enhanced function to match timestamps with original lyrics array (Japanese-aware)
function matchTimestampsToLyrics(alignedWords, originalLyrics) {
  const allWords = alignedWords.map(word => ({
    word: word.word
      .replace(/^\[.*?\]\s*/g, '')  // Strip [Verse] etc. from Suno words
      .replace(/[^\w\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '')  // Keep Japanese chars, remove punctuation
      .trim(),
    start: word.startS,
    end: word.endS,
    originalWord: word.word
  }));

  const matchedLyrics = [];
  let currentWordIndex = 0;

  const hasJapanese = originalLyrics.some(lyric => isJapaneseText(lyric));
  console.log(`🎌 Japanese text detected: ${hasJapanese}`);

  for (let i = 0; i < originalLyrics.length; i++) {
    const lyricLine = originalLyrics[i].trim();
    let lineStart = null;
    let lineEnd = null;
    let segmentsMatched = 0;
    let totalSegments = 0;

    if (hasJapanese && isJapaneseText(lyricLine)) {
      // Japanese text processing - character-based matching
      const lyricSegments = extractJapaneseSegments(lyricLine);
      totalSegments = lyricSegments.length;
      
      console.log(`🎌 Processing Japanese line: "${lyricLine}" -> segments:`, lyricSegments);

      // Try to match Japanese segments with aligned words
      for (let segIndex = 0; segIndex < lyricSegments.length && currentWordIndex < allWords.length; segIndex++) {
        const segment = lyricSegments[segIndex];
        let found = false;

        // Search for matching segments in aligned words
        for (let j = currentWordIndex; j < Math.min(currentWordIndex + 12, allWords.length); j++) {  // Increase search window
          const alignedWord = allWords[j];
          
          // For Japanese, check character overlap since word boundaries are unclear
          if (alignedWord.word.includes(segment) || 
              segment.includes(alignedWord.word) ||
              // Check for character overlap (at least 60% match)
              (segment.length >= 2 && alignedWord.word.length >= 2 && 
               getCharacterOverlap(segment, alignedWord.word) >= 0.6)) {
            
            if (lineStart === null) {
              lineStart = alignedWord.start;
            }
            lineEnd = alignedWord.end;
            currentWordIndex = j + 1;
            segmentsMatched++;
            found = true;
            console.log(`✅ Japanese segment "${segment}" matched with "${alignedWord.word}" at ${alignedWord.start.toFixed(2)}s`);
            break;
          }
        }

        if (!found && segIndex === 0) {
          // Estimate timing for unmatched Japanese segments
          const estimatedStart = currentWordIndex < allWords.length ? 
            allWords[currentWordIndex].start : 
            (i * (allWords[allWords.length - 1]?.end || 60) / originalLyrics.length);
          lineStart = estimatedStart;
        }
      }

      // Fallback if low match rate
      if (segmentsMatched / totalSegments < 0.5) {
        console.warn(`⚠️ Low match for Japanese line ${i + 1}, estimating timings`);
        const totalDuration = allWords[allWords.length - 1]?.end || 60;
        const estimatedDuration = totalDuration / originalLyrics.length;
        lineStart = i * estimatedDuration;
        lineEnd = (i + 1) * estimatedDuration;
      }
    } else {
      // English text processing - word-based matching (original logic)
      const lyricWords = lyricLine.toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .split(/\s+/) // Split on whitespace
        .filter(word => word.length > 0);
      
      totalSegments = lyricWords.length;

      for (let wordIndex = 0; wordIndex < lyricWords.length && currentWordIndex < allWords.length; wordIndex++) {
        const lyricWord = lyricWords[wordIndex];
        let found = false;

        // Search for the word starting from current position
        for (let j = currentWordIndex; j < Math.min(currentWordIndex + 10, allWords.length); j++) {
          const alignedWord = allWords[j];
          
          // Check for exact match or partial match
          if (alignedWord.word.toLowerCase() === lyricWord || 
              alignedWord.word.toLowerCase().includes(lyricWord) || 
              lyricWord.includes(alignedWord.word.toLowerCase()) ||
              // Handle contractions and variations
              (lyricWord.length > 2 && alignedWord.word.length > 2 && 
               (lyricWord.startsWith(alignedWord.word.toLowerCase().substring(0, 3)) || 
                alignedWord.word.toLowerCase().startsWith(lyricWord.substring(0, 3))))) {
            
            if (lineStart === null) {
              lineStart = alignedWord.start;
            }
            lineEnd = alignedWord.end;
            currentWordIndex = j + 1;
            segmentsMatched++;
            found = true;
            break;
          }
        }

        // If word not found, try to continue with timing estimation
        if (!found && wordIndex === 0) {
          // Estimate timing based on position if first word not found
          const estimatedStart = currentWordIndex < allWords.length ? 
            allWords[currentWordIndex].start : 
            (i * (allWords[allWords.length - 1]?.end || 60) / originalLyrics.length);
          lineStart = estimatedStart;
        }
      }

      // Fallback timing if no words matched
      if (lineStart === null || lineEnd === null) {
        const totalDuration = allWords.length > 0 ? allWords[allWords.length - 1].end : 60;
        const estimatedDuration = totalDuration / originalLyrics.length;
        lineStart = i * estimatedDuration;
        lineEnd = (i + 1) * estimatedDuration;
      }
    }

    // Ensure reasonable timing gaps between lines
    if (i > 0 && lineStart < matchedLyrics[i - 1].end) {
      lineStart = matchedLyrics[i - 1].end + 0.2;  // Small buffer
    }

    matchedLyrics.push({
      text: lyricLine,
      start: lineStart || 0,
      end: lineEnd || (allWords[allWords.length - 1]?.end || 60),
      segmentsMatched,
      totalSegments
    });

    const matchType = hasJapanese && isJapaneseText(lyricLine) ? "Japanese" : "English";
    console.log(`📝 ${matchType} Line ${i + 1}: "${lyricLine}" -> ${lineStart.toFixed(2)}s-${lineEnd.toFixed(2)}s (${segmentsMatched}/${totalSegments} segments matched)`);
  }

  return matchedLyrics;
}

// Update current lyric based on audio time - simplified to work with matched lyrics
function updateCurrentLyric() {
  const time = currentTime.value;
  
  // Use timestamped lyrics if available (now matched to original lyrics array)
  if (timestampedLyrics.value.length > 0) {
    let current = null;
    let next = null;
    
    // Check if we're near the end of the song (within last 2 seconds)
    if (time >= duration.value - 2) {
      // Keep showing the last lyric at the end
      current = timestampedLyrics.value[timestampedLyrics.value.length - 1];
      next = null;
    } else {
      for (let i = 0; i < timestampedLyrics.value.length; i++) {
        const segment = timestampedLyrics.value[i];
        
        // Check if current time is within this segment with some buffer
        if (time >= segment.start - 0.5 && time <= segment.end + 0.5) {
          current = segment;
          next = i < timestampedLyrics.value.length - 1 ? timestampedLyrics.value[i + 1] : null;
          break;
        }
        // Show upcoming lyric a bit early for better readability
        else if (time >= segment.start - 2.0 && time < segment.start) {
          current = segment;
          next = i < timestampedLyrics.value.length - 1 ? timestampedLyrics.value[i + 1] : null;
          break;
        }
      }
    }
    
    currentTimestampedLyric.value = current;
    nextTimestampedLyric.value = next;
  }
  // Fallback to simple timing for regular lyrics
  else if (props.lyrics && props.lyrics.length > 0) {
    if (time >= duration.value - 2) {
      // Keep showing the last lyric when song is near or at the end
      currentLyric.value = props.lyrics.length - 1;
    } else {
      const lyricIndex = Math.floor((time / duration.value) * props.lyrics.length);
      currentLyric.value = Math.max(0, Math.min(lyricIndex, props.lyrics.length - 1));
    }
  }
}

// Watch for both lyrics and timestamped lyrics changes
watch(
  () => [props.timestampedLyrics, props.lyrics],
  ([timestampedData, lyrics]) => {
    if (timestampedData && lyrics && lyrics.length > 0 && !props.loading) {
      console.log("🎵 Both timestamped and original lyrics available, processing match...");
      processTimestampedLyrics(timestampedData);
    }
  },
  { immediate: true }
);

// Update time and lyrics together
function updateTimeAndLyrics() {
  // Don't update time during seeking to prevent conflicts
  if (isSeeking.value) return;
  
  if (audioEl.value && !isNaN(audioEl.value.currentTime)) {
    const newTime = audioEl.value.currentTime;
    
    // Only update if time has actually changed (avoid unnecessary updates)
    // Use smaller threshold for smoother updates
    if (Math.abs(currentTime.value - newTime) > 0.05) {
      currentTime.value = newTime;
      updateCurrentLyric();
    }
  }
}

// Auto play audio and lyrics when singMode is true and audioUrl is set
onMounted(() => {
  watch(
    () => [props.singMode, props.audioUrl],
    async ([singMode, audioUrl]) => {
      if (singMode && audioUrl) {
        setTimeout(async () => {
          if (audioEl.value) {
            try {
              await audioEl.value.play();
              showManualPlay.value = false;
            } catch (err) {
              showManualPlay.value = true;
              console.warn('Autoplay blocked:', err);
            }
          }
        }, 300);
      }
    },
    { immediate: true }
  );
});

function handlePlayLyrics() {
  lyricsPlaying.value = true;
  isPlaying.value = true;
  if (karaokeVideo.value) karaokeVideo.value.play();
}
function handlePauseLyrics() {
  lyricsPlaying.value = false;
  isPlaying.value = false;
  if (karaokeVideo.value) karaokeVideo.value.pause();
}

function handleBackClick() {
  currentLyric.value = 0;
  lyricsPlaying.value = false;
  if (karaokeVideo.value) karaokeVideo.value.pause();
  emit('back');
}
</script>

<style>
/* Delay animation for next lyric */
.lyric-next {
  animation: lyricNextDelay 0s;
}
@keyframes lyricNextDelay {
  0% { opacity: 0; transform: translateY(40px); }
  40% { opacity: 0; transform: translateY(40px); }
  100% { opacity: 0.1; transform: translateY(0); }
}
/* Tailwind is used for styling */
.slide-left-enter-active, .slide-left-leave-active {
  transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
}
.slide-left-leave-active {
  transform: translateX(-40vw);
  opacity: 0;
}
.slide-in-right-enter-active, .slide-in-right-leave-active {
  transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
}
.slide-in-right-enter {
  transform: translateX(40vw);
  opacity: 0;
}
.slide-in-right-enter-to {
  transform: translateX(0);
  opacity: 1;
}
.slide-in-right-leave-active {
  transform: translateX(40vw);
  opacity: 0;
}
/* Fade-in animation for lyric lines */
/* Lyric up animation (from below) */
.lyric-rise-enter-active, .lyric-rise-leave-active {
  transition: opacity 0.2s, transform 0.1s;
}
.lyric-rise-enter-from {
  opacity: 0;
  transform: translateY(60px);
}
.lyric-rise-enter-to {
  opacity: 1;
  transform: translateY(0);
}
.lyric-rise-leave-from {
  opacity: 1;
  transform: translateY(0);
}
.lyric-rise-leave-to {
  opacity: 0;
  transform: translateY(-40px);
}

/* Modern Audio Player Styles */
.modern-audio-player {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
}

/* Top Waveform Styles */
.waveform-top-container {
  width: 100%;
  max-width: 500px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 15px auto 10px auto;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 20px;
  padding: 0;
  backdrop-filter: blur(10px);
}

.waveform-top-display {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1px;
  height: 100%;
  width: 100%;
  padding: 12px;
}

.wave-line-top {
  width: 4px;
  background: linear-gradient(180deg,  #66eada 0%, #a24b9c 100%);
  border-radius: 2px;
  min-height: 15px;
  opacity: 0.6;
  transition: all 0.2s ease;
  flex: 1;
}

.waveform-top-container.active .wave-line-top {
  animation: wave-pulse-top 1s ease-in-out infinite;
  opacity: 1;
}

@keyframes wave-pulse-top {
  0%, 100% { transform: scaleY(0.3); }
  50% { transform: scaleY(1); }
}

/* Compact Audio Player Styles */
.compact-audio-player {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
}

.compact-player-container {
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.15), rgba(0, 0, 0, 0.15));
  border-radius: 15px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 15px;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  height: 80px;
}

.compact-play-btn {
  background: linear-gradient(135deg, #ea66df 0%, #764ba2 100%);
  border: none;
  border-radius: 50%;
  width: 55px;
  height: 55px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 3px 10px rgba(226, 120, 231, 0.4);
  flex-shrink: 0;
}

.compact-play-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 15px rgba(234, 102, 205, 0.6);
}

.compact-progress-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.compact-time-display {
  display: flex;
  justify-content: space-between;
  color: #fff;
  font-size: 11px;
  font-weight: 500;
}

.compact-progress-container {
  position: relative;
  height: 6px;
  cursor: pointer;
}

.compact-progress-bg {
  background: rgba(255, 255, 255, 0.2);
  height: 100%;
  border-radius: 3px;
}

.compact-progress-fill {
  background: linear-gradient(90deg, #dd66ea 0%, #a24b9c 100%);
  height: 100%;
  border-radius: 3px;
  position: absolute;
  top: 0;
  left: 0;
  transition: width 0.1s ease;
}

.compact-progress-handle {
  position: absolute;
  top: 50%;
  width: 12px;
  height: 12px;
  background: #fff;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
  transition: left 0.1s ease;
}

.compact-controls-section {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.compact-volume-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.compact-volume-slider {
  width: 60px;
  height: 4px;
  position: relative;
  cursor: pointer;
}

.compact-volume-bg {
  background: rgba(255, 255, 255, 0.2);
  height: 100%;
  border-radius: 2px;
}

.compact-volume-fill {
  background: linear-gradient(90deg, #dd66ea 0%, #a24b9c 100%);
  height: 100%;
  border-radius: 2px;
  position: absolute;
  top: 0;
  left: 0;
  transition: width 0.2s ease;
}

.compact-speed-section, .compact-download-section {
  display: flex;
  align-items: center;
}

.compact-speed-btn, .compact-download-btn {
  background: rgba(255, 255, 255, 0.1) !important;
  border-radius: 10px !important;
  transition: all 0.3s ease;
  width: 40px !important;
  height: 40px !important;
}

.compact-speed-btn:hover, .compact-download-btn:hover {
  background: rgba(255, 255, 255, 0.2) !important;
  transform: scale(1.05);
}

.player-container {
  background: linear-gradient(135deg, rgba(30, 30, 30, 0.95), rgba(50, 50, 50, 0.85));
  border-radius: 20px;
  padding: 25px 30px;
  display: flex;
  align-items: center;
  gap: 25px;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  position: relative;
  overflow: hidden;
}

/* Waveform Background */
.waveform-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  padding: 10px;
  opacity: 0.1;
  z-index: 0;
}

.wave-bar {
  width: 3px;
  background: linear-gradient(180deg, #cb66ea 0%, #a24b9c 100%);
  border-radius: 2px;
  height: 25%;
  animation: none;
  transition: height 0.3s ease;
}

.waveform-bg.playing .wave-bar {
  animation: wave-bounce 0.8s ease-in-out infinite alternate;
}

@keyframes wave-bounce {
  0% { height: 20%; }
  100% { height: 80%; }
}

/* Main Waveform Display */
.waveform-container {
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 10px 0;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  padding: 10px;
}

.waveform-display {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 2px;
  height: 100%;
  width: 100%;
  max-width: 400px;
}

.wave-line {
  width: 3px;
  background: linear-gradient(180deg, #cb66ea 0%, #a24b9c 100%);
  border-radius: 2px;
  min-height: 8px;
  opacity: 0.6;
  transition: all 0.2s ease;
}

.waveform-container.active .wave-line {
  animation: wave-pulse 1s ease-in-out infinite;
  opacity: 1;
}

@keyframes wave-pulse {
  0%, 100% { transform: scaleY(0.3); }
  50% { transform: scaleY(1); }
}

.play-btn {
  background: linear-gradient(135deg, #cb66ea 0%, #a24b9c 100%);
  border: none;
  border-radius: 50%;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  position: relative;
  z-index: 2;
}

.play-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
}

.play-btn:active {
  transform: scale(0.95);
}

.progress-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 15px;
  position: relative;
  z-index: 2;
}

.time-display {
  display: flex;
  justify-content: space-between;
  color: #fff;
  font-size: 12px;
  font-weight: 500;
}

.progress-container {
  position: relative;
  height: 6px;
  cursor: pointer;
}

.progress-bg {
  background: rgba(255, 255, 255, 0.2);
  height: 100%;
  border-radius: 3px;
}

.progress-fill {
  background: linear-gradient(90deg, #cb66ea 0%, #a24b9c 100%);
  height: 100%;
  border-radius: 3px;
  position: absolute;
  top: 0;
  left: 0;
  transition: width 0.1s ease;
}

.progress-handle {
  position: absolute;
  top: 50%;
  width: 14px;
  height: 14px;
  background: #fff;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  transition: left 0.1s ease;
}

.volume-section {
  display: flex;
  align-items: center;
  gap: 15px;
  position: relative;
  z-index: 2;
}

.volume-icon {
  cursor: pointer;
  transition: color 0.3s ease;
}

.volume-icon:hover {
  color: #667eea !important;
}

.volume-slider {
  width: 60px;
  height: 4px;
  position: relative;
  cursor: pointer;
}

.volume-bg {
  background: rgba(255, 255, 255, 0.2);
  height: 100%;
  border-radius: 2px;
}

.volume-fill {
  background: linear-gradient(90deg, #cb66ea 0%, #a24b9c 100%);
  height: 100%;
  border-radius: 2px;
  position: absolute;
  top: 0;
  left: 0;
  transition: width 0.2s ease;
}

.speed-section, .download-section {
  display: flex;
  align-items: center;
  position: relative;
  z-index: 2;
}

.speed-btn, .download-btn {
  background: rgba(255, 255, 255, 0.1) !important;
  border-radius: 12px !important;
  transition: all 0.3s ease;
  position: relative;
  min-width: 50px !important;
  height: 40px !important;
}

.speed-btn:hover, .download-btn:hover {
  background: rgba(255, 255, 255, 0.2) !important;
  transform: scale(1.05);
}

.speed-text {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 10px;
  color: white;
  font-weight: 600;
}

.speed-menu {
  background: rgba(30, 30, 30, 0.95) !important;
  backdrop-filter: blur(20px);
  border-radius: 12px !important;
  border: 1px solid rgba(255, 255, 255, 0.1);
  max-height: 200px;
  overflow-y: auto;
}

.speed-menu .v-list-item {
  color: white !important;
  transition: background-color 0.2s ease;
}

.speed-menu .v-list-item:hover {
  background: rgba(102, 126, 234, 0.3) !important;
}

.speed-menu .active-speed {
  background: rgba(102, 126, 234, 0.5) !important;
  color: #667eea !important;
}

@media (max-width: 600px) {
  .player-container {
    padding: 15px 20px;
    gap: 15px;
  }
  
  .play-btn {
    width: 50px;
    height: 50px;
  }
  
  .volume-section {
    display: none;
  }
  
  .speed-btn, .download-btn {
    min-width: 40px !important;
    height: 35px !important;
  }
  
  .speed-text {
    font-size: 9px;
  }
  
  .waveform-container {
    height: 60px;
  }
  
  .waveform-display {
    max-width: 200px;
  }
  
  .wave-line {
    width: 2px;
  }
  
  .wave-bar {
    width: 2px;
  }
  
  /* Compact player mobile styles */
  .compact-player-container {
    padding: 12px 15px;
    gap: 10px;
    height: 70px;
  }
  
  .compact-play-btn {
    width: 50px;
    height: 50px;
  }
  
  .compact-progress-section {
    gap: 6px;
  }
  
  .compact-volume-section {
    display: none;
  }
  
  .compact-controls-section {
    gap: 8px;
  }
  
  .waveform-top-container {
    height: 60px;
    padding: 8px;
  }
  
  .wave-line-top {
    width: 3px;
    min-height: 12px;
  }
  
  .compact-speed-btn, .compact-download-btn, .compact-calibration-btn {
    width: 35px !important;
    height: 35px !important;
  }
}

/* Enhanced Synchronization Button Styles */
.compact-calibration-btn {
  background: rgba(255, 255, 255, 0.1) !important;
  border-radius: 50% !important;
  transition: all 0.3s ease !important;
}

.compact-calibration-btn:hover {
  background: rgba(255, 255, 255, 0.2) !important;
  transform: scale(1.1);
}

.compact-calibration-btn:disabled {
  opacity: 0.4 !important;
  cursor: not-allowed !important;
}

.compact-calibration-btn:disabled:hover {
  transform: none !important;
  background: rgba(255, 255, 255, 0.1) !important;
}

/* Sync Loading and Status Indicators */
.sync-loading-container {
  animation: fadeIn 0.3s ease-in;
}

.sync-status-indicator {
  animation: slideUp 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { 
    opacity: 0; 
    transform: translateY(10px); 
  }
  to { 
    opacity: 1; 
    transform: translateY(0); 
  }
}
</style>