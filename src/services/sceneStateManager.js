import { analyzeSceneContext } from './supervisorAgent';
import { improvStyleModule, findUnusualComponent } from './improvStyleModule';
import { patternGame } from './patternGame';

export class SceneStateManager {
  constructor(characters, audienceWord) {
    this.characters = characters;
    this.audienceWord = audienceWord;
    this.reset();
  }

  reset() {
    this.dialogue = [];
    this.totalLines = 0;
    this.lastSpeaker = null;
    this.sceneContext = {
      energy: 'building',
      mood: 'neutral',
      location: `somewhere related to ${this.audienceWord}`,
      themes: [this.audienceWord],
      relationships: {}
    };

    // UCB-style improv tracking
    this.improvContext = {
      unusualThings: [],
      heighteningOpportunities: [],
      patternGameElements: {
        wordAssociations: [],
        conceptualLeaps: [],
        callbacks: []
      },
      sceneDirection: null,
      currentPhaseObjectives: []
    };

    // Track each character's participation
    this.characterStats = {};
    this.characters.forEach(char => {
      this.characterStats[char.name] = {
        turnCount: 0,
        wordCount: 0,
        lastSpoke: null,
        relationships: {}, // How this character relates to others
        emotionalState: 'neutral', // Current emotional state
        sceneRole: 'supporting' // main, supporting, comic-relief, etc.
      };
    });

    // Scene progression tracking
    this.scenePhase = 'setup'; // setup, development, climax, resolution
    this.dramaticBeats = [];
    this.establishedElements = {
      location: false,
      conflict: false,
      relationships: false,
      theme: false
    };
  }

  addDialogue(speaker, text) {
    const dialogueEntry = {
      speaker: speaker.name,
      text: text,
      timestamp: Date.now(),
      wordCount: text.split(' ').length,
      lineNumber: this.totalLines + 1
    };

    this.dialogue.push(dialogueEntry);
    this.totalLines += 1;
    this.lastSpeaker = speaker.name;

    // Update character stats
    const charStats = this.characterStats[speaker.name];
    charStats.turnCount += 1;
    charStats.wordCount += dialogueEntry.wordCount;
    charStats.lastSpoke = Date.now();

    // Update scene context based on new dialogue
    this.updateSceneContext();

    // Detect dramatic beats
    this.detectDramaticBeats(dialogueEntry);

    // Update scene phase
    this.updateScenePhase();

    // UCB-style improv analysis
    this.updateImprovContext(dialogueEntry);

    return dialogueEntry;
  }

  updateSceneContext() {
    // Re-analyze the scene context based on all dialogue
    this.sceneContext = analyzeSceneContext(this.dialogue, this.audienceWord);

    // Enhanced context analysis
    this.analyzeCharacterRelationships();
    this.analyzeEstablishedElements();
    this.updateCharacterEmotionalStates();
  }

  analyzeCharacterRelationships() {
    // Track which characters have interacted and how
    for (let i = 0; i < this.dialogue.length - 1; i++) {
      const currentLine = this.dialogue[i];
      const nextLine = this.dialogue[i + 1];

      if (currentLine.speaker !== nextLine.speaker) {
        const speaker1 = currentLine.speaker;
        const speaker2 = nextLine.speaker;

        // Initialize relationship tracking
        if (!this.characterStats[speaker1].relationships[speaker2]) {
          this.characterStats[speaker1].relationships[speaker2] = {
            interactions: 0,
            tone: 'neutral', // positive, negative, neutral, comedic
            lastInteraction: null
          };
        }

        if (!this.characterStats[speaker2].relationships[speaker1]) {
          this.characterStats[speaker2].relationships[speaker1] = {
            interactions: 0,
            tone: 'neutral',
            lastInteraction: null
          };
        }

        // Update interaction count
        this.characterStats[speaker1].relationships[speaker2].interactions += 1;
        this.characterStats[speaker2].relationships[speaker1].interactions += 1;

        // Analyze tone of interaction (simplified)
        const combinedText = (currentLine.text + ' ' + nextLine.text).toLowerCase();
        let tone = 'neutral';

        if (combinedText.includes('!') && (combinedText.includes('no') || combinedText.includes('wrong'))) {
          tone = 'negative';
        } else if (combinedText.includes('yes') || combinedText.includes('great') || combinedText.includes('love')) {
          tone = 'positive';
        } else if (combinedText.includes('haha') || combinedText.includes('funny') || combinedText.includes('silly')) {
          tone = 'comedic';
        }

        this.characterStats[speaker1].relationships[speaker2].tone = tone;
        this.characterStats[speaker1].relationships[speaker2].lastInteraction = Date.now();
      }
    }
  }

  analyzeEstablishedElements() {
    const allText = this.dialogue.map(line => line.text).join(' ').toLowerCase();

    // Check what scene elements have been established
    const locationWords = ['here', 'this place', 'at the', 'in the', 'factory', 'store', 'office', 'restaurant'];
    this.establishedElements.location = locationWords.some(word => allText.includes(word));

    const conflictWords = ['problem', 'wrong', 'disagree', 'fight', 'argue', 'but', 'however'];
    this.establishedElements.conflict = conflictWords.some(word => allText.includes(word));

    const relationshipWords = ['friend', 'partner', 'colleague', 'together', 'we', 'us', 'team'];
    this.establishedElements.relationships = relationshipWords.some(word => allText.includes(word));

    this.establishedElements.theme = allText.includes(this.audienceWord.toLowerCase());
  }

  updateCharacterEmotionalStates() {
    // Analyze recent dialogue for each character's emotional state
    this.characters.forEach(char => {
      const recentLines = this.dialogue
        .filter(line => line.speaker === char.name)
        .slice(-2); // Last 2 lines from this character

      if (recentLines.length === 0) {
        this.characterStats[char.name].emotionalState = 'neutral';
        return;
      }

      const recentText = recentLines.map(line => line.text).join(' ').toLowerCase();

      // Simple emotional analysis
      let emotionalState = 'neutral';

      if (recentText.includes('!') && recentText.split('!').length > 2) {
        emotionalState = 'excited';
      } else if (recentText.includes('?') && recentText.split('?').length > 1) {
        emotionalState = 'questioning';
      } else if (['angry', 'mad', 'frustrated', 'annoyed'].some(word => recentText.includes(word))) {
        emotionalState = 'angry';
      } else if (['happy', 'great', 'wonderful', 'amazing'].some(word => recentText.includes(word))) {
        emotionalState = 'happy';
      } else if (['sad', 'terrible', 'awful', 'disappointed'].some(word => recentText.includes(word))) {
        emotionalState = 'sad';
      } else if (['funny', 'hilarious', 'joke', 'laugh'].some(word => recentText.includes(word))) {
        emotionalState = 'comedic';
      }

      this.characterStats[char.name].emotionalState = emotionalState;
    });
  }

  detectDramaticBeats(dialogueEntry) {
    // Detect significant moments in the scene
    const text = dialogueEntry.text.toLowerCase();

    // Major revelation or discovery
    if (text.includes('wait') || text.includes('actually') || text.includes('realize')) {
      this.dramaticBeats.push({
        type: 'revelation',
        line: this.totalLines,
        speaker: dialogueEntry.speaker,
        timestamp: Date.now()
      });
    }

    // Conflict escalation
    if (text.includes('no!') || text.includes('wrong') || text.includes('stop')) {
      this.dramaticBeats.push({
        type: 'conflict',
        line: this.totalLines,
        speaker: dialogueEntry.speaker,
        timestamp: Date.now()
      });
    }

    // Comedy beat
    if (text.includes('!') && (text.includes('ridiculous') || text.includes('silly') || text.includes('funny'))) {
      this.dramaticBeats.push({
        type: 'comedy',
        line: this.totalLines,
        speaker: dialogueEntry.speaker,
        timestamp: Date.now()
      });
    }
  }

  updateScenePhase() {
    // Determine what phase of the scene we're in
    if (this.totalLines <= 2) {
      this.scenePhase = 'setup';
    } else if (this.totalLines <= Math.floor(this.getTargetSceneLength() * 0.7)) {
      this.scenePhase = 'development';
    } else if (this.totalLines <= Math.floor(this.getTargetSceneLength() * 0.9)) {
      this.scenePhase = 'climax';
    } else {
      this.scenePhase = 'resolution';
    }
  }

  getTargetSceneLength() {
    // Get target scene length from settings, default to 12
    const savedSettings = localStorage.getItem('improv-dialogue-settings');
    const settings = savedSettings ? JSON.parse(savedSettings) : { sceneLength: 12 };
    return settings.sceneLength || 12;
  }

  // Get characters who haven't spoken recently
  getUnderutilizedCharacters() {
    const avgTurns = this.totalLines / this.characters.length;
    return this.characters.filter(char => {
      const turnCount = this.characterStats[char.name].turnCount;
      return turnCount < avgTurns * 0.7; // Characters with < 70% of average turns
    });
  }

  // Get characters who've spoken too much recently
  getOverutilizedCharacters() {
    const avgTurns = this.totalLines / this.characters.length;
    return this.characters.filter(char => {
      const turnCount = this.characterStats[char.name].turnCount;
      return turnCount > avgTurns * 1.3; // Characters with > 130% of average turns
    });
  }

  // Get ideal next speaker based on participation balance
  getSuggestedNextSpeakers() {
    const underutilized = this.getUnderutilizedCharacters();
    if (underutilized.length > 0) {
      return underutilized;
    }

    // If no one is underutilized, suggest anyone except the last speaker
    return this.characters.filter(char => char.name !== this.lastSpeaker);
  }

  // Check if scene needs energy/pacing changes
  needsPacingChange() {
    // If same character spoke multiple times recently
    const lastThreeLines = this.dialogue.slice(-3);
    if (lastThreeLines.length >= 2) {
      const speakers = lastThreeLines.map(line => line.speaker);
      if (speakers.every(speaker => speaker === speakers[0])) {
        return { type: 'too_much_same_speaker', suggestion: 'switch_speaker' };
      }
    }

    // If scene energy has been flat
    const recentEnergy = this.sceneContext.energy;
    if (recentEnergy === 'low' && this.totalLines > 4) {
      return { type: 'low_energy', suggestion: 'inject_energy' };
    }

    // If no conflict established by midpoint
    if (this.scenePhase === 'development' && !this.establishedElements.conflict) {
      return { type: 'needs_conflict', suggestion: 'create_tension' };
    }

    return null;
  }

  // UCB-style improv context analysis
  updateImprovContext(dialogueEntry) {
    // Identify unusual things for heightening
    const unusualThing = findUnusualComponent.identifyUnusualThing(this.dialogue, this.sceneContext);
    if (unusualThing && !this.improvContext.unusualThings.some(ut => ut.element === unusualThing.element)) {
      this.improvContext.unusualThings.push({
        ...unusualThing,
        identifiedAt: this.totalLines,
        heightened: false
      });
    }

    // Generate heightening opportunities
    if (this.improvContext.unusualThings.length > 0) {
      this.improvContext.heighteningOpportunities = this.improvContext.unusualThings
        .filter(ut => !ut.heightened)
        .map(ut => findUnusualComponent.heightenUnusualThing('exaggeration'));
    }

    // Extract pattern game elements
    const patterns = patternGame.extractPatternsFromDialogue(this.dialogue);
    if (patterns) {
      this.improvContext.patternGameElements = patterns;
    }

    // Get scene direction suggestions
    this.updateSceneDirection();

    // Update phase objectives
    this.updatePhaseObjectives();
  }

  // Update scene direction based on UCB principles
  async updateSceneDirection() {
    try {
      this.improvContext.sceneDirection = await improvStyleModule.suggestSceneDirection(
        this.getCurrentState(),
        this.dialogue
      );
    } catch (error) {
      console.warn('Could not update scene direction:', error.message);
      this.improvContext.sceneDirection = null;
    }
  }

  // Update current phase objectives
  updatePhaseObjectives() {
    const currentPhase = improvStyleModule.getCurrentScenePhase(
      this.totalLines,
      this.getTargetSceneLength()
    );

    const phaseInfo = improvStyleModule.getTechniquesForPhase(currentPhase);
    this.improvContext.currentPhaseObjectives = phaseInfo.objectives || [];
  }

  // Get heightening suggestions for current scene
  getHeighteningSuggestions() {
    if (this.improvContext.unusualThings.length === 0) return [];

    return this.improvContext.unusualThings.map(unusualThing => {
      const heighteningStrategy = findUnusualComponent.heightenUnusualThing();
      return {
        unusualElement: unusualThing.element,
        speaker: unusualThing.speaker,
        suggestion: heighteningStrategy?.suggestion || 'Continue exploring this unusual element',
        strategy: heighteningStrategy?.strategy || 'expansion'
      };
    });
  }

  // Get pattern game insights for dialogue generation
  getPatternGameInsights() {
    const patterns = this.improvContext.patternGameElements;
    if (!patterns) return null;

    return {
      suggestedCallbacks: patterns.callbacks?.slice(0, 3) || [],
      strongThemes: patterns.themes?.slice(0, 2) || [],
      recentLeaps: patterns.conceptualLeaps?.slice(-2) || [],
      connectionOpportunities: patterns.directConnections?.slice(-3) || []
    };
  }

  // Get UCB-style next speaker suggestions
  getUCBSpeakerSuggestions() {
    const suggestions = this.getSuggestedNextSpeakers();
    const phaseInfo = improvStyleModule.getTechniquesForPhase(this.scenePhase);

    return suggestions.map(character => {
      const charStats = this.characterStats[character.name];

      return {
        character,
        reasons: [
          `Participation balance (${charStats.turnCount} turns)`,
          `Current emotional state: ${charStats.emotionalState}`,
          `Phase objective: ${phaseInfo.objectives?.[0] || 'scene development'}`
        ],
        ucbTechniques: phaseInfo.techniques || [],
        heighteningOpportunity: this.getCharacterHeighteningOpportunity(character.name)
      };
    });
  }

  // Get specific heightening opportunity for a character
  getCharacterHeighteningOpportunity(characterName) {
    const unusualThings = this.improvContext.unusualThings.filter(
      ut => ut.speaker === characterName && !ut.heightened
    );

    if (unusualThings.length > 0) {
      return {
        element: unusualThings[0].element,
        suggestion: `Heighten: "${unusualThings[0].element}"`,
        strategy: 'exaggeration'
      };
    }

    return null;
  }

  // Mark an unusual thing as heightened
  markUnusualThingHeightened(element) {
    const unusualThing = this.improvContext.unusualThings.find(ut => ut.element === element);
    if (unusualThing) {
      unusualThing.heightened = true;
      unusualThing.heightenedAt = this.totalLines;
    }
  }

  // Get current scene state for supervisor
  getCurrentState() {
    return {
      audienceWord: this.audienceWord,
      dialogue: this.dialogue,
      totalLines: this.totalLines,
      lastSpeaker: this.lastSpeaker,
      characterStats: this.characterStats,
      sceneContext: this.sceneContext,
      scenePhase: this.scenePhase,
      establishedElements: this.establishedElements,
      dramaticBeats: this.dramaticBeats,
      pacingNeeds: this.needsPacingChange(),
      improvContext: this.improvContext,
      expectedTotalLines: this.getTargetSceneLength()
    };
  }
}