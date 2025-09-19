import React, { useState, useEffect } from 'react';
import { characters as defaultCharacters } from '../data/characters';
import { defaultPromptTemplates } from '../services/dialogueGenerator';
import { defaultSupervisorSettings } from '../services/supervisorAgent';
import './Settings.css';

function Settings({ onBack }) {
  const [characters, setCharacters] = useState([]);
  const [dialogueSettings, setDialogueSettings] = useState({
    maxTokens: 50,
    temperature: 0.9,
    sceneLength: 12,
    pauseBetweenLines: 1500
  });
  const [promptTemplates, setPromptTemplates] = useState(defaultPromptTemplates);
  const [supervisorSettings, setSupervisorSettings] = useState(defaultSupervisorSettings);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [activeTab, setActiveTab] = useState('characters');

  useEffect(() => {
    // Load settings from localStorage or use defaults
    const savedCharacters = localStorage.getItem('improv-characters');
    const savedDialogueSettings = localStorage.getItem('improv-dialogue-settings');
    const savedPromptTemplates = localStorage.getItem('improv-prompt-templates');
    const savedSupervisorSettings = localStorage.getItem('improv-supervisor-settings');

    if (savedCharacters) {
      setCharacters(JSON.parse(savedCharacters));
    } else {
      setCharacters(defaultCharacters);
    }

    if (savedDialogueSettings) {
      setDialogueSettings(JSON.parse(savedDialogueSettings));
    }

    if (savedPromptTemplates) {
      setPromptTemplates({ ...defaultPromptTemplates, ...JSON.parse(savedPromptTemplates) });
    }

    if (savedSupervisorSettings) {
      setSupervisorSettings({ ...defaultSupervisorSettings, ...JSON.parse(savedSupervisorSettings) });
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

  const savePromptTemplates = (newTemplates) => {
    setPromptTemplates(newTemplates);
    localStorage.setItem('improv-prompt-templates', JSON.stringify(newTemplates));
  };

  const saveSupervisorSettings = (newSettings) => {
    setSupervisorSettings(newSettings);
    localStorage.setItem('improv-supervisor-settings', JSON.stringify(newSettings));
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
      savePromptTemplates(defaultPromptTemplates);
      saveSupervisorSettings(defaultSupervisorSettings);
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
        <button
          className={`tab ${activeTab === 'prompts' ? 'active' : ''}`}
          onClick={() => setActiveTab('prompts')}
        >
          Prompt Templates
        </button>
        <button
          className={`tab ${activeTab === 'supervisor' ? 'active' : ''}`}
          onClick={() => setActiveTab('supervisor')}
        >
          Supervisor
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

      {activeTab === 'prompts' && (
        <div className="prompts-section">
          <h2>Prompt Templates</h2>
          <PromptTemplateEditor
            templates={promptTemplates}
            onUpdate={savePromptTemplates}
          />
        </div>
      )}

      {activeTab === 'supervisor' && (
        <div className="supervisor-section">
          <h2>Supervisor Agent Settings</h2>
          <SupervisorEditor
            settings={supervisorSettings}
            onUpdate={saveSupervisorSettings}
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

function PromptTemplateEditor({ templates, onUpdate }) {
  const [editedTemplates, setEditedTemplates] = useState({ ...templates });

  const handleChange = (field, value) => {
    setEditedTemplates(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    onUpdate(editedTemplates);
    alert('Prompt templates updated successfully!');
  };

  const resetToDefaults = () => {
    if (window.confirm('Reset all prompt templates to defaults? This cannot be undone.')) {
      setEditedTemplates({ ...defaultPromptTemplates });
    }
  };

  const templateDescriptions = {
    firstLineInstructions: "Instructions for the first line of a scene (scene establishment)",
    secondLineInstructions: "Instructions for the second line of a scene (building on setup)",
    continuationInstructions: "Instructions for continuing lines in a scene",
    mainPromptTemplate: "Main prompt template that combines all elements",
    systemPromptTemplate: "System prompt that sets up the AI's role",
    maxWords: "Maximum words per response",
    sceneEstablishText: "Text describing scene establishment requirement",
    sceneBuildText: "Text describing scene building requirement"
  };

  const availableVariables = {
    firstLineInstructions: ["{audienceWord}"],
    secondLineInstructions: ["{lastSpeaker}", "{lastLine}"],
    continuationInstructions: ["{lastSpeaker}", "{lastLine}"],
    mainPromptTemplate: ["{speakerName}", "{otherCharacterNames}", "{audienceWord}", "{personality}", "{catchphrases}", "{promptInstructions}", "{maxWords}", "{sceneInstructions}"],
    systemPromptTemplate: ["{speakerName}", "{otherCharacterNames}"]
  };

  return (
    <div className="prompt-templates-form">
      <div className="form-header">
        <p className="help-text">
          Customize the AI prompt templates used to generate character dialogue. Use variables in curly braces like {"{speakerName}"} to insert dynamic content.
        </p>
        <button onClick={resetToDefaults} className="reset-templates-button">
          Reset to Defaults
        </button>
      </div>

      {Object.entries(editedTemplates).map(([key, value]) => (
        <div key={key} className="template-group">
          <div className="template-header">
            <label className="template-label">{key}:</label>
            <span className="template-description">
              {templateDescriptions[key]}
            </span>
          </div>

          {typeof value === 'string' ? (
            <textarea
              value={value}
              onChange={(e) => handleChange(key, e.target.value)}
              rows={value.split('\n').length + 2}
              className="template-textarea"
              placeholder={`Enter ${key} template...`}
            />
          ) : (
            <input
              type="number"
              value={value}
              onChange={(e) => handleChange(key, parseInt(e.target.value) || 0)}
              className="template-number-input"
            />
          )}

          {availableVariables[key] && (
            <div className="available-vars">
              <small>Available variables: {availableVariables[key].join(', ')}</small>
            </div>
          )}
        </div>
      ))}

      <button onClick={handleSave} className="save-button">
        Save Prompt Templates
      </button>
    </div>
  );
}

function SupervisorEditor({ settings, onUpdate }) {
  const [editedSettings, setEditedSettings] = useState({ ...settings });

  const handleChange = (field, value) => {
    setEditedSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    onUpdate(editedSettings);
    alert('Supervisor settings updated successfully!');
  };

  const resetToDefaults = () => {
    if (window.confirm('Reset all supervisor settings to defaults? This cannot be undone.')) {
      setEditedSettings({ ...defaultSupervisorSettings });
    }
  };

  const settingDescriptions = {
    turnTakingStrategy: "How the supervisor decides who speaks next",
    pacingSpeed: "Overall speed and rhythm of scene progression",
    supervisorPersonality: "The directing style and approach of the supervisor",
    participationBalance: "How strictly the supervisor enforces equal speaking time",
    sceneTransitionSensitivity: "How quickly the supervisor responds to scene changes",
    maxConsecutiveTurns: "Maximum number of turns one character can have in a row",
    characterInteractionWeight: "How much character relationships influence speaker selection (0-1)",
    dramaticTimingWeight: "How much dramatic timing influences speaker selection (0-1)"
  };

  const dropdownOptions = {
    turnTakingStrategy: [
      { value: 'round-robin', label: 'Round Robin - Simple rotation' },
      { value: 'weighted-random', label: 'Weighted Random - Balance participation' },
      { value: 'context-driven', label: 'Context Driven - AI considers scene context' },
      { value: 'dramatic-optimal', label: 'Dramatic Optimal - AI optimizes for dramatic impact' }
    ],
    pacingSpeed: [
      { value: 'fast', label: 'Fast - Quick transitions, high energy' },
      { value: 'medium', label: 'Medium - Natural pacing' },
      { value: 'slow', label: 'Slow - Thoughtful, deliberate pacing' }
    ],
    supervisorPersonality: [
      { value: 'improv-coach', label: 'Improv Coach - Supportive, educational' },
      { value: 'playwright', label: 'Playwright - Story structure focused' },
      { value: 'director', label: 'Director - Authoritative, vision-driven' },
      { value: 'natural', label: 'Natural - Minimal intervention style' }
    ],
    participationBalance: [
      { value: 'strict', label: 'Strict - Enforce equal participation' },
      { value: 'loose', label: 'Loose - Allow some imbalance for flow' },
      { value: 'natural', label: 'Natural - Let scene dynamics decide' }
    ],
    sceneTransitionSensitivity: [
      { value: 'low', label: 'Low - Stable, consistent direction' },
      { value: 'medium', label: 'Medium - Responsive to major changes' },
      { value: 'high', label: 'High - Highly adaptive to scene shifts' }
    ]
  };

  return (
    <div className="supervisor-form">
      <div className="form-header">
        <p className="help-text">
          Configure the AI Supervisor that coordinates character interactions and manages scene flow. The supervisor works behind the scenes to create natural, engaging improv scenes.
        </p>
        <button onClick={resetToDefaults} className="reset-templates-button">
          Reset to Defaults
        </button>
      </div>

      <div className="supervisor-settings-grid">
        {/* Dropdown Settings */}
        {Object.entries(dropdownOptions).map(([key, options]) => (
          <div key={key} className="setting-group">
            <div className="setting-header">
              <label className="setting-label">{key}:</label>
              <span className="setting-description">
                {settingDescriptions[key]}
              </span>
            </div>
            <select
              value={editedSettings[key]}
              onChange={(e) => handleChange(key, e.target.value)}
              className="setting-select"
            >
              {options.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ))}

        {/* Numeric Settings */}
        <div className="setting-group">
          <div className="setting-header">
            <label className="setting-label">maxConsecutiveTurns:</label>
            <span className="setting-description">
              {settingDescriptions.maxConsecutiveTurns}
            </span>
          </div>
          <input
            type="number"
            min="1"
            max="5"
            value={editedSettings.maxConsecutiveTurns}
            onChange={(e) => handleChange('maxConsecutiveTurns', parseInt(e.target.value))}
            className="setting-number-input"
          />
        </div>

        <div className="setting-group">
          <div className="setting-header">
            <label className="setting-label">characterInteractionWeight:</label>
            <span className="setting-description">
              {settingDescriptions.characterInteractionWeight}
            </span>
          </div>
          <input
            type="number"
            min="0"
            max="1"
            step="0.1"
            value={editedSettings.characterInteractionWeight}
            onChange={(e) => handleChange('characterInteractionWeight', parseFloat(e.target.value))}
            className="setting-number-input"
          />
        </div>

        <div className="setting-group">
          <div className="setting-header">
            <label className="setting-label">dramaticTimingWeight:</label>
            <span className="setting-description">
              {settingDescriptions.dramaticTimingWeight}
            </span>
          </div>
          <input
            type="number"
            min="0"
            max="1"
            step="0.1"
            value={editedSettings.dramaticTimingWeight}
            onChange={(e) => handleChange('dramaticTimingWeight', parseFloat(e.target.value))}
            className="setting-number-input"
          />
        </div>
      </div>

      {/* Supervisor Prompt Template */}
      <div className="supervisor-prompt-section">
        <div className="setting-header">
          <label className="setting-label">Supervisor Prompt Template:</label>
          <span className="setting-description">
            The prompt template used by the AI supervisor to make decisions
          </span>
        </div>
        <textarea
          value={editedSettings.supervisorPromptTemplate}
          onChange={(e) => handleChange('supervisorPromptTemplate', e.target.value)}
          rows={12}
          className="template-textarea"
          placeholder="Enter supervisor prompt template..."
        />
        <div className="available-vars">
          <small>
            Available variables: {"{audienceWord}, {sceneLocation}, {sceneEnergy}, {sceneMood}, {dialogueCount}, {characterDetails}, {recentDialogue}, {participationStats}"}
          </small>
        </div>
      </div>

      <button onClick={handleSave} className="save-button">
        Save Supervisor Settings
      </button>
    </div>
  );
}

export default Settings;