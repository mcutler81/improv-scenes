import React, { useState, useEffect } from 'react';
import { characters as defaultCharacters } from '../data/characters';
import { defaultPromptTemplates } from '../services/dialogueGenerator';
import { defaultSupervisorSettings } from '../services/supervisorAgent';
import { supervisorMonitor } from '../services/supervisorMonitor';
import { persistentDB } from '../services/persistentDatabase';
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
    // Load settings from persistent database or use defaults
    const savedCharacters = persistentDB.getCharacters();
    const savedDialogueSettings = persistentDB.getDialogueSettings();
    const savedPromptTemplates = persistentDB.getPromptTemplates();
    const savedSupervisorSettings = persistentDB.getSupervisorSettings();

    if (savedCharacters && savedCharacters.length > 0) {
      setCharacters(savedCharacters);
    } else {
      setCharacters(defaultCharacters);
      persistentDB.saveCharacters(defaultCharacters);
    }

    if (Object.keys(savedDialogueSettings).length > 0) {
      setDialogueSettings(prev => ({ ...prev, ...savedDialogueSettings }));
    } else {
      const defaultSettings = {
        maxTokens: 50,
        temperature: 0.9,
        sceneLength: 12,
        pauseBetweenLines: 1500
      };
      persistentDB.saveDialogueSettings(defaultSettings);
    }

    if (Object.keys(savedPromptTemplates).length > 0) {
      setPromptTemplates({ ...defaultPromptTemplates, ...savedPromptTemplates });
    } else {
      persistentDB.savePromptTemplates(defaultPromptTemplates);
    }

    if (Object.keys(savedSupervisorSettings).length > 0) {
      setSupervisorSettings({ ...defaultSupervisorSettings, ...savedSupervisorSettings });
    } else {
      persistentDB.saveSupervisorSettings(defaultSupervisorSettings);
    }
  }, []);

  const saveCharacters = (newCharacters) => {
    setCharacters(newCharacters);
    persistentDB.saveCharacters(newCharacters);
  };

  const saveDialogueSettings = (newSettings) => {
    setDialogueSettings(newSettings);
    persistentDB.saveDialogueSettings(newSettings);
  };

  const savePromptTemplates = (newTemplates) => {
    setPromptTemplates(newTemplates);
    persistentDB.savePromptTemplates(newTemplates);
  };

  const saveSupervisorSettings = (newSettings) => {
    setSupervisorSettings(newSettings);
    persistentDB.saveSupervisorSettings(newSettings);
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
        <button
          className={`tab ${activeTab === 'monitor' ? 'active' : ''}`}
          onClick={() => setActiveTab('monitor')}
        >
          Monitor
        </button>
        <button
          className={`tab ${activeTab === 'database' ? 'active' : ''}`}
          onClick={() => setActiveTab('database')}
        >
          Database
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

      {activeTab === 'monitor' && (
        <div className="monitor-section">
          <h2>Supervisor Monitor</h2>
          <SupervisorMonitor />
        </div>
      )}

      {activeTab === 'database' && (
        <div className="database-section">
          <h2>Database Management</h2>
          <DatabaseManager />
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

function SupervisorMonitor() {
  const [currentStats, setCurrentStats] = useState(null);
  const [sceneHistory, setSceneHistory] = useState([]);
  const [performanceInsights, setPerformanceInsights] = useState(null);
  const [selectedScene, setSelectedScene] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    // Load initial data
    refreshData();

    // Set up auto-refresh if enabled
    let interval;
    if (autoRefresh) {
      interval = setInterval(refreshData, 2000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const refreshData = () => {
    setCurrentStats(supervisorMonitor.getCurrentStatistics());
    setSceneHistory(supervisorMonitor.getSceneHistory());
    setPerformanceInsights(supervisorMonitor.getPerformanceInsights());
  };

  const formatDuration = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const clearHistory = () => {
    if (window.confirm('Clear all supervisor monitoring history? This cannot be undone.')) {
      supervisorMonitor.clearHistory();
      refreshData();
    }
  };

  return (
    <div className="supervisor-monitor">
      <div className="monitor-header">
        <p className="help-text">
          Monitor supervisor performance and decisions in real-time. Use this data to optimize supervisor settings and understand how well the AI is coordinating your scenes.
        </p>
        <div className="monitor-controls">
          <label className="auto-refresh-toggle">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh (2s)
          </label>
          <button onClick={refreshData} className="refresh-button">
            🔄 Refresh
          </button>
          <button onClick={clearHistory} className="clear-button">
            🗑️ Clear History
          </button>
        </div>
      </div>

      {/* Current Scene Monitoring */}
      {currentStats && (
        <div className="current-scene-monitor">
          <h3>Current Scene (Live)</h3>
          <div className="current-stats-grid">
            <div className="stat-card">
              <h4>Scene Info</h4>
              <p>Word: <strong>{currentStats.sceneInfo.audienceWord}</strong></p>
              <p>Duration: <strong>{formatDuration(currentStats.sceneInfo.duration)}</strong></p>
              <p>Strategy: <strong>{currentStats.sceneInfo.settings.turnTakingStrategy}</strong></p>
            </div>

            <div className="stat-card">
              <h4>Performance</h4>
              <p>Total Decisions: <strong>{currentStats.performance.totalDecisions}</strong></p>
              <p>AI Success: <strong>{Math.round((currentStats.performance.aiDecisions / currentStats.performance.totalDecisions) * 100) || 0}%</strong></p>
              <p>Avg Time: <strong>{Math.round(currentStats.performance.averageDecisionTime)}ms</strong></p>
            </div>

            <div className="stat-card">
              <h4>Participation Balance</h4>
              {Object.entries(currentStats.performance.participationBalance).map(([name, stats]) => (
                <p key={name}>{name}: <strong>{stats.percentage}%</strong> ({stats.turns} turns)</p>
              ))}
            </div>
          </div>

          {currentStats.lastDecision && (
            <div className="last-decision">
              <h4>Latest Supervisor Decision</h4>
              <div className="decision-details">
                <p><strong>Speaker:</strong> {currentStats.lastDecision.speaker}</p>
                <p><strong>Reason:</strong> {currentStats.lastDecision.reason}</p>
                {currentStats.lastDecision.sceneNote && (
                  <p><strong>Scene Note:</strong> {currentStats.lastDecision.sceneNote}</p>
                )}
                <p><strong>Time:</strong> {formatTimestamp(currentStats.lastDecision.timestamp)}</p>
                <p><strong>Decision Time:</strong> {currentStats.lastDecision.timeTaken}ms</p>
                <p><strong>Method:</strong> {currentStats.lastDecision.isAI ? 'AI Decision' : 'Fallback'}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Performance Insights */}
      {performanceInsights && (
        <div className="performance-insights">
          <h3>Performance Insights (Last 5 Scenes)</h3>
          <div className="insights-grid">
            <div className="insight-card">
              <h4>AI Effectiveness</h4>
              <p className={`metric ${performanceInsights.averageAISuccessRate > 0.8 ? 'good' : 'warning'}`}>
                Success Rate: <strong>{Math.round(performanceInsights.averageAISuccessRate * 100)}%</strong>
              </p>
            </div>

            <div className="insight-card">
              <h4>Decision Speed</h4>
              <p className={`metric ${performanceInsights.averageDecisionTime < 3000 ? 'good' : 'warning'}`}>
                Avg Time: <strong>{Math.round(performanceInsights.averageDecisionTime)}ms</strong>
              </p>
            </div>

            <div className="insight-card">
              <h4>Balance Consistency</h4>
              <p className={`metric ${performanceInsights.participationConsistency > 0.7 ? 'good' : 'warning'}`}>
                Balanced Scenes: <strong>{Math.round(performanceInsights.participationConsistency * 100)}%</strong>
              </p>
            </div>
          </div>

          {performanceInsights.recommendedTuning.length > 0 && (
            <div className="tuning-recommendations">
              <h4>Tuning Recommendations</h4>
              {performanceInsights.recommendedTuning.map((rec, index) => (
                <div key={index} className={`recommendation ${rec.severity}`}>
                  <p className="rec-message"><strong>{rec.message}</strong></p>
                  <p className="rec-suggestion">{rec.suggestion}</p>
                </div>
              ))}
            </div>
          )}

          {performanceInsights.commonReasoningPatterns.length > 0 && (
            <div className="reasoning-patterns">
              <h4>Common Decision Patterns</h4>
              {performanceInsights.commonReasoningPatterns.map((pattern, index) => (
                <p key={index}>
                  <strong>{pattern.pattern}</strong>: {pattern.count} times
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Scene History */}
      <div className="scene-history">
        <h3>Scene History ({sceneHistory.length} scenes)</h3>
        {sceneHistory.length === 0 ? (
          <p className="no-data">No scenes recorded yet. Start an improv scene to begin monitoring.</p>
        ) : (
          <div className="history-list">
            {sceneHistory.map((scene, index) => (
              <div
                key={scene.sessionId}
                className={`history-item ${selectedScene?.sessionId === scene.sessionId ? 'selected' : ''}`}
                onClick={() => setSelectedScene(scene)}
              >
                <div className="scene-summary">
                  <h4>Scene {sceneHistory.length - index}: "{scene.audienceWord}"</h4>
                  <p>{formatTimestamp(scene.startTime)} • {formatDuration(scene.duration)} • {scene.decisions.length} decisions</p>
                  <p>Strategy: {scene.settings.turnTakingStrategy} • AI Success: {Math.round((scene.performance.aiDecisions / scene.performance.totalDecisions) * 100) || 0}%</p>
                </div>
                {selectedScene?.sessionId === scene.sessionId && (
                  <div className="scene-details">
                    <div className="decisions-list">
                      <h5>All Decisions:</h5>
                      {scene.decisions.map((decision, idx) => (
                        <div key={idx} className="decision-item">
                          <p><strong>#{idx + 1} - {decision.speaker}</strong></p>
                          <p>{decision.reason}</p>
                          {decision.sceneNote && <p><em>{decision.sceneNote}</em></p>}
                          <p><small>{decision.timeTaken}ms • {decision.isAI ? 'AI' : 'Fallback'}</small></p>
                        </div>
                      ))}
                    </div>

                    {scene.analytics && (
                      <div className="scene-analytics">
                        <h5>Analytics:</h5>
                        <p>Participation Balance: {scene.analytics.participationBalance.isBalanced ? '✅ Balanced' : '⚠️ Imbalanced'}</p>
                        <p>Dramatic Beats: {scene.analytics.dramaticBeatsCount}</p>
                        <p>AI Success Rate: {Math.round(scene.analytics.strategyEffectiveness.aiSuccessRate * 100)}%</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DatabaseManager() {
  const [dbInfo, setDbInfo] = useState(null);
  const [exportData, setExportData] = useState('');
  const [importData, setImportData] = useState('');
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    loadDatabaseInfo();
  }, []);

  const loadDatabaseInfo = () => {
    setDbInfo(persistentDB.getDatabaseInfo());
  };

  const handleExport = () => {
    const data = persistentDB.exportData();
    setExportData(data);
    setShowExport(true);
  };

  const handleImport = async () => {
    try {
      if (!importData.trim()) {
        alert('Please paste the database JSON data to import.');
        return;
      }

      if (window.confirm('This will replace all current settings with the imported data. Continue?')) {
        persistentDB.importData(importData);
        alert('Database imported successfully! Please refresh the page to see changes.');
        setImportData('');
        setShowImport(false);
        loadDatabaseInfo();
      }
    } catch (error) {
      alert('Import failed: ' + error.message);
    }
  };

  const handleClearAll = () => {
    if (window.confirm('This will clear ALL settings and data. This cannot be undone. Continue?')) {
      persistentDB.clearAll();
      alert('Database cleared successfully! Please refresh the page.');
      loadDatabaseInfo();
    }
  };

  const downloadExport = () => {
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `improv-theater-settings-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="database-manager">
      <div className="database-info">
        <h3>Database Information</h3>
        {dbInfo && (
          <div className="info-grid">
            <div className="info-item">
              <label>Storage Location:</label>
              <span>{dbInfo.path}</span>
            </div>
            <div className="info-item">
              <label>Database Size:</label>
              <span>{formatBytes(dbInfo.size)}</span>
            </div>
            <div className="info-item">
              <label>Last Updated:</label>
              <span>{new Date(dbInfo.metadata.lastUpdated).toLocaleString()}</span>
            </div>
            <div className="info-item">
              <label>Version:</label>
              <span>{dbInfo.metadata.version}</span>
            </div>
            <div className="info-item">
              <label>Data Categories:</label>
              <span>{dbInfo.keys.join(', ')}</span>
            </div>
          </div>
        )}
        <button onClick={loadDatabaseInfo} className="refresh-button">
          🔄 Refresh Info
        </button>
      </div>

      <div className="database-actions">
        <h3>Database Actions</h3>
        <div className="action-grid">
          <div className="action-card">
            <h4>Export Settings</h4>
            <p>Save all your settings to a file that can be imported later or shared.</p>
            <button onClick={handleExport} className="action-button export">
              📤 Export Database
            </button>
          </div>

          <div className="action-card">
            <h4>Import Settings</h4>
            <p>Load settings from a previously exported file or another version.</p>
            <button
              onClick={() => setShowImport(!showImport)}
              className="action-button import"
            >
              📥 Import Database
            </button>
          </div>

          <div className="action-card">
            <h4>Clear All Data</h4>
            <p>Reset everything to defaults. This cannot be undone!</p>
            <button onClick={handleClearAll} className="action-button danger">
              🗑️ Clear Database
            </button>
          </div>
        </div>
      </div>

      {showExport && (
        <div className="export-section">
          <h3>Export Data</h3>
          <p>Copy this JSON data to save your settings:</p>
          <div className="export-controls">
            <button onClick={downloadExport} className="download-button">
              💾 Download as File
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(exportData);
                alert('Copied to clipboard!');
              }}
              className="copy-button"
            >
              📋 Copy to Clipboard
            </button>
          </div>
          <textarea
            value={exportData}
            readOnly
            rows={10}
            className="export-textarea"
            placeholder="Export data will appear here..."
          />
          <button
            onClick={() => setShowExport(false)}
            className="close-button"
          >
            ✕ Close
          </button>
        </div>
      )}

      {showImport && (
        <div className="import-section">
          <h3>Import Data</h3>
          <p>Paste the JSON data from a previous export:</p>
          <textarea
            value={importData}
            onChange={(e) => setImportData(e.target.value)}
            rows={10}
            className="import-textarea"
            placeholder="Paste your exported JSON data here..."
          />
          <div className="import-controls">
            <button onClick={handleImport} className="import-button">
              📥 Import Data
            </button>
            <button
              onClick={() => {
                setShowImport(false);
                setImportData('');
              }}
              className="close-button"
            >
              ✕ Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Settings;