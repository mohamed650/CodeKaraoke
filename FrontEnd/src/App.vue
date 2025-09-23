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
            :audioId="audioId"
            :timestampedLyrics="timestampedLyrics"
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
const audioId = ref('');
const timestampedLyrics = ref(null);
const voiceType = ref('Male');
const resetForm = ref(false);
const loading = ref(false);

function onSing(payload) {
  singMode.value = true;
  voiceType.value = payload.voiceType;
  lyrics.value = [];
  audioUrl.value = '';
  audioId.value = '';
  loading.value = true;

  fetchLyrics(payload)
    .then((data) => {
      lyrics.value = Array.isArray(data.lyrics) ? data.lyrics : [];
      if (lyrics.value.length) {
        // Use Suno API to generate singing audio directly
        fetchAudio({
          lyrics: lyrics.value.join('\n'),
          genre: payload.genre,
          voice: payload.voiceType
        })
          .then((audioData) => {
            audioUrl.value = audioData.audioUrl || '';
            audioId.value = audioData.audioId || '';
            timestampedLyrics.value = audioData.timestampedLyrics || null;
            loading.value = false;
            console.log('Audio generated with ID:', audioData.audioId);
            if (audioData.timestampedLyrics) {
              console.log('✅ Timestamped lyrics included in response:', audioData.timestampedLyrics);
            } else {
              console.log('⚠️ No timestamped lyrics in response');
            }
          })
          .catch((error) => {
            console.error('Audio generation error:', error);
            audioUrl.value = '';
            audioId.value = '';
            loading.value = false;
          });
      } else {
        loading.value = false;
      }
    })
    .catch((error) => {
      console.error('Lyrics generation error:', error);
      lyrics.value = ['Error fetching lyrics'];
      loading.value = false;
    });
}

function onBack() {
  loading.value = false;
  singMode.value = false;
  lyrics.value = [];
  audioUrl.value = '';
  audioId.value = '';
  timestampedLyrics.value = null;
  voiceType.value = 'Male';
  resetForm.value = true;
}

function onFormReset() {
  resetForm.value = false;
}

</script>

<style>

</style>
