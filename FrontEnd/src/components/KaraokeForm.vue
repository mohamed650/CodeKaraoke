<template>
  <v-card elevation="12" class="pa-8 main-card" max-width="600" rounded="xl"
    style="min-width:500px; position:relative; z-index:2;">
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
      :error="!!codeInputError"
      :error-messages="codeInputError"
      required
      :disabled="singMode"
      type="textarea"
      spellcheck="false"
      autocomplete="off"
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
        :disabled="singMode"
      />
      <v-select
        v-model="language"
        :items="['English', 'Japanese', 'Kannada']"
        label="Language"
        variant="outlined"
        color="primary"
        class="mr-4"
        style="min-width: 150px;"
        :disabled="singMode"
      />
      <v-select
        v-model="voiceType"
        :items="['Male', 'Female']"
        label="Voice Type"
        variant="outlined"
        color="primary"
        style="min-width: 150px;"
        :disabled="singMode"
      />
    </v-row>
      <v-row justify="center" class="mb-6">
        <v-btn
          v-if="!singMode"
          @click="onSingClick"
          color="primary"
          size="large"
          elevation="6"
        >
          <v-icon left color="secondary" style="margin-right:8px;">mdi-microphone</v-icon>
          Sing My Code
        </v-btn>
      </v-row>
  </v-card>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

// Watch for resetForm prop change to reset fields
const emit = defineEmits(['sing', 'reset']);

const props = defineProps({ resetForm: Boolean });

const codeInput = ref('');
const codeInputError = ref('');
const genre = ref('Rap');
const language = ref('English');
const voiceType = ref('Male');
const singMode = ref(false);

function isValidCode(code: string): boolean {
  // Enhanced check: supports JS, Java, C, Python, etc.
  // Accepts code with semicolons, braces, function/def/class keywords, #include, let/const/var, print, for/while/if, or indentation
  const codePattern = /(;|\{|\}|function|def |class |#include|public |private |let |const |var |print\s*\(|for\s+|while\s+|if\s+|elif\s+|else:|try:|except |import |from |^\s{2,})/m;
  return codePattern.test(code);
}

function onSingClick() {
  if (!codeInput.value.trim()) {
    codeInputError.value = 'Code is required.';
    return;
  } else if (!isValidCode(codeInput.value)) {
    codeInputError.value = 'Please enter valid code.';
    return;
  } else {
    codeInputError.value = '';
  }
  singMode.value = true;
  emit('sing', {
    code: codeInput.value,
    genre: genre.value,
    language: language.value,
    voiceType: voiceType.value
  });
}

watch(() => props.resetForm, (val) => {
  if (val) {
    codeInput.value = '';
    codeInputError.value = '';
    genre.value = 'Rap';
    language.value = 'English';
    voiceType.value = 'Male';
    singMode.value = false;
    emit('reset');
  }
});
</script>
