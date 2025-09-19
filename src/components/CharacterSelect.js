import React, { useState, useEffect } from 'react';
import { characters as defaultCharacters } from '../data/characters';
import './CharacterSelect.css';

function CharacterSelect({
  character1,
  character2,
  character3,
  character4,
  setCharacter1,
  setCharacter2,
  setCharacter3,
  setCharacter4,
  audienceWord,
  setAudienceWord,
  onStart,
  onSettings
}) {
  const [characters, setCharacters] = useState(defaultCharacters);

  useEffect(() => {
    // Load characters from localStorage if available
    const savedCharacters = localStorage.getItem('improv-characters');
    if (savedCharacters) {
      setCharacters(JSON.parse(savedCharacters));
    }
  }, []);
  return (
    <div className="character-select">
      <div className="header-section">
        <h1 className="title">AI Improv Theater</h1>
        <button onClick={onSettings} className="settings-button">
          ⚙️ Settings
        </button>
      </div>

      <div className="character-selectors">
        <div className="selector">
          <h2>Character 1</h2>
          <select
            value={character1 || ''}
            onChange={(e) => {
              const char = characters.find(c => c.id === e.target.value);
              setCharacter1(char);
            }}
            className="character-dropdown"
          >
            <option value="">Choose a character...</option>
            {characters.map(char => (
              <option key={char.id} value={char.id}>
                {char.name}
              </option>
            ))}
          </select>
          {character1 && (
            <div className="character-preview">
              <p className="catchphrase">"{character1.catchphrases[0]}"</p>
            </div>
          )}
        </div>

        <div className="selector">
          <h2>Character 2</h2>
          <select
            value={character2 || ''}
            onChange={(e) => {
              const char = characters.find(c => c.id === e.target.value);
              setCharacter2(char);
            }}
            className="character-dropdown"
          >
            <option value="">Choose a character...</option>
            {characters.filter(char =>
              char.id !== character1?.id &&
              char.id !== character3?.id &&
              char.id !== character4?.id
            ).map(char => (
              <option key={char.id} value={char.id}>
                {char.name}
              </option>
            ))}
          </select>
          {character2 && (
            <div className="character-preview">
              <p className="catchphrase">"{character2.catchphrases[0]}"</p>
            </div>
          )}
        </div>

        <div className="selector">
          <h2>Character 3</h2>
          <select
            value={character3 || ''}
            onChange={(e) => {
              const char = characters.find(c => c.id === e.target.value);
              setCharacter3(char);
            }}
            className="character-dropdown"
          >
            <option value="">Choose a character...</option>
            {characters.filter(char =>
              char.id !== character1?.id &&
              char.id !== character2?.id &&
              char.id !== character4?.id
            ).map(char => (
              <option key={char.id} value={char.id}>
                {char.name}
              </option>
            ))}
          </select>
          {character3 && (
            <div className="character-preview">
              <p className="catchphrase">"{character3.catchphrases[0]}"</p>
            </div>
          )}
        </div>

        <div className="selector">
          <h2>Character 4</h2>
          <select
            value={character4 || ''}
            onChange={(e) => {
              const char = characters.find(c => c.id === e.target.value);
              setCharacter4(char);
            }}
            className="character-dropdown"
          >
            <option value="">Choose a character...</option>
            {characters.filter(char =>
              char.id !== character1?.id &&
              char.id !== character2?.id &&
              char.id !== character3?.id
            ).map(char => (
              <option key={char.id} value={char.id}>
                {char.name}
              </option>
            ))}
          </select>
          {character4 && (
            <div className="character-preview">
              <p className="catchphrase">"{character4.catchphrases[0]}"</p>
            </div>
          )}
        </div>
      </div>

      <div className="audience-input">
        <h2>Audience Suggestion</h2>
        <input
          type="text"
          placeholder="Enter a word to inspire the scene..."
          value={audienceWord}
          onChange={(e) => setAudienceWord(e.target.value)}
          className="word-input"
        />
      </div>

      <button
        onClick={onStart}
        disabled={!character1 || !character2 || !character3 || !character4 || !audienceWord}
        className="start-button"
      >
        Start the Scene!
      </button>
    </div>
  );
}

export default CharacterSelect;