import { persistentDB } from './persistentDatabase';
import { characterMemoryService } from './characterMemory';

class UserProfileService {
  constructor() {
    this.currentUser = null;
    this.userProfiles = new Map();
    this.isInitialized = false;

    // Default user profile structure
    this.defaultProfile = {
      id: null,
      name: 'Anonymous User',
      preferences: {
        performanceMode: 'mixed', // ai-only, mixed, human-led
        voiceSettings: {
          language: 'en-US',
          sensitivity: 0.7,
          autoListen: true,
          pushToTalk: false
        },
        scenePreferences: {
          sceneLength: 20,
          pauseBetweenLines: 800,
          preferredGenres: ['comedy', 'drama', 'musical'],
          difficultyLevel: 'intermediate'
        },
        characterPreferences: {
          favoriteCharacters: [],
          preferredVoices: [],
          interactionStyle: 'collaborative'
        }
      },
      performanceHistory: {
        totalScenes: 0,
        totalLines: 0,
        averageSceneLength: 0,
        preferredCharacters: {},
        bestPerformances: [],
        improvementAreas: []
      },
      personalityProfile: {
        creativity: 0.5,
        humor: 0.5,
        collaboration: 0.5,
        confidence: 0.5,
        adaptability: 0.5,
        energyLevel: 0.5
      },
      learningProgress: {
        skillLevels: {
          'yes-and': 0.5,
          'character-work': 0.5,
          'scene-building': 0.5,
          'heightening': 0.5,
          'callbacks': 0.5
        },
        achievements: [],
        challenges: [],
        nextGoals: []
      },
      createdAt: null,
      lastActive: null,
      settings: {
        notifications: true,
        dataCollection: true,
        voiceRecording: false,
        analytics: true
      }
    };
  }

  // Initialize the user profile system
  async initialize() {
    if (this.isInitialized) return true;

    try {
      console.log('[UserProfile] Initializing user profile system');

      // Load existing profiles from persistent storage
      await this.loadProfilesFromStorage();

      // Check if there's a current user from last session
      const lastUserId = localStorage.getItem('current-user-id');
      if (lastUserId && this.userProfiles.has(lastUserId)) {
        this.setCurrentUser(lastUserId);
      }

      this.isInitialized = true;
      console.log('[UserProfile] User profile system initialized');
      return true;
    } catch (error) {
      console.error('[UserProfile] Failed to initialize:', error);
      return false;
    }
  }

  // Load profiles from persistent storage
  async loadProfilesFromStorage() {
    try {
      const storedProfiles = persistentDB.getUserProfiles();

      if (storedProfiles && Object.keys(storedProfiles).length > 0) {
        Object.entries(storedProfiles).forEach(([userId, profile]) => {
          // Ensure profile has all required fields
          const completeProfile = this.mergeWithDefaultProfile(profile);
          this.userProfiles.set(userId, completeProfile);
        });

        console.log(`[UserProfile] Loaded ${this.userProfiles.size} user profiles`);
      }
    } catch (error) {
      console.error('[UserProfile] Failed to load profiles:', error);
    }
  }

  // Save profiles to persistent storage
  async saveProfilesToStorage() {
    try {
      const profilesToSave = Object.fromEntries(this.userProfiles);
      persistentDB.saveUserProfiles(profilesToSave);
      console.log('[UserProfile] Profiles saved to storage');
    } catch (error) {
      console.error('[UserProfile] Failed to save profiles:', error);
    }
  }

  // Merge profile with default structure to ensure completeness
  mergeWithDefaultProfile(profile) {
    const merged = JSON.parse(JSON.stringify(this.defaultProfile));

    // Deep merge the profile
    this.deepMerge(merged, profile);

    return merged;
  }

  // Deep merge utility
  deepMerge(target, source) {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key]) target[key] = {};
        this.deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }

  // Create a new user profile
  async createUserProfile(userData = {}) {
    const userId = userData.id || this.generateUserId();
    const userName = userData.name || `User_${userId.substring(0, 8)}`;

    const profile = this.mergeWithDefaultProfile({
      ...userData,
      id: userId,
      name: userName,
      createdAt: Date.now(),
      lastActive: Date.now()
    });

    this.userProfiles.set(userId, profile);
    await this.saveProfilesToStorage();

    console.log(`[UserProfile] Created new user profile: ${userName} (${userId})`);
    return profile;
  }

  // Set the current active user
  setCurrentUser(userId) {
    if (!this.userProfiles.has(userId)) {
      console.error(`[UserProfile] User ${userId} not found`);
      return false;
    }

    this.currentUser = this.userProfiles.get(userId);
    this.currentUser.lastActive = Date.now();

    // Store current user ID in localStorage
    localStorage.setItem('current-user-id', userId);

    console.log(`[UserProfile] Current user set to: ${this.currentUser.name}`);
    this.saveProfilesToStorage();
    return true;
  }

  // Get current user profile
  getCurrentUser() {
    return this.currentUser;
  }

  // Get user profile by ID
  getUserProfile(userId) {
    return this.userProfiles.get(userId) || null;
  }

  // Update current user profile
  async updateCurrentUserProfile(updates) {
    if (!this.currentUser) {
      console.error('[UserProfile] No current user to update');
      return false;
    }

    // Deep merge updates
    this.deepMerge(this.currentUser, updates);
    this.currentUser.lastActive = Date.now();

    // Update in profiles map
    this.userProfiles.set(this.currentUser.id, this.currentUser);

    await this.saveProfilesToStorage();
    console.log(`[UserProfile] Updated profile for ${this.currentUser.name}`);
    return true;
  }

  // Record a performance session
  async recordPerformanceSession(sessionData) {
    if (!this.currentUser) {
      console.error('[UserProfile] No current user for performance recording');
      return false;
    }

    const session = {
      id: this.generateSessionId(),
      timestamp: Date.now(),
      duration: sessionData.duration || 0,
      mode: sessionData.mode || 'mixed',
      characters: sessionData.characters || [],
      audienceWord: sessionData.audienceWord,
      linesSpoken: sessionData.linesSpoken || 0,
      aiInteractions: sessionData.aiInteractions || 0,
      sentiment: sessionData.sentiment || 'neutral',
      skills: sessionData.skillsUsed || [],
      feedback: sessionData.feedback || {},
      achievements: sessionData.achievements || []
    };

    // Update performance history
    const history = this.currentUser.performanceHistory;
    history.totalScenes += 1;
    history.totalLines += session.linesSpoken;
    history.averageSceneLength = ((history.averageSceneLength * (history.totalScenes - 1)) + session.duration) / history.totalScenes;

    // Update preferred characters
    session.characters.forEach(character => {
      if (!history.preferredCharacters[character]) {
        history.preferredCharacters[character] = 0;
      }
      history.preferredCharacters[character] += 1;
    });

    // Add to best performances if quality is high
    if (sessionData.quality && sessionData.quality > 0.8) {
      history.bestPerformances.push({
        sessionId: session.id,
        timestamp: session.timestamp,
        quality: sessionData.quality,
        highlights: sessionData.highlights || []
      });

      // Keep only top 10 best performances
      history.bestPerformances.sort((a, b) => b.quality - a.quality);
      if (history.bestPerformances.length > 10) {
        history.bestPerformances = history.bestPerformances.slice(0, 10);
      }
    }

    // Update skill levels based on performance
    this.updateSkillLevels(sessionData);

    // Update personality profile
    this.updatePersonalityProfile(sessionData);

    // Save the session to database
    persistentDB.addPerformanceRecord(session);

    await this.saveProfilesToStorage();
    console.log(`[UserProfile] Recorded performance session for ${this.currentUser.name}`);
    return session;
  }

  // Update skill levels based on performance
  updateSkillLevels(sessionData) {
    const skills = this.currentUser.learningProgress.skillLevels;
    const improvement = 0.02; // Small incremental improvement

    // Update based on skills demonstrated in session
    if (sessionData.skillsUsed) {
      sessionData.skillsUsed.forEach(skill => {
        if (skills[skill] !== undefined) {
          skills[skill] = Math.min(1.0, skills[skill] + improvement);
        }
      });
    }

    // General improvement for participation
    Object.keys(skills).forEach(skill => {
      skills[skill] = Math.min(1.0, skills[skill] + improvement * 0.5);
    });
  }

  // Update personality profile based on session
  updatePersonalityProfile(sessionData) {
    const personality = this.currentUser.personalityProfile;
    const adjustment = 0.01; // Very small adjustments

    if (sessionData.sentiment === 'positive') {
      personality.humor = Math.min(1.0, personality.humor + adjustment);
      personality.confidence = Math.min(1.0, personality.confidence + adjustment);
    }

    if (sessionData.mode === 'mixed') {
      personality.collaboration = Math.min(1.0, personality.collaboration + adjustment);
      personality.adaptability = Math.min(1.0, personality.adaptability + adjustment);
    }

    if (sessionData.linesSpoken > 10) {
      personality.confidence = Math.min(1.0, personality.confidence + adjustment);
      personality.energyLevel = Math.min(1.0, personality.energyLevel + adjustment);
    }
  }

  // Get user statistics
  getUserStatistics(userId = null) {
    const user = userId ? this.getUserProfile(userId) : this.currentUser;
    if (!user) return null;

    const history = user.performanceHistory;
    const skills = user.learningProgress.skillLevels;

    return {
      userId: user.id,
      name: user.name,
      memberSince: new Date(user.createdAt).toLocaleDateString(),
      lastActive: new Date(user.lastActive).toLocaleDateString(),
      totalScenes: history.totalScenes,
      totalLines: history.totalLines,
      averageSceneLength: Math.round(history.averageSceneLength),
      favoriteCharacters: this.getTopCharacters(history.preferredCharacters, 5),
      skillSummary: {
        overall: this.calculateOverallSkillLevel(skills),
        strongest: this.getStrongestSkills(skills, 3),
        developing: this.getDevelopingSkills(skills, 3)
      },
      personalitySnapshot: this.getPersonalitySnapshot(user.personalityProfile),
      achievements: user.learningProgress.achievements.length,
      bestPerformanceScore: history.bestPerformances.length > 0
        ? history.bestPerformances[0].quality
        : 0
    };
  }

  // Get top characters by frequency
  getTopCharacters(preferredCharacters, count) {
    return Object.entries(preferredCharacters)
      .sort(([,a], [,b]) => b - a)
      .slice(0, count)
      .map(([character, frequency]) => ({ character, frequency }));
  }

  // Calculate overall skill level
  calculateOverallSkillLevel(skills) {
    const values = Object.values(skills);
    return values.reduce((sum, level) => sum + level, 0) / values.length;
  }

  // Get strongest skills
  getStrongestSkills(skills, count) {
    return Object.entries(skills)
      .sort(([,a], [,b]) => b - a)
      .slice(0, count)
      .map(([skill, level]) => ({ skill, level }));
  }

  // Get developing skills (lowest scores)
  getDevelopingSkills(skills, count) {
    return Object.entries(skills)
      .sort(([,a], [,b]) => a - b)
      .slice(0, count)
      .map(([skill, level]) => ({ skill, level }));
  }

  // Get personality snapshot
  getPersonalitySnapshot(personality) {
    const traits = Object.entries(personality)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([trait, level]) => ({ trait, level }));

    return {
      dominantTraits: traits,
      personalityType: this.classifyPersonalityType(personality)
    };
  }

  // Classify personality type based on traits
  classifyPersonalityType(personality) {
    if (personality.humor > 0.7 && personality.energyLevel > 0.7) {
      return 'Energetic Comedian';
    }
    if (personality.collaboration > 0.7 && personality.adaptability > 0.7) {
      return 'Collaborative Builder';
    }
    if (personality.creativity > 0.7 && personality.confidence > 0.7) {
      return 'Creative Leader';
    }
    if (personality.humor > 0.6 && personality.collaboration > 0.6) {
      return 'Supportive Entertainer';
    }
    return 'Balanced Performer';
  }

  // Get memory-informed context for characters
  getCharacterContext(characterName) {
    if (!this.currentUser) return null;

    // Get character memory context
    const memoryContext = characterMemoryService.generateMemoryContext(
      characterName,
      {
        userId: this.currentUser.id,
        userPreferences: this.currentUser.preferences,
        personalityProfile: this.currentUser.personalityProfile
      }
    );

    return {
      ...memoryContext,
      userProfile: {
        name: this.currentUser.name,
        interactionStyle: this.currentUser.preferences.characterPreferences.interactionStyle,
        skillLevel: this.calculateOverallSkillLevel(this.currentUser.learningProgress.skillLevels),
        preferredMode: this.currentUser.preferences.performanceMode
      }
    };
  }

  // Generate unique user ID
  generateUserId() {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Generate unique session ID
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get all user profiles (for admin/selection)
  getAllUsers() {
    return Array.from(this.userProfiles.values()).map(user => ({
      id: user.id,
      name: user.name,
      createdAt: user.createdAt,
      lastActive: user.lastActive,
      totalScenes: user.performanceHistory.totalScenes
    }));
  }

  // Delete user profile
  async deleteUserProfile(userId) {
    if (!this.userProfiles.has(userId)) {
      console.error(`[UserProfile] Cannot delete - user ${userId} not found`);
      return false;
    }

    // Don't delete if it's the current user
    if (this.currentUser && this.currentUser.id === userId) {
      console.error('[UserProfile] Cannot delete current user');
      return false;
    }

    this.userProfiles.delete(userId);
    await this.saveProfilesToStorage();

    console.log(`[UserProfile] Deleted user profile: ${userId}`);
    return true;
  }

  // Clear current user (logout)
  clearCurrentUser() {
    this.currentUser = null;
    localStorage.removeItem('current-user-id');
    console.log('[UserProfile] Cleared current user');
  }

  // Get user profile statistics
  getSystemStatistics() {
    return {
      totalUsers: this.userProfiles.size,
      activeUsers: Array.from(this.userProfiles.values()).filter(
        user => Date.now() - user.lastActive < (7 * 24 * 60 * 60 * 1000) // Active in last 7 days
      ).length,
      totalSessions: Array.from(this.userProfiles.values()).reduce(
        (sum, user) => sum + user.performanceHistory.totalScenes, 0
      ),
      averageSkillLevel: this.calculateSystemAverageSkill()
    };
  }

  // Calculate system-wide average skill level
  calculateSystemAverageSkill() {
    const allUsers = Array.from(this.userProfiles.values());
    if (allUsers.length === 0) return 0;

    const totalSkill = allUsers.reduce((sum, user) => {
      return sum + this.calculateOverallSkillLevel(user.learningProgress.skillLevels);
    }, 0);

    return totalSkill / allUsers.length;
  }
}

// Global user profile service instance
export const userProfileService = new UserProfileService();