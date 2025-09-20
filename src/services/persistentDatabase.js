// Persistent database for improv theater settings
// Uses enhanced localStorage with structured data and export/import capabilities

const DB_KEY = 'improv-theater-database';
const DB_VERSION = '1.0.0';

class PersistentDatabase {
  constructor() {
    this.data = {};
    this.initializeDatabase();
  }

  initializeDatabase() {
    try {
      this.loadFromLocalStorage();
    } catch (error) {
      console.warn('Could not initialize persistent database, using memory storage:', error);
      this.data = this.getDefaultData();
    }
  }


  loadFromLocalStorage() {
    try {
      // First try to load from new consolidated database
      const consolidated = localStorage.getItem(DB_KEY);
      if (consolidated) {
        this.data = JSON.parse(consolidated);
        return;
      }

      // If no consolidated data, migrate from old individual keys
      const keys = [
        'improv-characters',
        'improv-dialogue-settings',
        'improv-prompt-templates',
        'improv-supervisor-settings',
        'supervisor-monitor-history'
      ];

      this.data = {
        characters: [],
        dialogueSettings: {},
        promptTemplates: {},
        supervisorSettings: {},
        monitorHistory: [],
        metadata: {
          version: DB_VERSION,
          lastUpdated: new Date().toISOString(),
          source: 'localStorage'
        }
      };

      // Migrate existing localStorage data
      keys.forEach(key => {
        const stored = localStorage.getItem(key);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            switch(key) {
              case 'improv-characters':
                this.data.characters = parsed;
                break;
              case 'improv-dialogue-settings':
                this.data.dialogueSettings = parsed;
                break;
              case 'improv-prompt-templates':
                this.data.promptTemplates = parsed;
                break;
              case 'improv-supervisor-settings':
                this.data.supervisorSettings = parsed;
                break;
              case 'supervisor-monitor-history':
                this.data.monitorHistory = parsed;
                break;
              default:
                // Unknown key, ignore
                break;
            }
          } catch (error) {
            console.warn(`Could not parse ${key} from localStorage:`, error);
          }
        }
      });

      // Save consolidated data
      this.saveToLocalStorage();
    } catch (error) {
      console.warn('Could not load from localStorage:', error);
      this.data = this.getDefaultData();
    }
  }


  saveToLocalStorage() {
    try {
      // Update metadata
      this.data.metadata = {
        ...this.data.metadata,
        lastUpdated: new Date().toISOString()
      };

      // Save consolidated data to primary key
      localStorage.setItem(DB_KEY, JSON.stringify(this.data));

      // Keep individual keys for backwards compatibility
      localStorage.setItem('improv-characters', JSON.stringify(this.data.characters || []));
      localStorage.setItem('improv-dialogue-settings', JSON.stringify(this.data.dialogueSettings || {}));
      localStorage.setItem('improv-prompt-templates', JSON.stringify(this.data.promptTemplates || {}));
      localStorage.setItem('improv-supervisor-settings', JSON.stringify(this.data.supervisorSettings || {}));
      localStorage.setItem('supervisor-monitor-history', JSON.stringify(this.data.monitorHistory || []));
    } catch (error) {
      console.error('Could not save to localStorage:', error);
      throw error;
    }
  }

  save() {
    try {
      this.saveToLocalStorage();
    } catch (error) {
      console.error('Could not save database:', error);
      throw error;
    }
  }

  getDefaultData() {
    return {
      characters: [],
      dialogueSettings: {
        sceneLength: 12,
        pauseBetweenLines: 1500,
        maxTokens: 150,
        temperature: 0.8
      },
      promptTemplates: {},
      supervisorSettings: {},
      monitorHistory: [],
      characterMemories: {},
      userProfiles: {},
      performanceHistory: [],
      metadata: {
        version: DB_VERSION,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        source: 'localStorage'
      }
    };
  }

  // Characters
  getCharacters() {
    return this.data.characters || [];
  }

  saveCharacters(characters) {
    this.data.characters = characters;
    this.save();
  }

  // Dialogue Settings
  getDialogueSettings() {
    return this.data.dialogueSettings || {};
  }

  saveDialogueSettings(settings) {
    this.data.dialogueSettings = settings;
    this.save();
  }

  // Prompt Templates
  getPromptTemplates() {
    return this.data.promptTemplates || {};
  }

  savePromptTemplates(templates) {
    this.data.promptTemplates = templates;
    this.save();
  }

  // Supervisor Settings
  getSupervisorSettings() {
    return this.data.supervisorSettings || {};
  }

  saveSupervisorSettings(settings) {
    this.data.supervisorSettings = settings;
    this.save();
  }

  // Monitor History
  getMonitorHistory() {
    return this.data.monitorHistory || [];
  }

  saveMonitorHistory(history) {
    this.data.monitorHistory = history;
    this.save();
  }

  // Character Memories
  getCharacterMemories() {
    return this.data.characterMemories || {};
  }

  saveCharacterMemories(memories) {
    this.data.characterMemories = memories;
    this.save();
  }

  // User Profiles
  getUserProfiles() {
    return this.data.userProfiles || {};
  }

  saveUserProfiles(profiles) {
    this.data.userProfiles = profiles;
    this.save();
  }

  // Performance History
  getPerformanceHistory() {
    return this.data.performanceHistory || [];
  }

  savePerformanceHistory(history) {
    this.data.performanceHistory = history;
    this.save();
  }

  addPerformanceRecord(record) {
    if (!this.data.performanceHistory) {
      this.data.performanceHistory = [];
    }

    this.data.performanceHistory.unshift(record);

    // Keep only the most recent 100 performances
    if (this.data.performanceHistory.length > 100) {
      this.data.performanceHistory = this.data.performanceHistory.slice(0, 100);
    }

    this.save();
  }

  // Generic get/set for any data
  get(key) {
    return this.data[key];
  }

  set(key, value) {
    this.data[key] = value;
    this.save();
  }

  // Database info
  getDatabaseInfo() {
    return {
      path: 'localStorage',
      size: JSON.stringify(this.data).length,
      metadata: this.data.metadata,
      keys: Object.keys(this.data)
    };
  }

  // Export/Import functionality
  exportData() {
    return JSON.stringify(this.data, null, 2);
  }

  importData(jsonData) {
    try {
      const imported = JSON.parse(jsonData);

      // Validate structure
      if (typeof imported !== 'object') {
        throw new Error('Invalid data format');
      }

      // Merge with existing data, preserving metadata
      this.data = {
        ...this.getDefaultData(),
        ...imported,
        metadata: {
          ...imported.metadata,
          importedAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        }
      };

      this.save();
      return true;
    } catch (error) {
      console.error('Could not import data:', error);
      throw error;
    }
  }

  // Clear all data
  clearAll() {
    this.data = this.getDefaultData();
    this.save();

    // Also clear individual localStorage keys for complete cleanup
    [
      'improv-characters',
      'improv-dialogue-settings',
      'improv-prompt-templates',
      'improv-supervisor-settings',
      'supervisor-monitor-history',
      DB_KEY
    ].forEach(key => {
      localStorage.removeItem(key);
    });
  }
}

// Global database instance
export const persistentDB = new PersistentDatabase();