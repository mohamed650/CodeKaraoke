<template>
  <v-app>
    <v-main class="d-flex align-center justify-center" style="min-height: 100vh; background: linear-gradient(135deg, #1976d2 0%, #90caf9 100%);">
      <v-card elevation="12" class="pa-8" max-width="600" rounded="xl">
        <v-row justify="center" class="mb-6">
          <v-icon color="primary" size="48">mdi-microphone-variant</v-icon>
          <span class="text-h4 font-weight-bold ml-2" style="color:#1976d2">Code Karaoke</span>
        </v-row>
        <v-textarea
          v-model="codeInput"
          label="Paste your code here..."
          auto-grow
          rows="4"
          class="mb-6"
          variant="outlined"
          color="primary"
        />
        <v-row class="mb-6" align="center" justify="center">
          <v-select
            v-model="genre"
            :items="['Rap', 'Anime', 'Pop']"
            label="Genre"
            variant="outlined"
            color="primary"
            class="mr-4"
            style="min-width: 150px;"
          />
          <v-select
            v-model="language"
            :items="['English', 'Japanese']"
            label="Language"
            variant="outlined"
            color="secondary"
            style="min-width: 150px;"
          />
        </v-row>
        <v-btn
          @click="singMyCode"
          color="primary"
          size="large"
          class="mb-6"
          elevation="6"
        >
          <v-icon left color="secondary">mdi-microphone</v-icon>
          Sing My Code
        </v-btn>
        <v-row v-if="audioUrl" class="mb-6" justify="center">
          <v-card class="pa-4 d-flex align-center" color="secondary" rounded="lg" elevation="2">
            <v-icon color="primary" size="32">mdi-music</v-icon>
            <audio :src="audioUrl" controls class="ml-4" style="width: 300px;"></audio>
          </v-card>
        </v-row>
        <v-card v-if="lyrics.length" class="pa-4 mt-2" color="background" rounded="lg" elevation="2">
          <div class="d-flex flex-wrap text-body-1">
            <span v-for="(line, idx) in lyrics" :key="idx" :class="{'text-primary font-weight-bold': idx === currentLyric, 'mr-2': true}">{{ line }}</span>
          </div>
        </v-card>
      </v-card>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref } from 'vue';

const codeInput = ref('');
const genre = ref('');
const language = ref('');
const audioUrl = ref('');
const lyrics = ref([]); // Array of lyric lines
const currentLyric = ref(0); // Index for karaoke highlight

function singMyCode() {
  // Placeholder: Replace with API call to backend for TTS and lyrics
  audioUrl.value = '';
  lyrics.value = codeInput.value.split('\n');
  currentLyric.value = 0;
  // Simulate audio generation
  setTimeout(() => {
    audioUrl.value = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'; // Placeholder
  }, 1000);
}
</script>

<style>
/* Tailwind is used for styling */
</style>
