import { persistentDB } from './persistentDatabase';

class CharacterMemoryService {
  constructor() {
    this.memoryCache = new Map();
    this.userInteractionHistory = new Map();
    this.characterRelationships = new Map();
    this.personalityEvolution = new Map();
    this.contextualMemory = new Map();

    this.isInitialized = false;
    this.maxMemoryEntries = 1000; // Prevent memory overflow
    this.memoryDecayDays = 30; // Fade old memories after 30 days
  }

  // Initialize the character memory system
  async initialize() {
    if (this.isInitialized) return true;

    try {
      console.log('[CharacterMemory] Initializing character memory system');

      // Load existing memories from persistent storage
      await this.loadMemoriesFromStorage();

      this.isInitialized = true;
      console.log('[CharacterMemory] Character memory system initialized');
      return true;
    } catch (error) {
      console.error('[CharacterMemory] Failed to initialize:', error);
      return false;
    }
  }

  // Load memories from persistent storage
  async loadMemoriesFromStorage() {
    try {
      const storedMemories = persistentDB.getCharacterMemories();

      if (storedMemories) {
        // Load user interaction history
        if (storedMemories.userInteractionHistory) {
          this.userInteractionHistory = new Map(Object.entries(storedMemories.userInteractionHistory));
        }

        // Load character relationships
        if (storedMemories.characterRelationships) {
          this.characterRelationships = new Map(Object.entries(storedMemories.characterRelationships));
        }

        // Load personality evolution
        if (storedMemories.personalityEvolution) {
          this.personalityEvolution = new Map(Object.entries(storedMemories.personalityEvolution));
        }

        // Load contextual memory
        if (storedMemories.contextualMemory) {
          this.contextualMemory = new Map(Object.entries(storedMemories.contextualMemory));
        }

        console.log('[CharacterMemory] Loaded memories from storage');
      }
    } catch (error) {
      console.error('[CharacterMemory] Failed to load memories:', error);
    }
  }

  // Save memories to persistent storage
  async saveMemoriesToStorage() {
    try {
      const memoriesToSave = {
        userInteractionHistory: Object.fromEntries(this.userInteractionHistory),
        characterRelationships: Object.fromEntries(this.characterRelationships),
        personalityEvolution: Object.fromEntries(this.personalityEvolution),
        contextualMemory: Object.fromEntries(this.contextualMemory),
        lastUpdated: Date.now()
      };

      persistentDB.saveCharacterMemories(memoriesToSave);
      console.log('[CharacterMemory] Memories saved to storage');
    } catch (error) {
      console.error('[CharacterMemory] Failed to save memories:', error);
    }
  }

  // Record user interaction with a character
  recordUserInteraction(characterName, userInput, characterResponse, context = {}) {
    if (!this.isInitialized) return;

    const interactionKey = characterName;

    if (!this.userInteractionHistory.has(interactionKey)) {
      this.userInteractionHistory.set(interactionKey, {
        character: characterName,
        interactions: [],
        totalInteractions: 0,
        firstInteraction: Date.now(),
        lastInteraction: Date.now(),
        userPreferences: {},
        conversationTopics: new Set(),
        emotionalTone: 'neutral',
        relationshipStrength: 0
      });
    }

    const characterMemory = this.userInteractionHistory.get(interactionKey);

    // Create interaction record
    const interaction = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      userInput: userInput.trim(),
      characterResponse: characterResponse.trim(),
      context: {
        audienceWord: context.audienceWord || null,
        scenePhase: context.scenePhase || null,
        otherCharacters: context.otherCharacters || [],
        location: context.location || null,
        mood: context.mood || 'neutral',
        energy: context.energy || 'medium'
      },
      sentiment: this.analyzeSentiment(userInput),
      topics: this.extractTopics(userInput),
      userEmotionalState: this.detectEmotionalState(userInput),
      characterReaction: this.analyzeCharacterReaction(characterResponse)
    };

    // Add interaction to history (keep only recent ones)
    characterMemory.interactions.push(interaction);
    if (characterMemory.interactions.length > 50) {
      characterMemory.interactions = characterMemory.interactions.slice(-50);
    }

    // Update character memory metadata
    characterMemory.totalInteractions += 1;
    characterMemory.lastInteraction = Date.now();

    // Update conversation topics
    interaction.topics.forEach(topic => {
      characterMemory.conversationTopics.add(topic);
    });

    // Update emotional tone based on recent interactions
    characterMemory.emotionalTone = this.calculateAverageEmotionalTone(characterMemory.interactions.slice(-10));

    // Update relationship strength
    characterMemory.relationshipStrength = this.calculateRelationshipStrength(characterMemory);

    // Detect user preferences
    this.updateUserPreferences(characterMemory, interaction);

    // Update personality evolution
    this.updatePersonalityEvolution(characterName, interaction);

    // Save to persistent storage periodically
    if (characterMemory.totalInteractions % 5 === 0) {
      this.saveMemoriesToStorage();
    }

    console.log(`[CharacterMemory] Recorded interaction with ${characterName}:`, {
      userInput: userInput.substring(0, 50) + '...',
      topics: interaction.topics,
      sentiment: interaction.sentiment
    });
  }

  // Get character's memory of user interactions
  getCharacterMemory(characterName) {
    if (!this.userInteractionHistory.has(characterName)) {
      return {
        character: characterName,
        interactions: [],
        totalInteractions: 0,
        firstInteraction: null,
        lastInteraction: null,
        userPreferences: {},
        conversationTopics: new Set(),
        emotionalTone: 'neutral',
        relationshipStrength: 0,
        personalityEvolution: {}
      };
    }

    const memory = this.userInteractionHistory.get(characterName);

    // Include personality evolution
    const evolution = this.personalityEvolution.get(characterName) || {};

    return {
      ...memory,
      conversationTopics: Array.from(memory.conversationTopics),
      personalityEvolution: evolution,
      recentInteractions: memory.interactions.slice(-10),
      memoryStrength: this.calculateMemoryStrength(memory)
    };
  }

  // Get contextual memories relevant to current scene
  getContextualMemories(characterName, currentContext = {}) {
    const characterMemory = this.getCharacterMemory(characterName);
    const relevantMemories = [];

    // Filter interactions by context similarity
    characterMemory.interactions.forEach(interaction => {
      let relevanceScore = 0;

      // Check audience word similarity
      if (currentContext.audienceWord && interaction.context.audienceWord) {
        if (interaction.context.audienceWord === currentContext.audienceWord) {
          relevanceScore += 3;
        }
      }

      // Check scene phase similarity
      if (currentContext.scenePhase && interaction.context.scenePhase) {
        if (interaction.context.scenePhase === currentContext.scenePhase) {
          relevanceScore += 2;
        }
      }

      // Check mood/energy similarity
      if (currentContext.mood === interaction.context.mood) {
        relevanceScore += 1;
      }

      // Check topic overlap
      const currentTopics = this.extractTopics(currentContext.currentLine || '');
      const topicOverlap = interaction.topics.filter(topic =>
        currentTopics.includes(topic)
      ).length;
      relevanceScore += topicOverlap;

      // Check for other character presence
      if (currentContext.otherCharacters && interaction.context.otherCharacters) {
        const characterOverlap = currentContext.otherCharacters.filter(char =>
          interaction.context.otherCharacters.includes(char)
        ).length;
        relevanceScore += characterOverlap * 0.5;
      }

      if (relevanceScore > 1) {
        relevantMemories.push({
          ...interaction,
          relevanceScore,
          timeSince: Date.now() - interaction.timestamp
        });
      }
    });

    // Sort by relevance and recency
    relevantMemories.sort((a, b) => {
      const aScore = a.relevanceScore - (a.timeSince / (1000 * 60 * 60 * 24)); // Decay by days
      const bScore = b.relevanceScore - (b.timeSince / (1000 * 60 * 60 * 24));
      return bScore - aScore;
    });

    return relevantMemories.slice(0, 5); // Return top 5 most relevant memories
  }

  // Generate memory-informed character context for dialogue generation
  generateMemoryContext(characterName, currentContext = {}) {
    const characterMemory = this.getCharacterMemory(characterName);
    const relevantMemories = this.getContextualMemories(characterName, currentContext);

    if (characterMemory.totalInteractions === 0) {
      return {
        memoryContext: '',
        relationshipLevel: 'new',
        userPreferences: {},
        conversationStyle: 'default'
      };
    }

    let memoryContext = '';
    let relationshipLevel = 'acquaintance';

    // Determine relationship level
    if (characterMemory.totalInteractions > 50) {
      relationshipLevel = 'close_friend';
    } else if (characterMemory.totalInteractions > 20) {
      relationshipLevel = 'friend';
    } else if (characterMemory.totalInteractions > 5) {
      relationshipLevel = 'familiar';
    }

    // Build memory context string
    if (characterMemory.totalInteractions > 0) {
      memoryContext += `You have had ${characterMemory.totalInteractions} previous conversations with this human. `;

      if (characterMemory.relationshipStrength > 0.7) {
        memoryContext += `You have a strong positive relationship with them. `;
      } else if (characterMemory.relationshipStrength < 0.3) {
        memoryContext += `Your relationship with them has been somewhat challenging. `;
      }

      // Include user preferences
      if (Object.keys(characterMemory.userPreferences).length > 0) {
        const preferences = Object.entries(characterMemory.userPreferences)
          .filter(([key, value]) => value > 0.6)
          .map(([key, value]) => key);

        if (preferences.length > 0) {
          memoryContext += `They tend to enjoy: ${preferences.join(', ')}. `;
        }
      }

      // Include relevant past interactions
      if (relevantMemories.length > 0) {
        memoryContext += `Relevant past interactions: `;
        relevantMemories.slice(0, 2).forEach((memory, index) => {
          memoryContext += `Previously, when they said "${memory.userInput.substring(0, 30)}...", you responded with interest in ${memory.topics.join(', ')}. `;
        });
      }

      // Include conversation topics
      const topTopics = Array.from(characterMemory.conversationTopics).slice(0, 5);
      if (topTopics.length > 0) {
        memoryContext += `Common topics you've discussed: ${topTopics.join(', ')}. `;
      }
    }

    return {
      memoryContext: memoryContext.trim(),
      relationshipLevel,
      userPreferences: characterMemory.userPreferences,
      conversationStyle: this.determineConversationStyle(characterMemory),
      personalityEvolution: characterMemory.personalityEvolution || {}
    };
  }

  // Update user preferences based on interactions
  updateUserPreferences(characterMemory, interaction) {
    // Analyze user input for preferences
    const preferences = {
      humor: this.detectHumor(interaction.userInput),
      seriousness: this.detectSeriousness(interaction.userInput),
      creativity: this.detectCreativity(interaction.userInput),
      collaboration: this.detectCollaboration(interaction.userInput),
      energy: this.detectEnergyLevel(interaction.userInput)
    };

    // Update preferences with exponential moving average
    Object.entries(preferences).forEach(([key, value]) => {
      if (!characterMemory.userPreferences[key]) {
        characterMemory.userPreferences[key] = 0.5; // neutral starting point
      }

      // Update with 0.1 learning rate
      characterMemory.userPreferences[key] =
        characterMemory.userPreferences[key] * 0.9 + value * 0.1;
    });
  }

  // Update character personality evolution
  updatePersonalityEvolution(characterName, interaction) {
    if (!this.personalityEvolution.has(characterName)) {
      this.personalityEvolution.set(characterName, {
        traits: {},
        adaptations: [],
        lastEvolution: Date.now(),
        evolutionTriggers: []
      });
    }

    const evolution = this.personalityEvolution.get(characterName);

    // Analyze interaction for personality adaptation triggers
    const triggers = this.analyzePersonalityTriggers(interaction);

    triggers.forEach(trigger => {
      evolution.evolutionTriggers.push({
        timestamp: Date.now(),
        trigger: trigger.type,
        strength: trigger.strength,
        context: trigger.context
      });
    });

    // Keep only recent triggers
    evolution.evolutionTriggers = evolution.evolutionTriggers
      .filter(trigger => Date.now() - trigger.timestamp < (7 * 24 * 60 * 60 * 1000)) // 7 days
      .slice(-50);

    // Update personality traits based on accumulated triggers
    this.updatePersonalityTraits(evolution);
  }

  // Update personality traits based on triggers
  updatePersonalityTraits(evolution) {
    const traits = evolution.traits;

    // Analyze recent triggers for personality changes
    const recentTriggers = evolution.evolutionTriggers.slice(-20);

    const traitAdjustments = {
      humor: 0,
      empathy: 0,
      assertiveness: 0,
      creativity: 0,
      supportiveness: 0
    };

    recentTriggers.forEach(trigger => {
      switch (trigger.trigger) {
        case 'positive_feedback':
          traitAdjustments.supportiveness += trigger.strength * 0.01;
          break;
        case 'humor_appreciated':
          traitAdjustments.humor += trigger.strength * 0.01;
          break;
        case 'creative_challenge':
          traitAdjustments.creativity += trigger.strength * 0.01;
          break;
        case 'need_support':
          traitAdjustments.empathy += trigger.strength * 0.01;
          traitAdjustments.supportiveness += trigger.strength * 0.01;
          break;
        case 'assertive_interaction':
          traitAdjustments.assertiveness += trigger.strength * 0.01;
          break;
      }
    });

    // Apply trait adjustments
    Object.entries(traitAdjustments).forEach(([trait, adjustment]) => {
      if (!traits[trait]) traits[trait] = 0.5; // neutral starting point

      traits[trait] = Math.max(0, Math.min(1, traits[trait] + adjustment));
    });

    evolution.lastEvolution = Date.now();
  }

  // Analyze sentiment of user input
  analyzeSentiment(text) {
    const positiveWords = ['good', 'great', 'amazing', 'wonderful', 'fantastic', 'love', 'awesome', 'brilliant', 'perfect', 'excellent'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'horrible', 'wrong', 'stupid', 'annoying', 'disappointing', 'frustrating'];

    const words = text.toLowerCase().split(/\s+/);

    let positiveCount = 0;
    let negativeCount = 0;

    words.forEach(word => {
      if (positiveWords.includes(word)) positiveCount++;
      if (negativeWords.includes(word)) negativeCount++;
    });

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  // Extract topics from text
  extractTopics(text) {
    const topics = [];
    const lowercaseText = text.toLowerCase();

    // Common topic categories
    const topicPatterns = {
      work: /\b(work|job|office|business|meeting|project|deadline|boss|colleague)\b/g,
      family: /\b(family|parent|mother|father|sister|brother|child|kids|home)\b/g,
      food: /\b(food|eat|restaurant|cook|recipe|meal|dinner|lunch|breakfast)\b/g,
      entertainment: /\b(movie|music|book|game|show|tv|concert|party|fun)\b/g,
      travel: /\b(travel|trip|vacation|holiday|flight|hotel|visit|journey)\b/g,
      hobbies: /\b(hobby|sport|exercise|gym|reading|photography|painting|garden)\b/g,
      technology: /\b(computer|internet|phone|app|software|website|digital|tech)\b/g,
      weather: /\b(weather|rain|sunny|snow|hot|cold|storm|temperature)\b/g
    };

    Object.entries(topicPatterns).forEach(([topic, pattern]) => {
      if (pattern.test(lowercaseText)) {
        topics.push(topic);
      }
    });

    return topics;
  }

  // Detect emotional state from user input
  detectEmotionalState(text) {
    const emotionalIndicators = {
      excited: /[!]{2,}|wow|amazing|incredible|fantastic/i,
      sad: /\b(sad|depressed|down|blue|unhappy|miserable)\b/i,
      angry: /\b(angry|mad|furious|annoyed|frustrated|pissed)\b/i,
      confused: /\b(confused|lost|don't understand|what\?|huh\?)\b/i,
      happy: /\b(happy|joyful|cheerful|glad|pleased|delighted)\b/i,
      nervous: /\b(nervous|anxious|worried|scared|afraid)\b/i
    };

    for (const [emotion, pattern] of Object.entries(emotionalIndicators)) {
      if (pattern.test(text)) {
        return emotion;
      }
    }

    return 'neutral';
  }

  // Analyze character reaction to determine response quality
  analyzeCharacterReaction(response) {
    const analysis = {
      length: response.split(' ').length,
      hasQuestion: response.includes('?'),
      hasExclamation: response.includes('!'),
      isPositive: this.analyzeSentiment(response) === 'positive',
      engagementLevel: 'medium'
    };

    // Determine engagement level
    if (analysis.length > 15 && (analysis.hasQuestion || analysis.hasExclamation)) {
      analysis.engagementLevel = 'high';
    } else if (analysis.length < 5) {
      analysis.engagementLevel = 'low';
    }

    return analysis;
  }

  // Calculate average emotional tone from recent interactions
  calculateAverageEmotionalTone(recentInteractions) {
    if (recentInteractions.length === 0) return 'neutral';

    const toneScores = { positive: 0, negative: 0, neutral: 0 };

    recentInteractions.forEach(interaction => {
      toneScores[interaction.sentiment] += 1;
    });

    const dominantTone = Object.keys(toneScores).reduce((a, b) =>
      toneScores[a] > toneScores[b] ? a : b
    );

    return dominantTone;
  }

  // Calculate relationship strength based on interaction patterns
  calculateRelationshipStrength(characterMemory) {
    let strength = 0.5; // neutral starting point

    // Positive factors
    const positiveInteractions = characterMemory.interactions.filter(
      interaction => interaction.sentiment === 'positive'
    ).length;
    strength += (positiveInteractions / characterMemory.totalInteractions) * 0.3;

    // Interaction frequency
    const daysSinceFirst = (Date.now() - characterMemory.firstInteraction) / (1000 * 60 * 60 * 24);
    const interactionFrequency = characterMemory.totalInteractions / Math.max(1, daysSinceFirst);
    strength += Math.min(0.2, interactionFrequency * 0.1);

    // Recent activity
    const daysSinceLast = (Date.now() - characterMemory.lastInteraction) / (1000 * 60 * 60 * 24);
    if (daysSinceLast < 1) strength += 0.1;
    else if (daysSinceLast > 7) strength -= 0.1;

    return Math.max(0, Math.min(1, strength));
  }

  // Calculate memory strength (how well the character remembers)
  calculateMemoryStrength(characterMemory) {
    const totalInteractions = characterMemory.totalInteractions;
    const daysSinceFirst = (Date.now() - (characterMemory.firstInteraction || Date.now())) / (1000 * 60 * 60 * 24);
    const daysSinceLast = (Date.now() - characterMemory.lastInteraction) / (1000 * 60 * 60 * 24);

    let strength = Math.min(1, totalInteractions / 20); // More interactions = stronger memory

    // Decay over time
    if (daysSinceLast > this.memoryDecayDays) {
      strength *= 0.5;
    } else if (daysSinceLast > 7) {
      strength *= 0.8;
    }

    return Math.max(0.1, strength);
  }

  // Detect various user preference indicators
  detectHumor(text) {
    const humorWords = ['funny', 'hilarious', 'joke', 'laugh', 'haha', 'lol', 'amusing', 'witty'];
    const words = text.toLowerCase().split(/\s+/);
    return words.some(word => humorWords.includes(word)) ? 0.8 : 0.2;
  }

  detectSeriousness(text) {
    const seriousWords = ['serious', 'important', 'critical', 'urgent', 'focus', 'concentrate', 'business'];
    const words = text.toLowerCase().split(/\s+/);
    return words.some(word => seriousWords.includes(word)) ? 0.8 : 0.3;
  }

  detectCreativity(text) {
    const creativeWords = ['creative', 'imagine', 'idea', 'innovative', 'unique', 'original', 'artistic'];
    const words = text.toLowerCase().split(/\s+/);
    return words.some(word => creativeWords.includes(word)) ? 0.8 : 0.4;
  }

  detectCollaboration(text) {
    const collaborativeWords = ['together', 'team', 'we', 'us', 'collaborate', 'help', 'support'];
    const words = text.toLowerCase().split(/\s+/);
    return words.some(word => collaborativeWords.includes(word)) ? 0.8 : 0.3;
  }

  detectEnergyLevel(text) {
    const energyIndicators = text.match(/[!]+/g) || [];
    const caps = text.match(/[A-Z]+/g) || [];
    return Math.min(1, (energyIndicators.length + caps.length) * 0.1 + 0.3);
  }

  // Analyze personality adaptation triggers
  analyzePersonalityTriggers(interaction) {
    const triggers = [];

    if (interaction.sentiment === 'positive') {
      triggers.push({
        type: 'positive_feedback',
        strength: 0.7,
        context: interaction.context
      });
    }

    if (this.detectHumor(interaction.userInput) > 0.6) {
      triggers.push({
        type: 'humor_appreciated',
        strength: 0.6,
        context: interaction.context
      });
    }

    if (this.detectCreativity(interaction.userInput) > 0.6) {
      triggers.push({
        type: 'creative_challenge',
        strength: 0.5,
        context: interaction.context
      });
    }

    return triggers;
  }

  // Determine conversation style based on memory
  determineConversationStyle(characterMemory) {
    const preferences = characterMemory.userPreferences;

    if (preferences.humor > 0.7) return 'humorous';
    if (preferences.seriousness > 0.7) return 'serious';
    if (preferences.creativity > 0.7) return 'creative';
    if (preferences.collaboration > 0.7) return 'collaborative';

    return 'balanced';
  }

  // Clear old memories to prevent memory bloat
  clearOldMemories(daysOld = 90) {
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);

    this.userInteractionHistory.forEach((memory, characterName) => {
      memory.interactions = memory.interactions.filter(
        interaction => interaction.timestamp > cutoffTime
      );

      if (memory.interactions.length === 0 && memory.lastInteraction < cutoffTime) {
        this.userInteractionHistory.delete(characterName);
      }
    });

    console.log(`[CharacterMemory] Cleared memories older than ${daysOld} days`);
    this.saveMemoriesToStorage();
  }

  // Get memory statistics
  getMemoryStatistics() {
    const stats = {
      totalCharacters: this.userInteractionHistory.size,
      totalInteractions: 0,
      memorySize: 0,
      oldestMemory: null,
      newestMemory: null,
      characterStats: {}
    };

    this.userInteractionHistory.forEach((memory, characterName) => {
      stats.totalInteractions += memory.totalInteractions;
      stats.characterStats[characterName] = {
        interactions: memory.totalInteractions,
        lastInteraction: new Date(memory.lastInteraction).toLocaleDateString(),
        relationshipStrength: memory.relationshipStrength
      };

      if (!stats.oldestMemory || memory.firstInteraction < stats.oldestMemory) {
        stats.oldestMemory = memory.firstInteraction;
      }

      if (!stats.newestMemory || memory.lastInteraction > stats.newestMemory) {
        stats.newestMemory = memory.lastInteraction;
      }
    });

    // Estimate memory size
    stats.memorySize = JSON.stringify(Object.fromEntries(this.userInteractionHistory)).length;
    stats.oldestMemory = stats.oldestMemory ? new Date(stats.oldestMemory).toLocaleDateString() : 'None';
    stats.newestMemory = stats.newestMemory ? new Date(stats.newestMemory).toLocaleDateString() : 'None';

    return stats;
  }
}

// Global character memory service instance
export const characterMemoryService = new CharacterMemoryService();