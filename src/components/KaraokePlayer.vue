<template>
  <div v-if="singMode" class="vibe-coding-right d-flex flex-column align-center justify-center" style="width:420px; max-width:600px; margin-left:40px; position:relative; background:transparent; box-shadow:none;">
    <video v-if="voiceType === 'Female'" ref="karaokeVideo" src="../assets/img/animeSinging_girl.mp4" style="width:400px; max-width:90vw; border-radius:16px; box-shadow:0 2px 16px #90caf9; background:transparent;" autoplay muted loop></video>
    <video v-if="voiceType === 'Male'" ref="karaokeVideo" src="../assets/img/animeSinging_boy.mp4" style="width:400px; max-width:90vw; border-radius:16px; box-shadow:0 2px 16px #90caf9; background:transparent;" autoplay muted loop></video>
    <div v-if="lyrics.length" class="lyrics-below" style="width:100%; text-align:center; margin-top:24px; background:none; overflow-wrap:break-word; word-break:break-word;">
      <template v-if="lyricsPlaying">
        <transition name="lyric-rise" mode="out-in">
          <span :key="currentLyric" class="text-h4 font-weight-bold" style="color:#fff; border-radius:8px; padding:8px 24px; display:inline-block; background:none;">
            {{ lyrics[currentLyric] }}
          </span>
        </transition>
        <span v-if="lyrics[currentLyric+1]">
          <transition name="lyric-rise" mode="out-in">
            <span :key="'next-' + currentLyric"
              :class="['text-body1 font-weight-medium', lyricsPlaying && currentLyric > 0 ? 'lyric-next' : '']"
              style="display:block; text-align:center; opacity:0.7; margin-top:8px; color:#fff; background:none;">
              {{ lyrics[currentLyric+1] }}
            </span>
          </transition>
        </span>
      </template>
      <template v-else>
        <span class="text-h4 font-weight-bold" style="color:#fff; border-radius:8px; padding:8px 24px; display:inline-block; background:none;">
          {{ lyrics[currentLyric] }}
        </span>
        <span v-if="lyrics[currentLyric+1]" class="text-body1 font-weight-medium" style="display:block; text-align:center; opacity:0.7; margin-top:8px; color:#fff; background:none;">
          {{ lyrics[currentLyric+1] }}
        </span>
      </template>
      <div class="w-100 d-flex justify-center mb-4" style="margin-top:0; background:transparent;">
        <audio
          v-if="lyrics.length"
          :src="audioUrl"
          controls
          style="width: 300px; background:transparent;"
          @play="handlePlayLyrics"
          @pause="handlePauseLyrics"
          @timeupdate="syncLyricsToAudio"
        ></audio>
      </div>
    </div>
    <div class="d-flex justify-start" style="background:transparent;">
      <v-btn @click="handleBackClick" color="secondary" class="mt-3">Back</v-btn>
    </div>
  </div>
</template>

<script setup>
import { defineEmits, defineProps, onMounted, ref, watch } from 'vue';
import { fetchAudio, fetchLyrics } from '../composables/karaoke';

const props = defineProps(['singMode', 'voiceType']);
const emit = defineEmits(['back']);

const lyrics = ref([]);
const audioUrl = ref('');
const currentLyric = ref(0);
const lyricsPlaying = ref(false);
const karaokeVideo = ref(null);

onMounted(async () => {
  const payload = {
    code: 'dummy code',
    genre: 'Rap',
    language: 'English',
    voiceType: props.voiceType || 'Male'
  };
  const lyricsRes = await fetchLyrics(payload);
  lyrics.value = lyricsRes.lyrics;
  const audioRes = await fetchAudio(payload);
  audioUrl.value = audioRes.audioUrl;
});

// Automatically play audio when audioUrl is set
watch(audioUrl, (val) => {
  if (val) {
    setTimeout(() => {
      const audioEl = document.querySelector('audio');
      if (audioEl) {
        audioEl.play();
      }
    }, 300);
  }
});

function handlePlayLyrics() {
  lyricsPlaying.value = true;
  if (karaokeVideo.value) karaokeVideo.value.play();
  const audioEl = document.querySelector('audio');
  if (audioEl && Math.floor(audioEl.currentTime) === 0) {
    currentLyric.value = 0;
  }
}
function handlePauseLyrics() {
  lyricsPlaying.value = false;
  if (karaokeVideo.value) karaokeVideo.value.pause();
}
function syncLyricsToAudio() {
  const audioEl = document.querySelector('audio');
  if (!audioEl) return;
  const lyricDuration = 1.8;
  let newLyricIndex = Math.floor(audioEl.currentTime / lyricDuration);
  if (newLyricIndex < 0) newLyricIndex = 0;
  if (newLyricIndex >= lyrics.value.length) newLyricIndex = lyrics.value.length - 1;
  if (newLyricIndex !== currentLyric.value) {
    currentLyric.value = newLyricIndex;
  }
}
function handleBackClick() {
  lyrics.value = [];
  audioUrl.value = '';
  currentLyric.value = 0;
  lyricsPlaying.value = false;
  emit('back');
}
</script>

<style>
/* Delay animation for next lyric */
.lyric-next {
  animation: lyricNextDelay 0.7s;
}
@keyframes lyricNextDelay {
  0% { opacity: 0; transform: translateY(40px); }
  40% { opacity: 0; transform: translateY(40px); }
  100% { opacity: 0.7; transform: translateY(0); }
}
/* Tailwind is used for styling */
.slide-left-enter-active, .slide-left-leave-active {
  transition: all 0.7s cubic-bezier(0.4, 0, 0.2, 1);
}
.slide-left-leave-active {
  transform: translateX(-40vw);
  opacity: 0;
}
.slide-in-right-enter-active, .slide-in-right-leave-active {
  transition: all 0.7s cubic-bezier(0.4, 0, 0.2, 1);
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
/* Lyric up animation (from below) */
.lyric-rise-enter-active, .lyric-rise-leave-active {
  transition: opacity 0.7s, transform 0.7s;
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
