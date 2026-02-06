// Audio management for music, SFX, and voice
// The Marble Swindle - Engine Module

import { GameConfig, DEFAULT_CONFIG } from '@/types/game';

interface AudioTrack {
  audio: HTMLAudioElement;
  volume: number;
  isLooping: boolean;
  fadeInterval?: number;
}

class AudioManager {
  private config: GameConfig = DEFAULT_CONFIG;
  private musicTrack: AudioTrack | null = null;
  private ambienceTrack: AudioTrack | null = null;
  private sfxPool: Map<string, HTMLAudioElement[]> = new Map();
  private voiceLine: HTMLAudioElement | null = null;
  private isMuted = false;
  private isInitialized = false;

  // Audio context for Web Audio API (needed for some browsers)
  private audioContext: AudioContext | null = null;

  // Base paths for audio files
  private readonly MUSIC_PATH = '/audio/music/';
  private readonly SFX_PATH = '/audio/sfx/';
  private readonly VOICE_PATH = '/audio/voice/';

  constructor() {
    // Initialize on first user interaction (required by browsers)
    if (typeof window !== 'undefined') {
      const initAudio = () => {
        if (!this.isInitialized) {
          this.audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
          this.isInitialized = true;
        }
        document.removeEventListener('click', initAudio);
        document.removeEventListener('keydown', initAudio);
      };

      document.addEventListener('click', initAudio);
      document.addEventListener('keydown', initAudio);
    }
  }

  // ============================================
  // CONFIGURATION
  // ============================================

  setConfig(config: Partial<GameConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Update volumes on existing tracks
    if (this.musicTrack) {
      this.musicTrack.audio.volume = this.isMuted ? 0 : this.config.musicVolume;
    }
    if (this.ambienceTrack) {
      this.ambienceTrack.audio.volume = this.isMuted ? 0 : this.config.musicVolume * 0.7;
    }
  }

  setMuted(muted: boolean): void {
    this.isMuted = muted;
    
    if (this.musicTrack) {
      this.musicTrack.audio.volume = muted ? 0 : this.config.musicVolume;
    }
    if (this.ambienceTrack) {
      this.ambienceTrack.audio.volume = muted ? 0 : this.config.musicVolume * 0.7;
    }
    if (this.voiceLine) {
      this.voiceLine.volume = muted ? 0 : this.config.voiceVolume;
    }
  }

  toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  // ============================================
  // MUSIC
  // ============================================

  async playMusic(trackName: string, fadeInMs: number = 1000): Promise<void> {
    // Stop current music with fade
    if (this.musicTrack) {
      await this.fadeOut(this.musicTrack, fadeInMs / 2);
      this.musicTrack.audio.pause();
      this.musicTrack = null;
    }

    // Load and play new track
    const audio = new Audio(`${this.MUSIC_PATH}${trackName}.ogg`);
    audio.loop = true;
    audio.volume = 0;

    this.musicTrack = {
      audio,
      volume: this.config.musicVolume,
      isLooping: true,
    };

    try {
      await audio.play();
      await this.fadeIn(this.musicTrack, fadeInMs);
    } catch (error) {
      console.warn('Failed to play music:', error);
    }
  }

  async stopMusic(fadeOutMs: number = 1000): Promise<void> {
    if (this.musicTrack) {
      await this.fadeOut(this.musicTrack, fadeOutMs);
      this.musicTrack.audio.pause();
      this.musicTrack = null;
    }
  }

  // ============================================
  // AMBIENCE
  // ============================================

  async playAmbience(trackName: string, fadeInMs: number = 2000): Promise<void> {
    if (this.ambienceTrack) {
      await this.fadeOut(this.ambienceTrack, fadeInMs / 2);
      this.ambienceTrack.audio.pause();
      this.ambienceTrack = null;
    }

    const audio = new Audio(`${this.MUSIC_PATH}ambient/${trackName}.ogg`);
    audio.loop = true;
    audio.volume = 0;

    this.ambienceTrack = {
      audio,
      volume: this.config.musicVolume * 0.7,
      isLooping: true,
    };

    try {
      await audio.play();
      await this.fadeIn(this.ambienceTrack, fadeInMs);
    } catch (error) {
      console.warn('Failed to play ambience:', error);
    }
  }

  async stopAmbience(fadeOutMs: number = 2000): Promise<void> {
    if (this.ambienceTrack) {
      await this.fadeOut(this.ambienceTrack, fadeOutMs);
      this.ambienceTrack.audio.pause();
      this.ambienceTrack = null;
    }
  }

  // ============================================
  // SOUND EFFECTS
  // ============================================

  playSFX(sfxName: string, volume?: number): void {
    const effectiveVolume = (volume ?? 1) * this.config.sfxVolume * (this.isMuted ? 0 : 1);
    
    // Get or create audio pool for this SFX
    let pool = this.sfxPool.get(sfxName);
    if (!pool) {
      pool = [];
      this.sfxPool.set(sfxName, pool);
    }

    // Find an available audio element or create a new one
    let audio = pool.find((a) => a.paused || a.ended);
    if (!audio) {
      audio = new Audio(`${this.SFX_PATH}${sfxName}.ogg`);
      pool.push(audio);
    }

    audio.volume = effectiveVolume;
    audio.currentTime = 0;
    audio.play().catch((error) => {
      console.warn('Failed to play SFX:', error);
    });
  }

  // Convenience methods for common SFX
  playClick(): void {
    this.playSFX('ui/sfx_click');
  }

  playDenied(): void {
    this.playSFX('ui/sfx_denied');
  }

  playPickup(): void {
    this.playSFX('ui/sfx_pickup');
  }

  playPuzzleSolved(): void {
    this.playSFX('stings/sting_puzzle_solved', 1.2);
  }

  // ============================================
  // VOICE
  // ============================================

  async playVoiceLine(
    characterId: string,
    lineId: string
  ): Promise<void> {
    // Stop any current voice line
    if (this.voiceLine) {
      this.voiceLine.pause();
      this.voiceLine = null;
    }

    if (!this.config.enableVoice) return;

    const audio = new Audio(`${this.VOICE_PATH}${characterId}/${lineId}.ogg`);
    audio.volume = this.isMuted ? 0 : this.config.voiceVolume;

    this.voiceLine = audio;

    return new Promise((resolve) => {
      audio.onended = () => {
        this.voiceLine = null;
        resolve();
      };
      audio.onerror = () => {
        this.voiceLine = null;
        resolve(); // Don't fail if voice line is missing
      };
      audio.play().catch(() => {
        this.voiceLine = null;
        resolve();
      });
    });
  }

  stopVoice(): void {
    if (this.voiceLine) {
      this.voiceLine.pause();
      this.voiceLine = null;
    }
  }

  // ============================================
  // FADE UTILITIES
  // ============================================

  private fadeIn(track: AudioTrack, durationMs: number): Promise<void> {
    return new Promise((resolve) => {
      const targetVolume = this.isMuted ? 0 : track.volume;
      const steps = 20;
      const stepDuration = durationMs / steps;
      const volumeStep = targetVolume / steps;
      let currentStep = 0;

      if (track.fadeInterval) {
        clearInterval(track.fadeInterval);
      }

      track.fadeInterval = window.setInterval(() => {
        currentStep++;
        track.audio.volume = Math.min(volumeStep * currentStep, targetVolume);

        if (currentStep >= steps) {
          clearInterval(track.fadeInterval);
          track.fadeInterval = undefined;
          resolve();
        }
      }, stepDuration);
    });
  }

  private fadeOut(track: AudioTrack, durationMs: number): Promise<void> {
    return new Promise((resolve) => {
      const startVolume = track.audio.volume;
      const steps = 20;
      const stepDuration = durationMs / steps;
      const volumeStep = startVolume / steps;
      let currentStep = 0;

      if (track.fadeInterval) {
        clearInterval(track.fadeInterval);
      }

      track.fadeInterval = window.setInterval(() => {
        currentStep++;
        track.audio.volume = Math.max(startVolume - volumeStep * currentStep, 0);

        if (currentStep >= steps) {
          clearInterval(track.fadeInterval);
          track.fadeInterval = undefined;
          resolve();
        }
      }, stepDuration);
    });
  }

  // ============================================
  // PRELOADING
  // ============================================

  preloadMusic(trackNames: string[]): void {
    for (const name of trackNames) {
      const audio = new Audio(`${this.MUSIC_PATH}${name}.ogg`);
      audio.preload = 'auto';
    }
  }

  preloadSFX(sfxNames: string[]): void {
    for (const name of sfxNames) {
      const audio = new Audio(`${this.SFX_PATH}${name}.ogg`);
      audio.preload = 'auto';
      
      // Add to pool
      let pool = this.sfxPool.get(name);
      if (!pool) {
        pool = [];
        this.sfxPool.set(name, pool);
      }
      pool.push(audio);
    }
  }

  // ============================================
  // CLEANUP
  // ============================================

  dispose(): void {
    this.stopMusic(0);
    this.stopAmbience(0);
    this.stopVoice();
    this.sfxPool.clear();
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Singleton instance
export const audioManager = new AudioManager();

// Export for convenience
export default audioManager;

// ============================================
// CONVENIENCE EXPORTS
// ============================================

export function playSound(sfxName: string, volume?: number): void {
  audioManager.playSFX(sfxName, volume);
}

export function playMusic(trackName: string, fadeInMs?: number): Promise<void> {
  return audioManager.playMusic(trackName, fadeInMs);
}

export function stopMusic(fadeOutMs?: number): Promise<void> {
  return audioManager.stopMusic(fadeOutMs);
}

export function setMusicVolume(volume: number): void {
  audioManager.setConfig({ musicVolume: volume });
}

export function setSFXVolume(volume: number): void {
  audioManager.setConfig({ sfxVolume: volume });
}

export function setVoiceVolume(volume: number): void {
  audioManager.setConfig({ voiceVolume: volume });
}

export function pauseAll(): void {
  audioManager.setMuted(true);
}

export function resumeAll(): void {
  audioManager.setMuted(false);
}
