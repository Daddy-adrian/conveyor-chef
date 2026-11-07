// audioManager.js - 100% Reliable, Self-Contained Local Audio Engine
// Uses native high-fidelity WAV speech files paired with Web Audio API

class AudioManager {
  constructor() {
    this.volume = 0.9;
    this.musicVolume = 0.22;
    this.audioCtx = null;
    this.bgmPlaying = false;
    this.bgmGain = null;
    this.bgmInterval = null;

    // Cache of loaded and pre-parsed AudioBuffers for zero-latency instant playback
    this.audioBufferCache = new Map();

    // Active audio nodes tracking
    this.activeSourceNode = null;
    this.sentencePlaybackToken = 0;
  }

  _getAudioContext() {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * Pre-fetches and caches an audio word buffer from the local /audio directory
   * @param {string} word
   * @returns {Promise<AudioBuffer|null>}
   */
  async loadWordBuffer(word) {
    if (!word) return null;
    const cleanWord = String(word).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!cleanWord) return null;

    if (this.audioBufferCache.has(cleanWord)) {
      return this.audioBufferCache.get(cleanWord);
    }

    const ctx = this._getAudioContext();
    if (!ctx) return null;

    try {
      const response = await fetch(`./audio/${cleanWord}.wav`);
      if (!response.ok) return null;
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      this.audioBufferCache.set(cleanWord, audioBuffer);
      return audioBuffer;
    } catch (e) {
      return null;
    }
  }

  /**
   * Plays a single AudioBuffer instantly with volume scaling
   * @param {AudioBuffer} buffer
   * @returns {Promise<void>} Resolves when playback finishes
   */
  playBuffer(buffer) {
    return new Promise((resolve) => {
      if (!buffer) {
        resolve();
        return;
      }
      const ctx = this._getAudioContext();
      if (!ctx) {
        resolve();
        return;
      }

      try {
        const source = ctx.createBufferSource();
        const gainNode = ctx.createGain();

        source.buffer = buffer;
        gainNode.gain.setValueAtTime(this.volume, ctx.currentTime);

        source.connect(gainNode);
        gainNode.connect(ctx.destination);

        this.activeSourceNode = source;

        source.onended = () => {
          if (this.activeSourceNode === source) {
            this.activeSourceNode = null;
          }
          resolve();
        };

        source.start(ctx.currentTime);
      } catch (e) {
        resolve();
      }
    });
  }

  /**
   * Immediately pronounces a single word (e.g., when item is grabbed or clicked)
   * Plays with zero latency from the local audio bank.
   * @param {string} word
   */
  async speakWord(word) {
    if (!word) return;
    this.stopSpeech();

    const cleanWord = String(word).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const buffer = await this.loadWordBuffer(cleanWord);
    if (buffer) {
      await this.playBuffer(buffer);
    } else {
      // Fallback: If word isn't in pre-compiled list, use standard speech utterance
      this._speakWithNativeSpeech(cleanWord);
    }
  }

  /**
   * Speaks the entire mission command sentence word-by-word with real-time karaoke highlight.
   * Plays through each clean local WAV file in perfect sequence.
   * @param {string} sentence
   * @param {function(number): void} [onWordBoundaryCallback]
   */
  async speakMission(sentence, onWordBoundaryCallback) {
    if (!sentence) return;
    this.stopSpeech();

    // Increment token to cancel any previous sentence sequence
    const currentToken = ++this.sentencePlaybackToken;

    const words = String(sentence).trim().split(/\s+/);
    if (!words.length) return;

    for (let i = 0; i < words.length; i++) {
      if (this.sentencePlaybackToken !== currentToken) {
        return; // Stopped or superseded by another mission
      }

      if (typeof onWordBoundaryCallback === 'function') {
        onWordBoundaryCallback(i);
      }

      const rawWord = words[i];
      const cleanWord = rawWord.toLowerCase().replace(/[^a-z0-9]/g, '');

      const buffer = await this.loadWordBuffer(cleanWord);
      if (this.sentencePlaybackToken !== currentToken) return;

      if (buffer) {
        await this.playBuffer(buffer);
      } else {
        await this._speakNativePromise(cleanWord);
      }

      // Small natural breath pause between words (40ms)
      await new Promise((r) => setTimeout(r, 45));
    }

    if (this.sentencePlaybackToken === currentToken && typeof onWordBoundaryCallback === 'function') {
      onWordBoundaryCallback(-1);
    }
  }

  stopSpeech() {
    this.sentencePlaybackToken++;

    if (this.activeSourceNode) {
      try {
        this.activeSourceNode.stop();
      } catch (e) {}
      this.activeSourceNode = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
  }

  _speakWithNativeSpeech(text) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
      const u = new SpeechSynthesisUtterance(text);
      u.volume = this.volume;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }

  _speakNativePromise(text) {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        setTimeout(resolve, 300);
        return;
      }
      try {
        window.speechSynthesis.cancel();
        window.speechSynthesis.resume();
        const u = new SpeechSynthesisUtterance(text);
        u.volume = this.volume;
        u.onend = resolve;
        u.onerror = resolve;
        window.speechSynthesis.speak(u);
      } catch (e) {
        resolve();
      }
    });
  }

  /**
   * Unlocks AudioContext and Web Speech synthesis on explicit user gesture
   */
  unlockAudio() {
    const ctx = this._getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    // Prime Web Speech API for mobile/desktop browsers on HTTPS origins
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.resume();
      } catch (e) {}
    }
    this.startBackgroundMusic();
  }

  /**
   * Generates a soft tactile kitchen drop/thud sound when an item is placed in furniture
   */
  playThud() {
    try {
      const ctx = this._getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);

      const targetGain = Math.max(0.001, this.volume * 0.4);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(targetGain, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.18);
    } catch (e) {}
  }

  /**
   * Generates a short pleasant 880Hz chime using Web Audio API
   */
  playDing() {
    try {
      const ctx = this._getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1760, now + 0.15);

      const targetGain = Math.max(0.001, this.volume * 0.35);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(targetGain, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.65);
    } catch (e) {}
  }

  /**
   * Generates a gentle friendly "boop" for invalid drop zones
   */
  playBoop() {
    try {
      const ctx = this._getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.18);

      const targetGain = Math.max(0.001, this.volume * 0.25);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(targetGain, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.26);
    } catch (e) {}
  }

  /**
   * Starts procedural cozy restaurant/café bossa-nova background music
   */
  startBackgroundMusic() {
    if (this.bgmPlaying) return;
    const ctx = this._getAudioContext();
    if (!ctx) return;

    this.bgmPlaying = true;

    this.bgmGain = ctx.createGain();
    this.bgmGain.gain.setValueAtTime(this.volume * this.musicVolume, ctx.currentTime);
    this.bgmGain.connect(ctx.destination);

    const chords = [
      [261.63, 329.63, 392.0, 493.88], // Cmaj7
      [220.0, 261.63, 329.63, 392.0], // Am7
      [293.66, 349.23, 440.0, 523.25], // Dm7
      [196.0, 246.94, 293.66, 349.23] // G7
    ];
    const bassNotes = [130.81, 110.0, 146.83, 98.0];
    let step = 0;

    const playBar = () => {
      if (!this.bgmPlaying) return;
      const now = ctx.currentTime;
      const chordIndex = Math.floor(step / 2) % chords.length;
      const chord = chords[chordIndex];
      const bass = bassNotes[chordIndex];

      // Bass note
      try {
        const bassOsc = ctx.createOscillator();
        const bassGain = ctx.createGain();
        bassOsc.type = 'triangle';
        bassOsc.frequency.setValueAtTime(bass, now);

        bassGain.gain.setValueAtTime(0.001, now);
        bassGain.gain.linearRampToValueAtTime(0.28, now + 0.05);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        bassOsc.connect(bassGain);
        bassGain.connect(this.bgmGain);
        bassOsc.start(now);
        bassOsc.stop(now + 1.25);
      } catch (err) {}

      // Electric piano arpeggiated chords
      chord.forEach((freq, idx) => {
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.14);

          gain.gain.setValueAtTime(0.0001, now + idx * 0.14);
          gain.gain.linearRampToValueAtTime(0.09, now + idx * 0.14 + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.14 + 1.1);

          osc.connect(gain);
          gain.connect(this.bgmGain);
          osc.start(now + idx * 0.14);
          osc.stop(now + idx * 0.14 + 1.15);
        } catch (err) {}
      });

      // Soft brush rhythm
      try {
        const bufferSize = ctx.sampleRate * 0.04;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 6000;
        filter.Q.value = 3.0;

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.04, now + 0.25);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.bgmGain);

        noise.start(now + 0.25);
      } catch (err) {}

      step++;
    };

    playBar();
    this.bgmInterval = setInterval(playBar, 1400);
  }

  stopBackgroundMusic() {
    this.bgmPlaying = false;
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }

  setVolume(val) {
    const clamped = Math.max(0, Math.min(1, Number(val) || 0));
    this.volume = clamped;
    if (this.bgmGain && this.audioCtx) {
      this.bgmGain.gain.setValueAtTime(this.volume * this.musicVolume, this.audioCtx.currentTime);
    }
  }
}

export const audioManager = new AudioManager();
export default audioManager;
