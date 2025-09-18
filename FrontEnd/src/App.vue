<template>
  <v-app>
    <v-main class="d-flex align-center justify-center" style="min-height: 100vh; background: linear-gradient(120deg, #64b5f6 0%, #9575cd 40%, #ec407a 80%, #ffd54f 100%); box-shadow: 0 0 60px 0 rgba(142,36,170,0.18) inset;">
      <div class="karaoke-layout d-flex flex-row align-center justify-center w-100" style="min-height: 80vh;">
        <KaraokeForm @sing="onSing" :resetForm="resetForm" @reset="onFormReset" />
        <div v-if="loading" class="d-flex flex-column align-center justify-center" style="position:absolute; left:0; right:0; top:0; bottom:0; z-index:10; background:rgba(40,40,40,0.7);">
          <v-progress-circular indeterminate color="primary" size="64" />
          <span class="text-h6 mt-4" style="color:#fff;">Generating lyrics and audio...</span>
        </div>
        <transition name="slide-in-right">
          <KaraokePlayer
            v-if="singMode && !loading"
            :lyrics="lyrics"
            :audioUrl="audioUrl"
            :singMode="singMode"
            :voiceType="voiceType"
            @back="onBack"
          />
        </transition>
      </div>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref } from 'vue';
import KaraokeForm from './components/KaraokeForm.vue';
import KaraokePlayer from './components/KaraokePlayer.vue';
import { addBgmToAudio, fetchAudio, fetchLyrics } from './composables/karaoke';

const singMode = ref(false);
const lyrics = ref([]);
const audioUrl = ref('');
const voiceType = ref('Male');
const resetForm = ref(false);
const loading = ref(false);

function onSing(payload) {
  singMode.value = true;
  voiceType.value = payload.voiceType;
  lyrics.value = [];
  audioUrl.value = '';
  loading.value = true;

  // Voice selection logic
  let selectedVoice = 'alloy';
  if (payload.voiceType === 'Male') {
    if (payload.genre === 'Pop') selectedVoice = 'alloy';
    else if (payload.genre === 'Anime') selectedVoice = 'onyx';
    else if (payload.genre === 'Rap') selectedVoice = 'echo';
  } else if (payload.voiceType === 'Female') {
    if (payload.genre === 'Pop') selectedVoice = 'shimmer';
  else if (payload.genre === 'Anime') selectedVoice = 'shimmer';
    else if (payload.genre === 'Rap') selectedVoice = 'nova';
  }

  fetchLyrics(payload)
    .then((data) => {
      lyrics.value = Array.isArray(data.lyrics) ? data.lyrics : [];
      if (lyrics.value.length) {
        fetchAudio({
          input: lyrics.value.join('\n'),
          voice: selectedVoice
        })
          .then(async (audioData) => {
            // Convert audioUrl to Blob
            const response = await fetch(audioData.audioUrl);
            const ttsAudioBlob = await response.blob();
            // Add BGM to audio
            const mixedAudio = await addBgmToAudio(ttsAudioBlob, payload.genre, payload.voiceType);
            audioUrl.value = mixedAudio.audioUrl || '';
            loading.value = false;
          })
          .catch(() => {
            audioUrl.value = '';
            loading.value = false;
          });
      } else {
        loading.value = false;
      }
    })
    .catch(() => {
      lyrics.value = ['Error fetching lyrics'];
      loading.value = false;
    });
}

function onBack() {
  loading.value = false;
  singMode.value = false;
  lyrics.value = [];
  audioUrl.value = '';
  voiceType.value = 'Male';
  resetForm.value = true;
}

function onFormReset() {
  resetForm.value = false;
}

</script>

<style>

</style>
