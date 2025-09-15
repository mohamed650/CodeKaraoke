export interface KaraokeRequest {
  code: string;
  genre: string;
  language: string;
  voiceType: string;
}

export interface KaraokeLyricsResponse {
  lyrics: string[];
}

export interface KaraokeAudioResponse {
  audioUrl: string;
}
