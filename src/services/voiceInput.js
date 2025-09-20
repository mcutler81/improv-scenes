class VoiceInputService {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.isInitialized = false;
    this.currentTranscript = '';
    this.finalTranscript = '';

    // Voice input settings optimized for live performance
    this.settings = {
      language: 'en-US',
      continuous: true,
      interimResults: true,
      maxAlternatives: 1,
      confidenceThreshold: 0.7,
      silenceTimeout: 2000, // ms before considering speech finished
      voiceActivityTimeout: 500, // ms of silence to trigger processing
    };

    // Callbacks for different events
    this.callbacks = {
      onTranscriptUpdate: null,
      onSpeechStart: null,
      onSpeechEnd: null,
      onFinalTranscript: null,
      onError: null,
      onStatusChange: null
    };

    this.silenceTimer = null;
    this.speechStartTime = null;
    this.lastSpeechTime = null;
  }

  // Initialize the speech recognition service
  async initialize() {
    try {
      // Check if Web Speech API is supported
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        throw new Error('Web Speech API is not supported in this browser');
      }

      // Create speech recognition instance
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();

      // Configure recognition settings for live performance
      this.recognition.continuous = this.settings.continuous;
      this.recognition.interimResults = this.settings.interimResults;
      this.recognition.lang = this.settings.language;
      this.recognition.maxAlternatives = this.settings.maxAlternatives;

      // Set up event handlers
      this.setupEventHandlers();

      // Request microphone permissions
      await this.requestMicrophonePermission();

      this.isInitialized = true;
      this.notifyStatusChange('initialized');

      console.log('[VoiceInput] Initialized successfully');
      return true;
    } catch (error) {
      console.error('[VoiceInput] Initialization failed:', error);
      this.notifyError(error);
      return false;
    }
  }

  // Request microphone permissions
  async requestMicrophonePermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Close the stream immediately as we just needed permission
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      throw new Error('Microphone access denied. Please grant microphone permissions for voice input.');
    }
  }

  // Set up all event handlers for speech recognition
  setupEventHandlers() {
    this.recognition.onstart = () => {
      console.log('[VoiceInput] Speech recognition started');
      this.isListening = true;
      this.speechStartTime = Date.now();
      this.notifyStatusChange('listening');
    };

    this.recognition.onend = () => {
      console.log('[VoiceInput] Speech recognition ended');
      this.isListening = false;
      this.notifyStatusChange('stopped');
    };

    this.recognition.onerror = (event) => {
      console.error('[VoiceInput] Speech recognition error:', event.error);
      this.isListening = false;
      this.notifyError(new Error(`Speech recognition error: ${event.error}`));
      this.notifyStatusChange('error');
    };

    this.recognition.onspeechstart = () => {
      console.log('[VoiceInput] Speech detected');
      this.clearSilenceTimer();
      this.lastSpeechTime = Date.now();
      this.notifySpeechStart();
    };

    this.recognition.onspeechend = () => {
      console.log('[VoiceInput] Speech ended');
      this.startSilenceTimer();
    };

    this.recognition.onresult = (event) => {
      this.processResults(event);
    };

    this.recognition.onnomatch = () => {
      console.log('[VoiceInput] No speech match found');
    };

    this.recognition.onaudiostart = () => {
      console.log('[VoiceInput] Audio capture started');
    };

    this.recognition.onaudioend = () => {
      console.log('[VoiceInput] Audio capture ended');
    };
  }

  // Process speech recognition results
  processResults(event) {
    let interimTranscript = '';
    let finalTranscript = '';

    // Process all results
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0].transcript;
      const confidence = result[0].confidence;

      if (result.isFinal) {
        // Only accept results above confidence threshold
        if (confidence >= this.settings.confidenceThreshold) {
          finalTranscript += transcript;
        }
      } else {
        interimTranscript += transcript;
      }
    }

    // Update current transcript
    this.currentTranscript = interimTranscript;
    this.notifyTranscriptUpdate(interimTranscript, false);

    // Handle final transcript
    if (finalTranscript) {
      this.finalTranscript += finalTranscript;
      console.log('[VoiceInput] Final transcript:', finalTranscript);
      this.notifyTranscriptUpdate(finalTranscript, true);
      this.notifyFinalTranscript(finalTranscript.trim());
    }
  }

  // Start listening for voice input
  async startListening() {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) return false;
    }

    if (this.isListening) {
      console.log('[VoiceInput] Already listening');
      return true;
    }

    try {
      this.currentTranscript = '';
      this.finalTranscript = '';
      this.recognition.start();
      return true;
    } catch (error) {
      console.error('[VoiceInput] Failed to start listening:', error);
      this.notifyError(error);
      return false;
    }
  }

  // Stop listening for voice input
  stopListening() {
    if (!this.isListening) {
      console.log('[VoiceInput] Not currently listening');
      return;
    }

    try {
      this.recognition.stop();
      this.clearSilenceTimer();
    } catch (error) {
      console.error('[VoiceInput] Failed to stop listening:', error);
      this.notifyError(error);
    }
  }

  // Toggle listening state
  async toggleListening() {
    if (this.isListening) {
      this.stopListening();
      return false;
    } else {
      return await this.startListening();
    }
  }

  // Start silence timer to detect end of speech
  startSilenceTimer() {
    this.clearSilenceTimer();
    this.silenceTimer = setTimeout(() => {
      if (this.finalTranscript.trim()) {
        console.log('[VoiceInput] Silence timeout - processing final transcript');
        this.notifySpeechEnd(this.finalTranscript.trim());
        this.finalTranscript = '';
      }
    }, this.settings.voiceActivityTimeout);
  }

  // Clear silence timer
  clearSilenceTimer() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  // Get current listening status
  getStatus() {
    if (!this.isInitialized) return 'uninitialized';
    if (this.isListening) return 'listening';
    return 'ready';
  }

  // Check if currently listening
  isCurrentlyListening() {
    return this.isListening;
  }

  // Get current transcript (interim)
  getCurrentTranscript() {
    return this.currentTranscript;
  }

  // Update settings
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };

    // Apply language setting if recognition is available
    if (this.recognition && newSettings.language) {
      this.recognition.lang = newSettings.language;
    }
  }

  // Set callback for transcript updates
  onTranscriptUpdate(callback) {
    this.callbacks.onTranscriptUpdate = callback;
  }

  // Set callback for speech start
  onSpeechStart(callback) {
    this.callbacks.onSpeechStart = callback;
  }

  // Set callback for speech end
  onSpeechEnd(callback) {
    this.callbacks.onSpeechEnd = callback;
  }

  // Set callback for final transcript
  onFinalTranscript(callback) {
    this.callbacks.onFinalTranscript = callback;
  }

  // Set callback for errors
  onError(callback) {
    this.callbacks.onError = callback;
  }

  // Set callback for status changes
  onStatusChange(callback) {
    this.callbacks.onStatusChange = callback;
  }

  // Notify transcript update
  notifyTranscriptUpdate(transcript, isFinal) {
    if (this.callbacks.onTranscriptUpdate) {
      this.callbacks.onTranscriptUpdate(transcript, isFinal);
    }
  }

  // Notify speech start
  notifySpeechStart() {
    if (this.callbacks.onSpeechStart) {
      this.callbacks.onSpeechStart();
    }
  }

  // Notify speech end
  notifySpeechEnd(finalTranscript) {
    if (this.callbacks.onSpeechEnd) {
      this.callbacks.onSpeechEnd(finalTranscript);
    }
  }

  // Notify final transcript
  notifyFinalTranscript(transcript) {
    if (this.callbacks.onFinalTranscript) {
      this.callbacks.onFinalTranscript(transcript);
    }
  }

  // Notify error
  notifyError(error) {
    if (this.callbacks.onError) {
      this.callbacks.onError(error);
    }
  }

  // Notify status change
  notifyStatusChange(status) {
    if (this.callbacks.onStatusChange) {
      this.callbacks.onStatusChange(status);
    }
  }

  // Clean up resources
  destroy() {
    this.stopListening();
    this.clearSilenceTimer();

    if (this.recognition) {
      this.recognition.onstart = null;
      this.recognition.onend = null;
      this.recognition.onerror = null;
      this.recognition.onspeechstart = null;
      this.recognition.onspeechend = null;
      this.recognition.onresult = null;
      this.recognition.onnomatch = null;
      this.recognition.onaudiostart = null;
      this.recognition.onaudioend = null;
      this.recognition = null;
    }

    this.callbacks = {
      onTranscriptUpdate: null,
      onSpeechStart: null,
      onSpeechEnd: null,
      onFinalTranscript: null,
      onError: null,
      onStatusChange: null
    };

    this.isInitialized = false;
    console.log('[VoiceInput] Service destroyed');
  }
}

// Global voice input service instance
export const voiceInputService = new VoiceInputService();