import React, { useState, useEffect, useRef } from 'react';
import Timer from './Timer';
import { generateDialogue } from '../services/dialogueGenerator';
import { speakText } from '../services/voiceSynthesis';
import './ImprovStage.css';

function ImprovStage({ character1, character2, character3, character4, audienceWord, onReset }) {
  const [dialogue, setDialogue] = useState([]);
  const [currentSpeaker, setCurrentSpeaker] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const intervalRef = useRef(null);
  const timeLeftRef = useRef(60);
  const isMountedRef = useRef(false);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  useEffect(() => {
    // Prevent double mounting in StrictMode
    if (isMountedRef.current) return;
    isMountedRef.current = true;
    const endScene = () => {
      setIsPlaying(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };

    const performDialogue = async () => {
      let totalDialogue = [];
      const allCharacters = [character1, character2, character3, character4];
      let speaker = allCharacters[Math.floor(Math.random() * 4)];

      // Initial delay to let scene set up
      await new Promise(resolve => setTimeout(resolve, 1000));

      for (let i = 0; i < 12; i++) {
        if (timeLeftRef.current <= 0) break;

        // eslint-disable-next-line no-loop-func
        const otherCharacters = allCharacters.filter(char => char !== speaker);

        // Generate the line
        const line = await generateDialogue(
          speaker,
          otherCharacters,
          audienceWord,
          totalDialogue
        );

        const dialogueEntry = {
          speaker: speaker.name,
          text: line,
          timestamp: Date.now()
        };

        // Add to dialogue history
        totalDialogue.push(dialogueEntry);
        setDialogue(prev => [...prev, dialogueEntry]);
        setCurrentSpeaker(speaker.name);

        // Speak the line and wait for it to finish
        await speakText(line, speaker.voiceId);

        // Brief pause between speakers (natural conversation pause)
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Switch to next speaker (rotate through all characters)
        const currentIndex = allCharacters.indexOf(speaker);
        speaker = allCharacters[(currentIndex + 1) % 4];
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