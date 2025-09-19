import React, { useState, useEffect } from 'react';
import { characters as defaultCharacters } from '../data/characters';
import './Settings.css';

function Settings({ onBack }) {
  const [characters, setCharacters] = useState([]);
  const [dialogueSettings, setDialogueSettings] = useState({
    maxTokens: 50,
    temperature: 0.9,
    sceneLength: 12,
    pauseBetweenLines: 1500
  });
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [activeTab, setActiveTab] = useState('characters');

  useEffect(() => {
    // Load settings from localStorage or use defaults
    const savedCharacters = localStorage.getItem('improv-characters');
    const savedDialogueSettings = localStorage.getItem('improv-dialogue-settings');

    if (savedCharacters) {
      setCharacters(JSON.parse(savedCharacters));
    } else {
      setCharacters(defaultCharacters);
    }

    if (savedDialogueSettings) {
      setDialogueSettings(JSON.parse(savedDialogueSettings));
    }
  }, []);

  const saveCharacters = (newCharacters) => {
    setCharacters(newCharacters);
    localStorage.setItem('improv-characters', JSON.stringify(newCharacters));
  };

  const saveDialogueSettings = (newSettings) => {
    setDialogueSettings(newSettings);
    localStorage.setItem('improv-dialogue-settings', JSON.stringify(newSettings));
  };

  const updateCharacter = (updatedCharacter) => {
    const newCharacters = characters.map(char =>
      char.id === updatedCharacter.id ? updatedCharacter : char
    );
    saveCharacters(newCharacters);
    setSelectedCharacter(updatedCharacter);
  };

  const addNewCharacter = () => {
    const newId = `custom-${Date.now()}`;
    const newCharacter = {
      id: newId,
      name: 'New Character',
      image: '/images/placeholder.jpg',
      catchphrases: ['Hello there!', 'How are you?', 'Nice to meet you!'],
      voiceId: 'default-voice-id',
      personality: 'Friendly, welcoming, positive'
    };
    const newCharacters = [...characters, newCharacter];
    saveCharacters(newCharacters);
    setSelectedCharacter(newCharacter);
  };

  const deleteCharacter = (characterId) => {
    if (characters.length <= 4) {
      alert('Cannot delete character - minimum of 4 characters required');
      return;
    }
    const newCharacters = characters.filter(char => char.id !== characterId);
    saveCharacters(newCharacters);
    if (selectedCharacter?.id === characterId) {
      setSelectedCharacter(null);
    }
  };

  const resetToDefaults = () => {
    if (window.confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
      saveCharacters(defaultCharacters);
      saveDialogueSettings({
        maxTokens: 50,
        temperature: 0.9,
        sceneLength: 12,
        pauseBetweenLines: 1500
      });
      setSelectedCharacter(null);
    }
  };

  return (
    <div className="settings">
      <div className="settings-header">
        <h1>Settings</h1>
        <button onClick={onBack} className="back-button">← Back to Game</button>
      </div>

      <div className="settings-tabs">
        <button
          className={`tab ${activeTab === 'characters' ? 'active' : ''}`}
          onClick={() => setActiveTab('characters')}
        >
          Characters
        </button>
        <button
          className={`tab ${activeTab === 'dialogue' ? 'active' : ''}`}
          onClick={() => setActiveTab('dialogue')}
        >
          Dialogue Settings
        </button>
      </div>

      {activeTab === 'characters' && (
        <div className="characters-section">
          <div className="characters-list">
            <div className="section-header">
              <h2>Characters ({characters.length})</h2>
              <div className="character-actions">
                <button onClick={addNewCharacter} className="add-button">
                  + Add Character
                </button>
                <button onClick={resetToDefaults} className="reset-button">
                  Reset All
                </button>
              </div>
            </div>

            <div className="character-grid">
              {characters.map(character => (
                <div
                  key={character.id}
                  className={`character-card ${selectedCharacter?.id === character.id ? 'selected' : ''}`}
                  onClick={() => setSelectedCharacter(character)}
                >
                  <h3>{character.name}</h3>
                  <p className="character-personality">{character.personality}</p>
                  <p className="catchphrase-preview">"{character.catchphrases[0]}"</p>
                  {characters.length > 4 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteCharacter(character.id);
                      }}
                      className="delete-button"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {selectedCharacter && (
            <div className="character-editor">
              <h3>Edit Character: {selectedCharacter.name}</h3>
              <CharacterEditor
                character={selectedCharacter}
                onUpdate={updateCharacter}
              />
            </div>
          )}
        </div>
      )}

      {activeTab === 'dialogue' && (
        <div className="dialogue-section">
          <h2>Dialogue Generation Settings</h2>
          <DialogueEditor
            settings={dialogueSettings}
            onUpdate={saveDialogueSettings}
          />
        </div>
      )}
    </div>
  );
}

function CharacterEditor({ character, onUpdate }) {
  const [editedCharacter, setEditedCharacter] = useState({ ...character });

  const handleChange = (field, value) => {
    setEditedCharacter(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCatchphraseChange = (index, value) => {
    const newCatchphrases = [...editedCharacter.catchphrases];
    newCatchphrases[index] = value;
    setEditedCharacter(prev => ({
      ...prev,
      catchphrases: newCatchphrases
    }));
  };

  const addCatchphrase = () => {
    setEditedCharacter(prev => ({
      ...prev,
      catchphrases: [...prev.catchphrases, 'New catchphrase']
    }));
  };

  const removeCatchphrase = (index) => {
    if (editedCharacter.catchphrases.length <= 1) return;
    const newCatchphrases = editedCharacter.catchphrases.filter((_, i) => i !== index);
    setEditedCharacter(prev => ({
      ...prev,
      catchphrases: newCatchphrases
    }));
  };

  const handleSave = () => {
    onUpdate(editedCharacter);
    alert('Character updated successfully!');
  };

  return (
    <div className="character-form">
      <div className="form-group">
        <label>Name:</label>
        <input
          type="text"
          value={editedCharacter.name}
          onChange={(e) => handleChange('name', e.target.value)}
        />
      </div>

      <div className="form-group">
        <label>Personality:</label>
        <textarea
          value={editedCharacter.personality}
          onChange={(e) => handleChange('personality', e.target.value)}
          rows="3"
        />
      </div>

      <div className="form-group">
        <label>Voice ID (ElevenLabs):</label>
        <input
          type="text"
          value={editedCharacter.voiceId}
          onChange={(e) => handleChange('voiceId', e.target.value)}
        />
      </div>

      <div className="form-group">
        <label>Catchphrases:</label>
        {editedCharacter.catchphrases.map((phrase, index) => (
          <div key={index} className="catchphrase-input">
            <input
              type="text"
              value={phrase}
              onChange={(e) => handleCatchphraseChange(index, e.target.value)}
            />
            {editedCharacter.catchphrases.length > 1 && (
              <button
                type="button"
                onClick={() => removeCatchphrase(index)}
                className="remove-phrase-button"
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={addCatchphrase} className="add-phrase-button">
          + Add Catchphrase
        </button>
      </div>

      <button onClick={handleSave} className="save-button">
        Save Character
      </button>
    </div>
  );
}

function DialogueEditor({ settings, onUpdate }) {
  const [editedSettings, setEditedSettings] = useState({ ...settings });

  const handleChange = (field, value) => {
    setEditedSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    onUpdate(editedSettings);
    alert('Dialogue settings updated successfully!');
  };

  return (
    <div className="dialogue-form">
      <div className="form-group">
        <label>Max Tokens per Response:</label>
        <input
          type="number"
          min="10"
          max="200"
          value={editedSettings.maxTokens}
          onChange={(e) => handleChange('maxTokens', parseInt(e.target.value))}
        />
        <small>Controls how long each character's response can be (10-200)</small>
      </div>

      <div className="form-group">
        <label>Creativity (Temperature):</label>
        <input
          type="number"
          min="0.1"
          max="2.0"
          step="0.1"
          value={editedSettings.temperature}
          onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
        />
        <small>Higher values = more creative/unpredictable responses (0.1-2.0)</small>
      </div>

      <div className="form-group">
        <label>Scene Length (Number of Lines):</label>
        <input
          type="number"
          min="4"
          max="24"
          value={editedSettings.sceneLength}
          onChange={(e) => handleChange('sceneLength', parseInt(e.target.value))}
        />
        <small>Total number of dialogue lines in a scene (4-24)</small>
      </div>

      <div className="form-group">
        <label>Pause Between Lines (ms):</label>
        <input
          type="number"
          min="500"
          max="5000"
          step="100"
          value={editedSettings.pauseBetweenLines}
          onChange={(e) => handleChange('pauseBetweenLines', parseInt(e.target.value))}
        />
        <small>Time between character lines in milliseconds (500-5000)</small>
      </div>

      <button onClick={handleSave} className="save-button">
        Save Dialogue Settings
      </button>
    </div>
  );
}

export default Settings;