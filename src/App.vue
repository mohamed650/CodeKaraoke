<template>
  <v-app>
    <v-main class="d-flex align-center justify-center" style="min-height: 100vh; background: linear-gradient(120deg, #64b5f6 0%, #9575cd 40%, #ec407a 80%, #ffd54f 100%); box-shadow: 0 0 60px 0 rgba(142,36,170,0.18) inset;">
      <div class="karaoke-layout d-flex flex-row align-center justify-center w-100" style="min-height: 80vh;">
  <KaraokeForm @sing="onSing" :resetForm="resetForm" @reset="onFormReset" />
        <transition name="slide-in-right">
          <KaraokePlayer
            v-if="singMode"
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
import { fetchAudio, fetchLyrics } from './composables/karaoke';

const singMode = ref(false);
const lyrics = ref([]);
const audioUrl = ref('');
const voiceType = ref('Male');
const resetForm = ref(false);

function onSing(payload) {
  singMode.value = true;
  voiceType.value = payload.voiceType;
  lyrics.value = [];
  audioUrl.value = '';
  // Fetch lyrics
  fetchLyrics(payload)
    .then((data) => {
      lyrics.value = Array.isArray(data.lyrics) ? data.lyrics : [];
      // Play lyrics automatically (handled by KaraokePlayer)
    })
    .catch(() => {
      lyrics.value = ['Error fetching lyrics'];
    });
  // Fetch audio
  fetchAudio(payload)
    .then((data) => {
      audioUrl.value = data.audioUrl || '';
      // Play audio automatically (handled by KaraokePlayer)
    })
    .catch(() => {
      audioUrl.value = '';
    });
}

function onBack() {
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
