import React, { useState, useEffect, useRef } from 'react';
import Timer from './Timer';
import { generateDialogue } from '../services/dialogueGenerator';
import { speakText } from '../services/voiceSynthesis';
import { decideSpeaker } from '../services/supervisorAgent';
import { SceneStateManager } from '../services/sceneStateManager';
import { supervisorMonitor } from '../services/supervisorMonitor';
import { persistentDB } from '../services/persistentDatabase';
import './ImprovStage.css';

function ImprovStage({ character1, character2, character3, character4, audienceWord, onReset }) {
  const [dialogue, setDialogue] = useState([]);
  const [currentSpeaker, setCurrentSpeaker] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [dialogueSettings, setDialogueSettings] = useState({
    sceneLength: 12,
    pauseBetweenLines: 1500
  });
  const [supervisorDecision, setSupervisorDecision] = useState(null);
  const intervalRef = useRef(null);
  const timeLeftRef = useRef(60);
  const isMountedRef = useRef(false);
  const sceneStateRef = useRef(null);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  useEffect(() => {
    // Load dialogue settings from persistent database
    const savedSettings = persistentDB.getDialogueSettings();
    if (Object.keys(savedSettings).length > 0) {
      setDialogueSettings(prev => ({ ...prev, ...savedSettings }));
    }
  }, []);

  useEffect(() => {
    // Prevent double mounting in StrictMode
    if (isMountedRef.current) return;
    isMountedRef.current = true;

    // Initialize scene state manager
    const allCharacters = [character1, character2, character3, character4];
    sceneStateRef.current = new SceneStateManager(allCharacters, audienceWord);

    // Load supervisor settings for monitoring
    const supervisorSettings = persistentDB.getSupervisorSettings();

    // Start supervisor monitoring session
    supervisorMonitor.startScene(allCharacters, audienceWord, supervisorSettings);

    const endScene = () => {
      setIsPlaying(false);
      setSupervisorDecision(null);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // End supervisor monitoring session
      supervisorMonitor.endScene();
    };

    const performDialogue = async () => {
      const sceneState = sceneStateRef.current;

      // Initial delay to let scene set up
      await new Promise(resolve => setTimeout(resolve, 1000));

      for (let i = 0; i < dialogueSettings.sceneLength; i++) {
        if (timeLeftRef.current <= 0) break;

        try {
          // Get supervisor decision for next speaker
          const currentState = sceneState.getCurrentState();

          // Log current scene state to monitor
          supervisorMonitor.logSceneState(currentState);

          const decision = await decideSpeaker(
            currentState,
            allCharacters,
            sceneState.dialogue.slice(-6) // Recent dialogue for context
          );

          setSupervisorDecision(decision);
          const speaker = decision.speaker;
          setCurrentSpeaker(speaker.name);

          // eslint-disable-next-line no-loop-func
          const otherCharacters = allCharacters.filter(char => char !== speaker);

          // Generate the line with supervisor context
          const line = await generateDialogue(
            speaker,
            otherCharacters,
            audienceWord,
            sceneState.dialogue,
            {
              reason: decision.reason,
              sceneNote: decision.sceneNote,
              sceneState: currentState
            }
          );

          // Add dialogue to scene state (this updates all tracking)
          const dialogueEntry = sceneState.addDialogue(speaker, line);

          // Update UI
          setDialogue(prev => [...prev, dialogueEntry]);

          // Speak the line and wait for it to finish
          await speakText(line, speaker.voiceId);

          // Brief pause between speakers (natural conversation pause)
          await new Promise(resolve => setTimeout(resolve, dialogueSettings.pauseBetweenLines));

        } catch (error) {
          console.error('Error in dialogue generation:', error);
          // Fallback to simple rotation on error
          const fallbackSpeaker = allCharacters[i % 4];
          const otherCharacters = allCharacters.filter(char => char !== fallbackSpeaker);

          const line = await generateDialogue(
            fallbackSpeaker,
            otherCharacters,
            audienceWord,
            sceneState.dialogue
          );

          const dialogueEntry = sceneState.addDialogue(fallbackSpeaker, line);
          setDialogue(prev => [...prev, dialogueEntry]);
          setCurrentSpeaker(fallbackSpeaker.name);

          await speakText(line, fallbackSpeaker.voiceId);
          await new Promise(resolve => setTimeout(resolve, dialogueSettings.pauseBetweenLines));
        }
      }

      endScene();
    };

    const startImprov = async () => {
      setIsPlaying(true);

      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 0) {
            endScene();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Await the dialogue to ensure it runs sequentially
      await performDialogue();
    };

    startImprov();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character1, character2, character3, character4, audienceWord]);

  return (
    <div className="improv-stage">
      <div className="stage-header">
        <h1>Live Improv Scene</h1>
        <div className="word-display">
          Inspired by: <span className="audience-word">"{audienceWord}"</span>
        </div>
        {supervisorDecision && (
          <div className="supervisor-note">
            <small>Director: {supervisorDecision.reason}</small>
            {supervisorDecision.sceneNote && (
              <small> • {supervisorDecision.sceneNote}</small>
            )}
          </div>
        )}
        <Timer timeLeft={timeLeft} />
      </div>

      <div className="stage-area">
        <div className="character-grid">
          <div className={`character-panel ${currentSpeaker === character1.name ? 'speaking' : ''}`}>
            <h2>{character1.name}</h2>
            <div className="character-image-placeholder">
              {character1.name}
            </div>
          </div>

          <div className={`character-panel ${currentSpeaker === character2.name ? 'speaking' : ''}`}>
            <h2>{character2.name}</h2>
            <div className="character-image-placeholder">
              {character2.name}
            </div>
          </div>

          <div className={`character-panel ${currentSpeaker === character3.name ? 'speaking' : ''}`}>
            <h2>{character3.name}</h2>
            <div className="character-image-placeholder">
              {character3.name}
            </div>
          </div>

          <div className={`character-panel ${currentSpeaker === character4.name ? 'speaking' : ''}`}>
            <h2>{character4.name}</h2>
            <div className="character-image-placeholder">
              {character4.name}
            </div>
          </div>
        </div>

        <div className="dialogue-area">
          {dialogue.map((line, index) => (
            <div key={index} className={`dialogue-line`}>
              <strong>{line.speaker}:</strong> {line.text}
            </div>
          ))}
          {dialogue.length === 0 && (
            <p className="waiting">Generating improv scene...</p>
          )}
        </div>
      </div>

      <div className="controls">
        {!isPlaying && (
          <button onClick={onReset} className="reset-button">
            New Scene
          </button>
        )}
      </div>
    </div>
  );
}

export default ImprovStage;