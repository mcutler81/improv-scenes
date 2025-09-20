import React, { useState, useEffect, useRef, useCallback } from 'react';
import Timer from './Timer';
import { generateDialogue } from '../services/dialogueGenerator';
import { voiceSynthesisService } from '../services/voiceSynthesis';
import { voiceInputService } from '../services/voiceInput';
import { decideSpeaker } from '../services/supervisorAgent';
import { SceneStateManager } from '../services/sceneStateManager';
import { supervisorMonitor } from '../services/supervisorMonitor';
import { persistentDB } from '../services/persistentDatabase';
import './LivePerformanceStage.css';

function LivePerformanceStage({ character1, character2, character3, character4, audienceWord, onReset }) {
  const [dialogue, setDialogue] = useState([]);
  const [currentSpeaker, setCurrentSpeaker] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes for live performance
  const [voiceStatus, setVoiceStatus] = useState('uninitialized');
  const [isListening, setIsListening] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [performanceMode, setPerformanceMode] = useState('ai-only'); // ai-only, mixed, human-led
  const [humanParticipants, setHumanParticipants] = useState([]);
  const [supervisorDecision, setSupervisorDecision] = useState(null);

  const [dialogueSettings, setDialogueSettings] = useState({
    sceneLength: 25, // Longer scenes for live performance
    pauseBetweenLines: 800, // Faster pacing
    enableVoiceInterruption: true,
    voiceSensitivity: 0.7
  });

  const intervalRef = useRef(null);
  const timeLeftRef = useRef(300);
  const isMountedRef = useRef(false);
  const sceneStateRef = useRef(null);
  const performanceControlsRef = useRef(null);

  // Voice input callbacks
  const handleVoiceStatusChange = useCallback((status) => {
    setVoiceStatus(status);
  }, []);

  const handleTranscriptUpdate = useCallback((transcript, isFinal) => {
    setCurrentTranscript(transcript);

    if (isFinal && transcript.trim()) {
      console.log('[LivePerformance] User said:', transcript);

      // Add user input to dialogue
      const userEntry = {
        speaker: 'You',
        text: transcript,
        timestamp: Date.now(),
        wordCount: transcript.split(' ').length,
        lineNumber: dialogue.length + 1
      };

      setDialogue(prev => [...prev, userEntry]);

      // Add to scene state if available
      if (sceneStateRef.current) {
        const humanSpeaker = { name: 'You', personality: 'Human performer', voiceId: null };
        sceneStateRef.current.addDialogue(humanSpeaker, transcript);
      }

      // Clear transcript after processing
      setCurrentTranscript('');
    }
  }, [dialogue]);

  const handleSpeechStart = useCallback(() => {
    console.log('[LivePerformance] User started speaking');

    // Optionally pause AI characters when human speaks
    if (dialogueSettings.enableVoiceInterruption && currentSpeaker) {
      voiceSynthesisService.stopCurrentAudio();
      setCurrentSpeaker(null);
    }
  }, [currentSpeaker, dialogueSettings.enableVoiceInterruption]);

  const handleSpeechEnd = useCallback((finalTranscript) => {
    console.log('[LivePerformance] User finished speaking:', finalTranscript);

    // Resume AI performance if needed
    if (performanceMode === 'mixed' && isPlaying) {
      // Give a brief pause before AI responds
      setTimeout(() => {
        continueAIPerformance();
      }, 1000);
    }
  }, [isPlaying, performanceMode]);

  const handleVoiceError = useCallback((error) => {
    console.error('[LivePerformance] Voice error:', error);
    setVoiceStatus('error');
  }, []);

  // Initialize voice services
  useEffect(() => {
    const initializeVoiceServices = async () => {
      // Initialize voice synthesis service
      await voiceSynthesisService.initialize();

      // Pre-cache common phrases for all characters
      const allCharacters = [character1, character2, character3, character4];
      for (const character of allCharacters) {
        if (character.voiceId) {
          await voiceSynthesisService.preGenerateCommonPhrases(
            character.voiceId,
            character.catchphrases
          );
        }
      }

      // Initialize voice input service
      const voiceInitialized = await voiceInputService.initialize();
      if (voiceInitialized) {
        // Set up voice input callbacks
        voiceInputService.onStatusChange(handleVoiceStatusChange);
        voiceInputService.onTranscriptUpdate(handleTranscriptUpdate);
        voiceInputService.onSpeechStart(handleSpeechStart);
        voiceInputService.onSpeechEnd(handleSpeechEnd);
        voiceInputService.onError(handleVoiceError);

        console.log('[LivePerformance] Voice services initialized');
      }
    };

    initializeVoiceServices();

    return () => {
      // Cleanup voice services
      voiceInputService.destroy();
      voiceSynthesisService.stopCurrentAudio();
    };
  }, [handleVoiceStatusChange, handleTranscriptUpdate, handleSpeechStart, handleSpeechEnd, handleVoiceError]);

  // Load dialogue settings
  useEffect(() => {
    const savedSettings = persistentDB.getDialogueSettings();
    if (Object.keys(savedSettings).length > 0) {
      setDialogueSettings(prev => ({ ...prev, ...savedSettings }));
    }
  }, []);

  // Main performance loop
  useEffect(() => {
    if (isMountedRef.current) return;
    isMountedRef.current = true;

    const allCharacters = [character1, character2, character3, character4];
    sceneStateRef.current = new SceneStateManager(allCharacters, audienceWord);

    const supervisorSettings = persistentDB.getSupervisorSettings();
    supervisorMonitor.startScene(allCharacters, audienceWord, supervisorSettings);

    const endScene = () => {
      setIsPlaying(false);
      setSupervisorDecision(null);
      setCurrentSpeaker(null);
      voiceInputService.stopListening();
      voiceSynthesisService.stopCurrentAudio();

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      supervisorMonitor.endScene();
    };

    const performAIDialogue = async () => {
      const sceneState = sceneStateRef.current;

      while (timeLeftRef.current > 0 && isPlaying) {
        if (performanceMode === 'human-led') {
          // Wait for human input in human-led mode
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        try {
          const currentState = sceneState.getCurrentState();
          supervisorMonitor.logSceneState(currentState);

          const decision = await decideSpeaker(
            currentState,
            allCharacters,
            sceneState.dialogue.slice(-6)
          );

          setSupervisorDecision(decision);
          const speaker = decision.speaker;
          setCurrentSpeaker(speaker.name);

          const otherCharacters = allCharacters.filter(char => char !== speaker);

          // Generate dialogue with live performance optimizations
          const line = await generateDialogue(
            speaker,
            otherCharacters,
            audienceWord,
            sceneState.dialogue,
            {
              reason: decision.reason,
              sceneNote: decision.sceneNote,
              sceneState: currentState,
              livePerformance: true
            }
          );

          const dialogueEntry = sceneState.addDialogue(speaker, line);
          setDialogue(prev => [...prev, dialogueEntry]);

          // Use low-latency speech synthesis
          if (speaker.voiceId) {
            await voiceSynthesisService.speakCachedOrGenerate(line, speaker.voiceId);
          } else {
            await voiceSynthesisService.fallbackTTS(line);
          }

          // Brief pause between lines (faster for live performance)
          await new Promise(resolve => setTimeout(resolve, dialogueSettings.pauseBetweenLines));

          // Check if human wants to interrupt
          if (performanceMode === 'mixed' && voiceInputService.isCurrentlyListening()) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }

        } catch (error) {
          console.error('[LivePerformance] Error in AI dialogue:', error);

          // Fallback to simple rotation
          const fallbackSpeaker = allCharacters[Math.floor(Math.random() * allCharacters.length)];
          const fallbackLine = `${fallbackSpeaker.catchphrases[0]} ...about ${audienceWord}!`;

          const dialogueEntry = sceneState.addDialogue(fallbackSpeaker, fallbackLine);
          setDialogue(prev => [...prev, dialogueEntry]);
          setCurrentSpeaker(fallbackSpeaker.name);

          await voiceSynthesisService.speakTextFast(fallbackLine, fallbackSpeaker.voiceId);
          await new Promise(resolve => setTimeout(resolve, dialogueSettings.pauseBetweenLines));
        }
      }

      endScene();
    };

    const startLivePerformance = async () => {
      console.log('[LivePerformance] Starting live performance mode');
      setIsPlaying(true);

      // Start voice listening if in mixed or human-led mode
      if (performanceMode === 'mixed' || performanceMode === 'human-led') {
        await voiceInputService.startListening();
        setIsListening(true);
      }

      // Start timer
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          timeLeftRef.current = prev - 1;
          if (prev <= 0) {
            endScene();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Start AI performance loop
      await performAIDialogue();
    };

    startLivePerformance();

    return () => {
      endScene();
    };
  }, [character1, character2, character3, character4, audienceWord, performanceMode, isPlaying, dialogueSettings]);

  // Continue AI performance after human input
  const continueAIPerformance = async () => {
    if (!isPlaying || performanceMode === 'human-led') return;

    try {
      const sceneState = sceneStateRef.current;
      const allCharacters = [character1, character2, character3, character4];
      const currentState = sceneState.getCurrentState();

      const decision = await decideSpeaker(
        currentState,
        allCharacters,
        sceneState.dialogue.slice(-6)
      );

      setSupervisorDecision(decision);
      const speaker = decision.speaker;
      setCurrentSpeaker(speaker.name);

      const otherCharacters = allCharacters.filter(char => char !== speaker);

      const line = await generateDialogue(
        speaker,
        otherCharacters,
        audienceWord,
        sceneState.dialogue,
        {
          reason: decision.reason,
          sceneNote: decision.sceneNote,
          sceneState: currentState,
          livePerformance: true,
          respondingToHuman: true
        }
      );

      const dialogueEntry = sceneState.addDialogue(speaker, line);
      setDialogue(prev => [...prev, dialogueEntry]);

      if (speaker.voiceId) {
        await voiceSynthesisService.speakCachedOrGenerate(line, speaker.voiceId);
      } else {
        await voiceSynthesisService.fallbackTTS(line);
      }

    } catch (error) {
      console.error('[LivePerformance] Error continuing AI performance:', error);
    }
  };

  // Toggle voice listening
  const toggleVoiceListening = async () => {
    if (isListening) {
      voiceInputService.stopListening();
      setIsListening(false);
    } else {
      const success = await voiceInputService.startListening();
      setIsListening(success);
    }
  };

  // Change performance mode
  const changePerformanceMode = (mode) => {
    setPerformanceMode(mode);

    if (mode === 'ai-only') {
      voiceInputService.stopListening();
      setIsListening(false);
    } else if (mode === 'mixed' || mode === 'human-led') {
      if (!isListening) {
        voiceInputService.startListening();
        setIsListening(true);
      }
    }
  };

  // Emergency stop
  const emergencyStop = () => {
    voiceSynthesisService.stopCurrentAudio();
    voiceInputService.stopListening();
    setIsPlaying(false);
    setCurrentSpeaker(null);
    setIsListening(false);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  return (
    <div className="live-performance-stage">
      <div className="performance-header">
        <h1>🎭 Live Improv Performance</h1>
        <div className="word-display">
          Suggestion: <span className="audience-word">"{audienceWord}"</span>
        </div>
        <Timer timeLeft={timeLeft} />
      </div>

      <div className="performance-controls">
        <div className="mode-selector">
          <label>Performance Mode:</label>
          <select
            value={performanceMode}
            onChange={(e) => changePerformanceMode(e.target.value)}
            disabled={isPlaying}
          >
            <option value="ai-only">AI Only</option>
            <option value="mixed">Mixed (AI + Human)</option>
            <option value="human-led">Human Led</option>
          </select>
        </div>

        <div className="voice-controls">
          <button
            onClick={toggleVoiceListening}
            className={`voice-button ${isListening ? 'listening' : ''}`}
            disabled={performanceMode === 'ai-only'}
          >
            {isListening ? '🎤 Stop Listening' : '🎤 Start Listening'}
          </button>

          <div className="voice-status">
            Status: <span className={`status-${voiceStatus}`}>{voiceStatus}</span>
          </div>
        </div>

        <button onClick={emergencyStop} className="emergency-stop">
          🛑 Emergency Stop
        </button>
      </div>

      {currentTranscript && (
        <div className="current-transcript">
          <strong>You're saying:</strong> "{currentTranscript}"
        </div>
      )}

      {supervisorDecision && (
        <div className="director-note">
          <small>🎬 Director: {supervisorDecision.reason}</small>
          {supervisorDecision.sceneNote && (
            <small> • {supervisorDecision.sceneNote}</small>
          )}
        </div>
      )}

      <div className="stage-area">
        <div className="character-grid">
          {[character1, character2, character3, character4].map((character, index) => (
            <div
              key={character.id}
              className={`character-panel ${currentSpeaker === character.name ? 'speaking' : ''}`}
            >
              <h3>{character.name}</h3>
              <div className="character-image-placeholder">
                {character.name}
              </div>
              {currentSpeaker === character.name && (
                <div className="speaking-indicator">🗣️</div>
              )}
            </div>
          ))}

          {(performanceMode === 'mixed' || performanceMode === 'human-led') && (
            <div className={`character-panel human-panel ${currentSpeaker === 'You' ? 'speaking' : ''}`}>
              <h3>You</h3>
              <div className="character-image-placeholder">
                🎭 Human
              </div>
              {isListening && (
                <div className="listening-indicator">👂</div>
              )}
            </div>
          )}
        </div>

        <div className="dialogue-area">
          {dialogue.map((line, index) => (
            <div key={index} className={`dialogue-line ${line.speaker === 'You' ? 'human-line' : ''}`}>
              <strong>{line.speaker}:</strong> {line.text}
            </div>
          ))}
          {dialogue.length === 0 && (
            <p className="waiting">
              {performanceMode === 'human-led'
                ? 'Waiting for you to start the scene...'
                : 'Starting live improv scene...'
              }
            </p>
          )}
        </div>
      </div>

      <div className="live-controls">
        {!isPlaying && (
          <button onClick={onReset} className="reset-button">
            🔄 New Scene
          </button>
        )}

        <div className="performance-stats">
          <small>
            Lines: {dialogue.length} •
            Mode: {performanceMode} •
            Voice: {voiceStatus}
          </small>
        </div>
      </div>
    </div>
  );
}

export default LivePerformanceStage;