import axios from 'axios';
import { persistentDB } from './persistentDatabase';
import { improvStyleModule, findUnusualComponent } from './improvStyleModule';
import { patternGame } from './patternGame';

const defaultPromptTemplates = {
  firstLineInstructions: `You are STARTING the scene. ESTABLISH:
- WHERE we are (location related to "{audienceWord}")
- WHO you are in this scene (a character/role)
- WHAT is happening
Example: "Well, here we are at the {audienceWord} factory again..."`,

  secondLineInstructions: `{lastSpeaker} just said: "{lastLine}"
BUILD on their scene setup by:
- Accepting their WHERE/WHO/WHAT
- Adding more detail about the situation
- "Yes, and..." their idea`,

  continuationInstructions: `{lastSpeaker} just said: "{lastLine}"
Continue the conversation naturally, building on what was said.`,

  mainPromptTemplate: `You are {speakerName} doing improv comedy with {otherCharacterNames}.
The audience suggestion word is: "{audienceWord}"

Your personality: {personality}
Famous phrases you might reference: {catchphrases}

{promptInstructions}

Generate ONE short, funny line (max {maxWords} words) as {speakerName} that:
- {sceneInstructions}
- Incorporates "{audienceWord}" naturally
- Stays in character as {speakerName}
- Creates "Yes, and..." improv energy
- Could use one of your catchphrases if it fits naturally

Respond with ONLY the dialogue line, no quotes or attribution.`,

  systemPromptTemplate: `You are an expert improv comedian performing as {speakerName} with {otherCharacterNames}. Follow the "Yes, and..." rule - always accept what others say and build on it. Keep responses short, punchy, and in character. Make the conversation flow naturally in this 4-person scene.`,

  maxWords: 20,
  sceneEstablishText: 'Establishes the scene (who/what/where)',
  sceneBuildText: 'Builds on the established scene'
};

export async function generateDialogue(speaker, otherCharacters, audienceWord, previousDialogue, supervisorContext = null) {
  // Load dialogue settings from persistent database
  const settings = {
    maxTokens: 50,
    temperature: 0.9,
    ...persistentDB.getDialogueSettings()
  };

  // Get UCB-style improv context
  const improvContext = await buildImprovContext(speaker, previousDialogue, supervisorContext);

  // Load prompt templates from persistent database
  const promptTemplates = {
    ...defaultPromptTemplates,
    ...persistentDB.getPromptTemplates()
  };
  const lastLine = previousDialogue.length > 0
    ? previousDialogue[previousDialogue.length - 1].text
    : null;

  const isFirstLine = previousDialogue.length === 0;
  const isSecondLine = previousDialogue.length === 1;

  const otherCharacterNames = otherCharacters.map(char => char.name).join(', ');

  // Function to replace template variables
  const replaceTemplateVars = (template, vars) => {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return vars[key] !== undefined ? vars[key] : match;
    });
  };

  // Choose appropriate prompt instructions based on dialogue position
  let promptInstructions;
  if (isFirstLine) {
    promptInstructions = replaceTemplateVars(promptTemplates.firstLineInstructions, {
      audienceWord
    });
  } else if (isSecondLine) {
    const lastSpeaker = previousDialogue[previousDialogue.length - 1].speaker;
    promptInstructions = replaceTemplateVars(promptTemplates.secondLineInstructions, {
      lastSpeaker,
      lastLine
    });
  } else {
    const lastSpeaker = previousDialogue[previousDialogue.length - 1].speaker;
    promptInstructions = replaceTemplateVars(promptTemplates.continuationInstructions, {
      lastSpeaker,
      lastLine
    });
  }

  // Build enhanced prompt with supervisor context
  let enhancedPromptInstructions = promptInstructions;
  let additionalContext = '';

  if (supervisorContext) {
    // Add supervisor context to the prompt
    additionalContext += `\n\nScene Director's Note: ${supervisorContext.reason}`;
    if (supervisorContext.sceneNote) {
      additionalContext += `\nScene Direction: ${supervisorContext.sceneNote}`;
    }

    // Add scene state information
    if (supervisorContext.sceneState) {
      const state = supervisorContext.sceneState;
      additionalContext += `\nScene Context: Location is ${state.sceneContext.location}, energy is ${state.sceneContext.energy}, mood is ${state.sceneContext.mood}`;

      // Add character relationship context
      const charStats = state.characterStats[speaker.name];
      if (charStats && charStats.emotionalState !== 'neutral') {
        additionalContext += `\nYour Current Emotional State: ${charStats.emotionalState}`;
      }

      // Add participation context
      const underutilized = state.characterStats[speaker.name]?.turnCount < (state.totalLines / 4) * 0.7;
      if (underutilized) {
        additionalContext += `\nNote: You haven't spoken much yet - this is a good opportunity to establish your presence in the scene`;
      }
    }

    enhancedPromptInstructions += additionalContext;
  }

  // Add UCB-style improv context to prompt
  if (improvContext.ucbGuidance) {
    enhancedPromptInstructions += improvContext.ucbGuidance;
  }

  // Build the main prompt using the template
  const templateVars = {
    speakerName: speaker.name,
    otherCharacterNames,
    audienceWord,
    personality: speaker.personality,
    catchphrases: speaker.catchphrases.join(', '),
    promptInstructions: enhancedPromptInstructions,
    maxWords: promptTemplates.maxWords,
    sceneInstructions: isFirstLine ? promptTemplates.sceneEstablishText : promptTemplates.sceneBuildText
  };

  const prompt = replaceTemplateVars(promptTemplates.mainPromptTemplate, templateVars);

  // Build the system prompt
  const systemPrompt = replaceTemplateVars(promptTemplates.systemPromptTemplate, {
    speakerName: speaker.name,
    otherCharacterNames
  });

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: settings.maxTokens,
        temperature: settings.temperature
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating dialogue:', error);
    return `${speaker.catchphrases[0]} ...about ${audienceWord}!`;
  }
}

// Build UCB-style improv context for enhanced dialogue generation
async function buildImprovContext(speaker, previousDialogue, supervisorContext) {
  const improvContext = {
    ucbGuidance: '',
    patternGameInsights: null,
    heighteningOpportunities: [],
    scenePhase: 'development'
  };

  try {
    // Get current scene phase
    const currentPhase = improvStyleModule.getCurrentScenePhase(
      previousDialogue.length,
      12 // default scene length
    );
    improvContext.scenePhase = currentPhase;

    // Get phase-specific techniques
    const phaseInfo = improvStyleModule.getTechniquesForPhase(currentPhase);
    const phaseGuidance = `\n\nUCB ${currentPhase.toUpperCase()} Phase Techniques:
- ${phaseInfo.techniques.join(', ')}
- Objectives: ${phaseInfo.objectives.join(', ')}`;

    improvContext.ucbGuidance += phaseGuidance;

    // Identify unusual things for heightening
    if (previousDialogue.length >= 2) {
      const unusualThing = findUnusualComponent.identifyUnusualThing(
        previousDialogue,
        supervisorContext?.sceneState?.sceneContext || {}
      );

      if (unusualThing) {
        const heighteningStrategy = findUnusualComponent.heightenUnusualThing('exaggeration');
        improvContext.heighteningOpportunities.push({
          element: unusualThing.element,
          speaker: unusualThing.speaker,
          strategy: heighteningStrategy
        });

        improvContext.ucbGuidance += `\n\nHeightening Opportunity:
Consider exaggerating or building on: "${unusualThing.element}"
Strategy: ${heighteningStrategy?.technique || 'amplify the absurdity'}`;
      }
    }

    // Get pattern game insights
    if (previousDialogue.length >= 3) {
      const patterns = patternGame.extractPatternsFromDialogue(previousDialogue);
      if (patterns) {
        improvContext.patternGameInsights = patterns;

        // Add callback opportunities
        if (patterns.callbacks.length > 0) {
          const topCallback = patterns.callbacks[0];
          improvContext.ucbGuidance += `\n\nCallback Opportunity:
Consider referencing: "${topCallback.word}" (appeared ${topCallback.occurrences} times)`;
        }

        // Add thematic connections
        if (patterns.themes.length > 0) {
          const strongTheme = patterns.themes[0];
          improvContext.ucbGuidance += `\n\nThematic Connection:
Strong ${strongTheme.theme} theme - words: ${strongTheme.words.slice(0, 3).join(', ')}`;
        }

        // Suggest word association opportunities
        if (previousDialogue.length > 0) {
          const lastLine = previousDialogue[previousDialogue.length - 1].text;
          const keyWords = patternGame.extractKeyWords(lastLine);

          if (keyWords.length > 0) {
            improvContext.ucbGuidance += `\n\nWord Association Opportunity:
Build on key concepts: ${keyWords.slice(0, 2).join(', ')}
Consider direct connections or conceptual leaps`;
          }
        }
      }
    }

    // Add scene direction suggestions if available
    if (supervisorContext?.sceneState?.improvContext?.sceneDirection) {
      const sceneDirection = supervisorContext.sceneState.improvContext.sceneDirection;
      if (sceneDirection.recommendations) {
        improvContext.ucbGuidance += `\n\nScene Direction:
${sceneDirection.recommendations[0]}`;
      }
    }

  } catch (error) {
    console.warn('Error building improv context:', error.message);
  }

  return improvContext;
}

// Generate word associations to enhance creativity
async function generateWordAssociation(seedWord, isLeap = false) {
  try {
    return await patternGame.generateAssociation(seedWord, [], isLeap, 0.8);
  } catch (error) {
    console.warn('Error generating word association:', error.message);
    return patternGame.getFallbackAssociation(seedWord, isLeap);
  }
}

// Enhanced dialogue generation with UCB techniques
async function generateUCBDialogue(speaker, otherCharacters, audienceWord, previousDialogue, sceneState) {
  // Use regular dialogue generation with enhanced UCB context
  const supervisorContext = {
    reason: 'UCB-style improv generation',
    sceneNote: 'Applying heightening and pattern game techniques',
    sceneState: sceneState
  };

  try {
    // Generate with UCB enhancements
    const dialogue = await generateDialogue(
      speaker,
      otherCharacters,
      audienceWord,
      previousDialogue,
      supervisorContext
    );

    // Post-process to ensure UCB principles
    return await applyUCBPostProcessing(dialogue, speaker, previousDialogue, sceneState);

  } catch (error) {
    console.error('Error generating UCB dialogue:', error);
    // Fallback to basic generation
    return generateDialogue(speaker, otherCharacters, audienceWord, previousDialogue, supervisorContext);
  }
}

// Apply UCB post-processing to ensure quality
async function applyUCBPostProcessing(dialogue, speaker, previousDialogue, sceneState) {
  // Basic validation and enhancement
  let enhancedDialogue = dialogue;

  // Ensure "yes, and..." principle if this is a response
  if (previousDialogue.length > 0) {
    const lastLine = previousDialogue[previousDialogue.length - 1].text.toLowerCase();
    const currentResponse = dialogue.toLowerCase();

    // Check if response negates or blocks the previous offer
    const blockingWords = ['no', 'that\'s wrong', 'actually no', 'i disagree'];
    const hasBlocking = blockingWords.some(word => currentResponse.includes(word));

    if (hasBlocking && !currentResponse.includes('yes') && !currentResponse.includes('and')) {
      // Try to add "yes, and..." structure
      enhancedDialogue = `Yes, and ${dialogue.toLowerCase()}`;
    }
  }

  // Ensure reasonable length (UCB tends to favor concise, punchy lines)
  const words = enhancedDialogue.split(' ');
  if (words.length > 25) {
    enhancedDialogue = words.slice(0, 20).join(' ') + '...';
  }

  return enhancedDialogue;
}

export {
  defaultPromptTemplates,
  generateUCBDialogue,
  generateWordAssociation,
  buildImprovContext
};