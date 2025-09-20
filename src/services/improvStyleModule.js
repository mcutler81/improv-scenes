import axios from 'axios';
import { persistentDB } from './persistentDatabase';

export class ImprovStyleModule {
  constructor(config = {}) {
    this.style = config.style || 'UCB';
    this.performanceLength = config.performanceLength || { min: 4, max: 8 };
    this.stageSetting = config.stageSetting || 'small_stage';
    this.sceneStructure = this.initializeSceneStructure();
    this.characterDevelopment = this.initializeCharacterDevelopment();
    this.narrativeProgression = this.initializeNarrativeProgression();
    this.humorTechniques = this.initializeHumorTechniques();
  }

  initializeSceneStructure() {
    return {
      opening: {
        techniques: ['establishing location', 'creating relationships'],
        objectives: ['set the scene', 'introduce characters', 'establish tone'],
        timing: '20-30% of scene'
      },
      development: {
        techniques: ['heightening', 'exploring relationships'],
        objectives: ['build conflict', 'deepen character dynamics', 'add complexity'],
        timing: '40-50% of scene'
      },
      climax: {
        techniques: ['conflict', 'peak action'],
        objectives: ['maximum tension', 'decisive moment', 'character revelation'],
        timing: '15-20% of scene'
      },
      resolution: {
        techniques: ['closure', 'resolving tensions'],
        objectives: ['wrap up conflicts', 'character growth', 'satisfying ending'],
        timing: '10-15% of scene'
      }
    };
  }

  initializeCharacterDevelopment() {
    return {
      creation: {
        techniques: ['strong choices', 'unique traits'],
        guidelines: ['commit to character voice', 'establish clear motivation', 'create distinct physicality']
      },
      development: {
        techniques: ['evolving objectives', 'relationships'],
        guidelines: ['react authentically', 'build on partner choices', 'maintain consistency']
      }
    };
  }

  initializeNarrativeProgression() {
    return {
      advancement: {
        techniques: ['adding information', 'escalation'],
        principles: ['yes, and...', 'build on offers', 'raise the stakes']
      },
      coherence: {
        techniques: ['callback', 'continuity'],
        principles: ['remember details', 'connect elements', 'maintain logic']
      }
    };
  }

  initializeHumorTechniques() {
    return {
      timing: {
        techniques: ['pauses', 'reaction shots'],
        methods: ['beat work', 'silence for effect', 'physical comedy timing']
      },
      wordplay: {
        techniques: ['puns', 'misdirection'],
        methods: ['double meanings', 'unexpected interpretations', 'language games']
      },
      situational: {
        techniques: ['irony', 'exaggeration'],
        methods: ['absurd logic', 'character contradictions', 'escalating situations']
      }
    };
  }

  // Determine current scene phase based on line count and total expected lines
  getCurrentScenePhase(currentLines, totalExpectedLines) {
    const progress = currentLines / totalExpectedLines;

    if (progress <= 0.3) return 'opening';
    if (progress <= 0.8) return 'development';
    if (progress <= 0.95) return 'climax';
    return 'resolution';
  }

  // Get appropriate techniques for current scene phase
  getTechniquesForPhase(phase) {
    return this.sceneStructure[phase] || this.sceneStructure.development;
  }

  // Analyze scene context and suggest next direction
  async suggestSceneDirection(sceneState, dialogue) {
    const currentPhase = this.getCurrentScenePhase(
      sceneState.totalLines,
      sceneState.expectedTotalLines || 12
    );

    const phaseInfo = this.getTechniquesForPhase(currentPhase);
    const lastFewLines = dialogue.slice(-3);

    // Generate contextual suggestions based on current phase
    const suggestions = {
      phase: currentPhase,
      techniques: phaseInfo.techniques,
      objectives: phaseInfo.objectives,
      recommendations: await this.generatePhaseRecommendations(currentPhase, sceneState, lastFewLines)
    };

    return suggestions;
  }

  // Generate AI-powered recommendations for scene direction
  async generatePhaseRecommendations(phase, sceneState, recentDialogue) {
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
    if (!apiKey) {
      return this.getFallbackRecommendations(phase);
    }

    const phaseInfo = this.sceneStructure[phase];
    const recentText = recentDialogue.map(line => `${line.speaker}: "${line.text}"`).join('\n');

    const prompt = `As an expert UCB-style improv coach, analyze this scene in the ${phase} phase:

Recent dialogue:
${recentText}

Scene context:
- Energy: ${sceneState.sceneContext?.energy || 'medium'}
- Mood: ${sceneState.sceneContext?.mood || 'neutral'}
- Location: ${sceneState.sceneContext?.location || 'unknown'}

Phase objectives: ${phaseInfo.objectives.join(', ')}
Recommended techniques: ${phaseInfo.techniques.join(', ')}

Provide 2-3 specific, actionable suggestions for how to advance this scene using UCB principles.
Focus on "yes, and..." building, character development, and ${phase} phase goals.

Respond with a JSON array of suggestion strings.`;

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4',
          messages: [
            { role: 'system', content: 'You are an expert UCB improv coach. Respond only with valid JSON.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 200,
          temperature: 0.8
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 8000
        }
      );

      const suggestions = JSON.parse(response.data.choices[0].message.content.trim());
      return Array.isArray(suggestions) ? suggestions : this.getFallbackRecommendations(phase);
    } catch (error) {
      console.warn('Could not generate AI recommendations:', error.message);
      return this.getFallbackRecommendations(phase);
    }
  }

  // Fallback recommendations when AI is unavailable
  getFallbackRecommendations(phase) {
    const fallbackSuggestions = {
      opening: [
        'Establish where we are and what the characters are doing',
        'Create a clear relationship between the characters',
        'Set up a potential conflict or interesting dynamic'
      ],
      development: [
        'Heighten the established dynamic or conflict',
        'Explore character motivations and reactions',
        'Add new information that complicates the situation'
      ],
      climax: [
        'Bring the conflict to its peak intensity',
        'Force characters to make important decisions',
        'Create a moment of truth or revelation'
      ],
      resolution: [
        'Address the main conflict or tension',
        'Show character growth or change',
        'Provide a satisfying conclusion to the scene'
      ]
    };

    return fallbackSuggestions[phase] || fallbackSuggestions.development;
  }
}

export class FindUnusualComponent {
  constructor() {
    this.unusualThing = null;
    this.heighteningStrategy = this.initializeHeighteningStrategy();
  }

  initializeHeighteningStrategy() {
    return {
      exaggeration: {
        technique: 'amplify the absurdity',
        methods: ['make it bigger', 'make it more extreme', 'add ridiculous details']
      },
      expansion: {
        technique: 'explore broader implications',
        methods: ['what else would this affect?', 'how would others react?', 'what are the consequences?']
      },
      callback: {
        technique: 'refer back to the unusual thing in new contexts',
        methods: ['bring it up again differently', 'connect to new situations', 'use as running gag']
      }
    };
  }

  // Analyze dialogue to identify unusual or absurd elements
  identifyUnusualThing(dialogue, sceneContext) {
    if (dialogue.length < 2) return null;

    // Look for potential unusual things in recent dialogue
    const recentLines = dialogue.slice(-5);
    const unusualElements = [];

    recentLines.forEach(line => {
      const text = line.text.toLowerCase();

      // Check for absurd statements, contradictions, or unusual concepts
      if (this.containsUnusualElement(text)) {
        unusualElements.push({
          speaker: line.speaker,
          text: line.text,
          unusualness: this.calculateUnusualness(text),
          line: line
        });
      }
    });

    // Select the most unusual element
    if (unusualElements.length > 0) {
      const mostUnusual = unusualElements.reduce((prev, current) =>
        prev.unusualness > current.unusualness ? prev : current
      );

      this.unusualThing = {
        element: mostUnusual.text,
        speaker: mostUnusual.speaker,
        context: mostUnusual.line,
        unusualness: mostUnusual.unusualness
      };
    }

    return this.unusualThing;
  }

  // Check if text contains unusual elements
  containsUnusualElement(text) {
    const unusualIndicators = [
      // Absurd actions or statements
      /suddenly|randomly|inexplicably|for no reason/,
      // Contradictions or impossible things
      /but I'm|however|although|despite|even though.*not/,
      // Extreme emotions or reactions
      /obsessed|terrified|ecstatic|furious.*about.*\w{1,6}$/,
      // Non sequiturs or random topics
      /speaking of|by the way.*completely different/,
      // Physical impossibilities
      /floating|flying.*without|upside.*down|backwards/
    ];

    return unusualIndicators.some(pattern => pattern.test(text));
  }

  // Calculate how unusual something is (0-100)
  calculateUnusualness(text) {
    let score = 0;

    // Length penalty for overly complex statements
    if (text.length > 100) score += 10;

    // Bonus for contradictions
    if (/but|however|although/.test(text)) score += 20;

    // Bonus for extreme language
    if (/never|always|completely|totally|absolutely/.test(text)) score += 15;

    // Bonus for random topics
    if (/suddenly|randomly|inexplicably/.test(text)) score += 25;

    // Bonus for emotional extremes
    if (/love|hate|obsessed|terrified|ecstatic/.test(text)) score += 15;

    return Math.min(score, 100);
  }

  // Apply heightening strategies to the unusual thing
  heightenUnusualThing(strategy = 'exaggeration') {
    if (!this.unusualThing) return null;

    const strategyInfo = this.heighteningStrategy[strategy];
    if (!strategyInfo) return null;

    return {
      original: this.unusualThing.element,
      strategy: strategy,
      technique: strategyInfo.technique,
      methods: strategyInfo.methods,
      suggestion: `Try ${strategyInfo.technique} with "${this.unusualThing.element}"`
    };
  }

  // Generate a response that heightens the unusual thing
  async generateHeighteningResponse(partnerInput, unusualThing) {
    const heighteningOptions = Object.keys(this.heighteningStrategy);
    const selectedStrategy = heighteningOptions[Math.floor(Math.random() * heighteningOptions.length)];

    return {
      strategy: selectedStrategy,
      unusualThing: unusualThing.element,
      heighteningAdvice: this.heightenUnusualThing(selectedStrategy),
      response: `Focus on ${this.heighteningStrategy[selectedStrategy].technique} related to: "${unusualThing.element}"`
    };
  }
}

// Global instances
export const improvStyleModule = new ImprovStyleModule();
export const findUnusualComponent = new FindUnusualComponent();