import React from 'react';
import { characters } from '../data/characters';
import './CharacterSelect.css';

function CharacterSelect({
  character1,
  character2,
  setCharacter1,
  setCharacter2,
  audienceWord,
  setAudienceWord,
  onStart
}) {
  return (
    <div className="character-select">
      <h1 className="title">AI Improv Theater</h1>

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

        <div className="vs">VS</div>

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
            {characters.filter(char => char.id !== character1?.id).map(char => (
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
        disabled={!character1 || !character2 || !audienceWord}
        className="start-button"
      >
        Start the Scene!
      </button>
    </div>
  );
}

export default CharacterSelect;