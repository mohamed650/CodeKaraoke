export interface KaraokeRequest {
  code: string;
  genre: string;
  language: string;
}

export interface KaraokeRequestAudio {
  input: string;
  voice: string;
}

export interface KaraokeLyricsResponse {
  lyrics: string[];
}

export interface KaraokeAudioResponse {
  audioUrl: string;
}
