import axios from 'axios';

const ELEVENLABS_API_KEY = process.env.REACT_APP_ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Low-latency voice synthesis optimized for live performance
class VoiceSynthesisService {
  constructor() {
    this.audioQueue = new Map(); // Pre-cache audio for common phrases
    this.currentAudio = null;
    this.isInitialized = false;

    // Optimized settings for lowest latency
    this.lowLatencySettings = {
      model_id: 'eleven_turbo_v2', // Fastest ElevenLabs model
      voice_settings: {
        stability: 0.35, // Lower stability for faster processing
        similarity_boost: 0.5, // Reduced for speed
        style: 0.0, // Minimal style processing
        use_speaker_boost: false // Disabled for speed
      },
      optimize_streaming_latency: 4, // Maximum optimization
      output_format: 'mp3_22050_32' // Lower quality for speed
    };

    // Standard settings for better quality when latency isn't critical
    this.standardSettings = {
      model_id: 'eleven_monolingual_v1',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.5,
        use_speaker_boost: true
      },
      optimize_streaming_latency: 2,
      output_format: 'mp3_44100_64'
    };
  }

  // Initialize the service
  async initialize() {
    if (this.isInitialized) return true;

    try {
      // Test API availability
      if (!ELEVENLABS_API_KEY) {
        console.warn('[VoiceSynthesis] No ElevenLabs API key - using browser TTS');
        this.isInitialized = true;
        return true;
      }

      // Pre-warm the API with a quick test
      console.log('[VoiceSynthesis] Initializing with low-latency settings');
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('[VoiceSynthesis] Initialization failed:', error);
      this.isInitialized = true; // Continue with fallback
      return false;
    }
  }

  // Speak text with low latency optimization
  async speakTextFast(text, voiceId, priority = 'speed') {
    const settings = priority === 'speed' ? this.lowLatencySettings : this.standardSettings;
    return this.speakText(text, voiceId, settings);
  }

  // Main text-to-speech function
  async speakText(text, voiceId, customSettings = null) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Stop any currently playing audio for immediate response
    this.stopCurrentAudio();

    const settings = customSettings || this.lowLatencySettings;

    try {
      console.log(`[VoiceSynthesis] Speaking: "${text}" with voice ${voiceId}`);
      const startTime = Date.now();

      const response = await axios.post(
        `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}/stream`, // Use streaming endpoint for lower latency
        {
          text: text,
          ...settings
        },
        {
          headers: {
            'Accept': 'audio/mpeg',
            'xi-api-key': ELEVENLABS_API_KEY,
            'Content-Type': 'application/json'
          },
          responseType: 'blob',
          timeout: 5000 // 5 second timeout for fast response
        }
      );

      const processingTime = Date.now() - startTime;
      console.log(`[VoiceSynthesis] Generated audio in ${processingTime}ms`);

      const audioBlob = new Blob([response.data], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      // Store reference to current audio
      this.currentAudio = audio;

      return new Promise((resolve) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          this.currentAudio = null;
          const totalTime = Date.now() - startTime;
          console.log(`[VoiceSynthesis] Total time: ${totalTime}ms`);
          resolve();
        };

        audio.onerror = (error) => {
          console.error('[VoiceSynthesis] Audio playback error:', error);
          URL.revokeObjectURL(audioUrl);
          this.currentAudio = null;
          resolve();
        };

        // Start playback immediately
        audio.play().catch(error => {
          console.error('[VoiceSynthesis] Failed to play audio:', error);
          URL.revokeObjectURL(audioUrl);
          this.currentAudio = null;
          resolve();
        });
      });

    } catch (error) {
      console.error('[VoiceSynthesis] ElevenLabs TTS failed, using browser fallback:', error);
      return this.fallbackTTS(text);
    }
  }

  // Ultra-fast speech for emergencies or interruptions
  async speakTextUltraFast(text, voiceId) {
    const ultraFastSettings = {
      model_id: 'eleven_turbo_v2',
      voice_settings: {
        stability: 0.2, // Minimal stability for maximum speed
        similarity_boost: 0.3,
        style: 0.0,
        use_speaker_boost: false
      },
      optimize_streaming_latency: 4,
      output_format: 'mp3_22050_32'
    };

    return this.speakText(text, voiceId, ultraFastSettings);
  }

  // Pre-generate and cache common phrases for instant playback
  async preGenerateCommonPhrases(voiceId, phrases = []) {
    const defaultPhrases = [
      'Yes, and...',
      'What?',
      'I see...',
      'Hold on...',
      'Wait, what?',
      'That\'s interesting...',
      'Let me think...',
      'Oh!',
      'Really?',
      'Hmm...'
    ];

    const allPhrases = [...defaultPhrases, ...phrases];

    console.log(`[VoiceSynthesis] Pre-generating ${allPhrases.length} phrases for ${voiceId}`);

    const cachePromises = allPhrases.map(async (phrase) => {
      try {
        const response = await axios.post(
          `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
          {
            text: phrase,
            ...this.lowLatencySettings
          },
          {
            headers: {
              'Accept': 'audio/mpeg',
              'xi-api-key': ELEVENLABS_API_KEY,
              'Content-Type': 'application/json'
            },
            responseType: 'blob',
            timeout: 10000
          }
        );

        const audioBlob = new Blob([response.data], { type: 'audio/mpeg' });
        const cacheKey = `${voiceId}:${phrase.toLowerCase()}`;
        this.audioQueue.set(cacheKey, audioBlob);

        console.log(`[VoiceSynthesis] Cached phrase: "${phrase}"`);
      } catch (error) {
        console.warn(`[VoiceSynthesis] Failed to cache phrase "${phrase}":`, error.message);
      }
    });

    await Promise.allSettled(cachePromises);
    console.log(`[VoiceSynthesis] Completed caching for ${voiceId}`);
  }

  // Play cached phrase if available, otherwise generate
  async speakCachedOrGenerate(text, voiceId) {
    const cacheKey = `${voiceId}:${text.toLowerCase()}`;

    if (this.audioQueue.has(cacheKey)) {
      console.log(`[VoiceSynthesis] Playing cached audio for: "${text}"`);
      const audioBlob = this.audioQueue.get(cacheKey);
      return this.playAudioBlob(audioBlob);
    }

    // Not cached, generate normally
    return this.speakTextFast(text, voiceId);
  }

  // Play audio blob directly
  async playAudioBlob(audioBlob) {
    this.stopCurrentAudio();

    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    this.currentAudio = audio;

    return new Promise((resolve) => {
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        this.currentAudio = null;
        resolve();
      };

      audio.onerror = (error) => {
        console.error('[VoiceSynthesis] Cached audio playback error:', error);
        URL.revokeObjectURL(audioUrl);
        this.currentAudio = null;
        resolve();
      };

      audio.play().catch(error => {
        console.error('[VoiceSynthesis] Failed to play cached audio:', error);
        URL.revokeObjectURL(audioUrl);
        this.currentAudio = null;
        resolve();
      });
    });
  }

  // Stop any currently playing audio
  stopCurrentAudio() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
  }

  // Browser fallback TTS
  async fallbackTTS(text) {
    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.2; // Slightly faster for live performance
      utterance.onend = resolve;
      utterance.onerror = resolve;
      speechSynthesis.speak(utterance);
    });
  }

  // Get available ElevenLabs voices (for configuration)
  async getAvailableVoices() {
    if (!ELEVENLABS_API_KEY) return [];

    try {
      const response = await axios.get(`${ELEVENLABS_API_URL}/voices`, {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY
        }
      });

      return response.data.voices || [];
    } catch (error) {
      console.error('[VoiceSynthesis] Failed to fetch voices:', error);
      return [];
    }
  }

  // Clear audio cache
  clearCache() {
    this.audioQueue.clear();
    console.log('[VoiceSynthesis] Audio cache cleared');
  }

  // Get cache statistics
  getCacheStats() {
    return {
      cachedPhrases: this.audioQueue.size,
      cacheKeys: Array.from(this.audioQueue.keys())
    };
  }
}

// Global voice synthesis service instance
const voiceSynthesisService = new VoiceSynthesisService();

// Export both the service and legacy function for backward compatibility
export { voiceSynthesisService };

export async function speakText(text, voiceId) {
  return voiceSynthesisService.speakTextFast(text, voiceId, 'speed');
}