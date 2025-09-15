import type { KaraokeAudioResponse, KaraokeLyricsResponse, KaraokeRequest } from '../types/karaoke';

export async function fetchLyrics(payload: KaraokeRequest): Promise<KaraokeLyricsResponse> {
  // Uncomment below to use real API
  // const res = await fetch('api/fetchLyrics', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(payload)
  // });
  // if (!res.ok) throw new Error('Failed to fetch lyrics');
  // return await res.json();

  // Dummy lyrics for testing
  return {
    lyrics: [
      'This is the first dummy lyric.',
      'Here comes the second line!',
      'Third lyric for the test.',
      'And the fourth lyric appears.'
    ]
  };
}

export async function fetchAudio(payload: KaraokeRequest): Promise<KaraokeAudioResponse> {
  // Uncomment below to use real API
  // const res = await fetch('api/fetchAudio', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(payload)
  // });
  // if (!res.ok) throw new Error('Failed to fetch audio');
  // return await res.json();

  // Dummy audio URL for testing
  return {
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
  };
}
