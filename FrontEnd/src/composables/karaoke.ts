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

// Generate singing karaoke audio using Suno API
export async function fetchAudio(payload: { lyrics: string; genre: string; voice: string }): Promise<KaraokeAudioResponse> {
  const res = await fetch('/api/karaoke-audio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lyrics: payload.lyrics,
      genre: payload.genre,
      voice: payload.voice
    })
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to generate karaoke audio');
  }
  
  const audioData = await res.json();
  console.log("fetchAudio response:", audioData);
  
  return { 
    audioUrl: audioData.audioUrl,
    audioId: audioData.audioId,
    timestampedLyrics: audioData.timestampedLyrics
  };
}

// Legacy function - kept for backward compatibility but not used with Suno API
export async function addBgmToAudio(ttsAudioBlob: Blob, genre: string, voice: string): Promise<KaraokeAudioResponse> {
  // This function is no longer needed with Suno API as it generates complete musical tracks
  // But keeping it for backward compatibility
  console.warn('addBgmToAudio is deprecated when using Suno API - complete tracks are generated directly');
  return fetchAudio({ lyrics: '', genre, voice });
}
