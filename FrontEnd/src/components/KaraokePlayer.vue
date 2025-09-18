<template>
  <div v-if="singMode" class="vibe-coding-right d-flex flex-column align-center justify-center" style="width:420px; max-width:600px; margin-left:40px; position:relative; background:transparent; box-shadow:none;">
    <div v-if="loading" class="d-flex flex-column align-center justify-center" style="height:300px; width:100%;">
      <v-progress-circular indeterminate color="primary" size="64" />
      <span class="text-h6 mt-4" style="color:#fff;">Generating lyrics and audio...</span>
    </div>
    <template v-else>
  <video v-if="voiceType === 'Female'" ref="karaokeVideo" src="../assets/img/animeSinging_girl.mp4" style="width:400px; max-width:90vw; border-radius:16px; box-shadow:0 2px 16px #90caf9; background:transparent;" muted loop></video>
  <video v-if="voiceType === 'Male'" ref="karaokeVideo" src="../assets/img/animeSinging_boy.mp4" style="width:400px; max-width:90vw; border-radius:16px; box-shadow:0 2px 16px #90caf9; background:transparent;" muted loop></video>
      <div class="lyrics-below" style="width:100%; text-align:center; margin-top:30px; background:none; overflow-wrap:break-word; word-break:break-word;">
        <div v-if="lyrics && lyrics.length" class="lyric-story-container" style="height:150px;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;">
          <transition name="lyric-rise" mode="out-in">
            <span :key="currentLyric" class="text-h4 font-weight-bold" style="color:#fff; border-radius:8px; padding:8px 24px; display:inline-block; background:none;">
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
        <!-- Audio player removed: only lyrics are displayed -->
      </div>
      <div class="w-100 d-flex justify-center mb-4" style="margin-top:10px; background:transparent;">
        <audio
          v-if="props.audioUrl"
          ref="audioEl"
          :src="props.audioUrl"
          controls
          style="width: 300px; background:transparent;"
          @play="handlePlayLyrics"
          @pause="handlePauseLyrics"
          @timeupdate="syncLyricsToAudio"
        ></audio>
      </div>
      <div class="d-flex justify-start" style="background:transparent;">
        <v-btn @click="handleBackClick" color="primary" class="mt-3">Back</v-btn>
      </div>
    </template>
  </div>
</template>

<script setup>
import { defineEmits, defineProps, onUnmounted, ref, watch } from 'vue';

const props = defineProps({
  lyrics: Array,
  audioUrl: String,
  singMode: Boolean,
  voiceType: String,
  loading: Boolean
});
const emit = defineEmits(['back']);
const karaokeVideo = ref(null);
const audioEl = ref(null);
const currentLyric = ref(0);
let lyricsPlaying = ref(false);
const showManualPlay = ref(false);

watch(() => props.lyrics, (newLyrics) => {
  currentLyric.value = 0;
});

onUnmounted(() => {
  if (lyricTimer) clearInterval(lyricTimer);
});
// ...existing code...


// Automatically play audio when loading becomes false and audioUrl is set
watch(
  () => [props.loading, props.audioUrl],
  async ([loading, audioUrl]) => {
    if (!loading && audioUrl) {
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
  }
);

function handlePlayLyrics() {
  lyricsPlaying.value = true;
  if (karaokeVideo.value) karaokeVideo.value.play();
}
function handlePauseLyrics() {
  lyricsPlaying.value = false;
  if (karaokeVideo.value) karaokeVideo.value.pause();
}
function syncLyricsToAudio(e) {
  // Use the event's currentTime for more accurate sync
  const audio = e?.target || audioEl.value;
  if (!audio) return;
  const totalLines = props.lyrics.length;
  const totalDuration = audio.duration || 1;
  const lyricDuration = totalDuration / (totalLines || 1);
  let newLyricIndex = Math.floor(audio.currentTime / lyricDuration);
  if (newLyricIndex < 0) newLyricIndex = 0;
  if (newLyricIndex >= totalLines) newLyricIndex = totalLines - 1;
  if (newLyricIndex !== currentLyric.value) {
    currentLyric.value = newLyricIndex;
  }
  // Keep video in sync
  if (karaokeVideo.value) {
    if (lyricsPlaying.value) karaokeVideo.value.play();
    else karaokeVideo.value.pause();
  }
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
</style>
