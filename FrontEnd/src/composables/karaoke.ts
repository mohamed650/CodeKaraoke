import type { KaraokeAudioResponse, KaraokeLyricsResponse, KaraokeRequest, KaraokeRequestAudio } from '../types/karaoke';

export async function fetchLyrics(payload: KaraokeRequest): Promise<KaraokeLyricsResponse> {
  const res = await fetch('/api/lyrics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to fetch lyrics');
  const data = await res.json();
  console.log("fetchLyrics response:", data);
  return data;
}

export async function fetchAudio(payload: KaraokeRequestAudio): Promise<KaraokeAudioResponse> {
  const params = new URLSearchParams({
    lyrics: payload.input,
    voice: payload.voice
  });
  const res = await fetch(`/api/tts?${params.toString()}`, {
    method: 'GET'
  });
  if (!res.ok) throw new Error('Failed to fetch audio');
  const audioBuffer = await res.arrayBuffer();
  const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
  const audioUrl = URL.createObjectURL(audioBlob);
  console.log("fetchAudio URL:", audioUrl);
  
  return { audioUrl };
}

// Upload TTS audio and mix with BGM
export async function addBgmToAudio(ttsAudioBlob: Blob, genre: string, voice: string): Promise<KaraokeAudioResponse> {
  const formData = new FormData();
  formData.append('ttsAudio', ttsAudioBlob, 'tts.mp3');
  formData.append('genre', genre);
  formData.append('voice', voice);
  const res = await fetch('/api/add-bgm', {
    method: 'POST',
    body: formData
  });
  if (!res.ok) throw new Error('Failed to add BGM to audio');
  const audioBuffer = await res.arrayBuffer();
  const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
  const audioUrl = URL.createObjectURL(audioBlob);
  console.log('addBgmToAudio URL:', audioUrl);
  return { audioUrl };
}
