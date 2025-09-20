import axios from 'axios';
import { supervisorMonitor } from './supervisorMonitor';
import { persistentDB } from './persistentDatabase';

const defaultSupervisorSettings = {
  turnTakingStrategy: 'context-driven', // round-robin, weighted-random, context-driven, dramatic-optimal
  pacingSpeed: 'medium', // fast, medium, slow
  supervisorPersonality: 'improv-coach', // improv-coach, playwright, director, natural
  participationBalance: 'strict', // strict, loose, natural
  sceneTransitionSensitivity: 'medium', // low, medium, high
  maxConsecutiveTurns: 2, // Maximum turns a character can have in a row
  characterInteractionWeight: 0.7, // How much character relationships affect decisions (0-1)
  dramaticTimingWeight: 0.5, // How much dramatic timing affects decisions (0-1)
  supervisorPromptTemplate: `You are an expert improv director coordinating a 4-character scene.

Current Scene Context:
- Audience Word: {audienceWord}
- Scene Location: {sceneLocation}
- Scene Energy: {sceneEnergy}
- Current Mood: {sceneMood}
- Lines So Far: {dialogueCount}

Characters Available:
{characterDetails}

Recent Dialogue:
{recentDialogue}

Character Participation:
{participationStats}

Your task: Decide which character should speak next and provide a brief reason.

Consider:
- Scene flow and dramatic pacing
- Character relationships and dynamics
- Balanced participation across all characters
- Opportunities for conflict, comedy, or scene development
- Natural conversation rhythm and energy

Respond with ONLY a JSON object:
{
  "nextSpeaker": "character_name",
  "reason": "brief explanation of why this character should speak next",
  "sceneNote": "optional note about scene direction or energy"
}`
};

export async function decideSpeaker(sceneState, availableCharacters, recentDialogue) {
  const startTime = Date.now();

  // Load supervisor settings from persistent database
  const supervisorSettings = {
    ...defaultSupervisorSettings,
    ...persistentDB.getSupervisorSettings()
  };

  // Load dialogue settings for API configuration
  const dialogueSettings = {
    maxTokens: 150,
    temperature: 0.8,
    ...persistentDB.getDialogueSettings()
  };

  let decision, timeTaken, isAI = false, error = null;

  // Handle simple strategies without AI
  if (supervisorSettings.turnTakingStrategy === 'round-robin') {
    decision = handleRoundRobin(sceneState, availableCharacters);
    timeTaken = Date.now() - startTime;
  } else if (supervisorSettings.turnTakingStrategy === 'weighted-random') {
    decision = handleWeightedRandom(sceneState, availableCharacters);
    timeTaken = Date.now() - startTime;
  } else {
    // For AI-driven strategies, use the supervisor AI
    try {
      decision = await callSupervisorAI(
        sceneState,
        availableCharacters,
        recentDialogue,
        supervisorSettings,
        dialogueSettings
      );
      timeTaken = Date.now() - startTime;
      isAI = true;
    } catch (err) {
      console.error('Supervisor AI error, falling back to weighted random:', err);
      error = err;
      decision = handleWeightedRandom(sceneState, availableCharacters);
      timeTaken = Date.now() - startTime;
      isAI = false;
    }
  }

  // Log the decision to supervisor monitor
  supervisorMonitor.logDecision(decision, sceneState, timeTaken, isAI, error);

  return decision;
}

async function callSupervisorAI(sceneState, availableCharacters, recentDialogue, supervisorSettings, dialogueSettings) {
  // Validate API key first
  const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured. Please set REACT_APP_OPENAI_API_KEY environment variable.');
  }

  if (apiKey.length < 20 || !apiKey.startsWith('sk-')) {
    throw new Error('OpenAI API key appears to be invalid. Please check your API key format.');
  }

  const characterDetails = availableCharacters.map(char =>
    `- ${char.name}: ${char.personality} (Turns: ${sceneState.characterStats[char.name]?.turnCount || 0})`
  ).join('\n');

  const recentDialogueText = recentDialogue.slice(-6).map(line =>
    `${line.speaker}: "${line.text}"`
  ).join('\n');

  const participationStats = availableCharacters.map(char => {
    const stats = sceneState.characterStats[char.name] || { turnCount: 0, wordCount: 0 };
    return `${char.name}: ${stats.turnCount} turns, ~${stats.wordCount} words`;
  }).join('\n');

  // Replace template variables in supervisor prompt
  const prompt = supervisorSettings.supervisorPromptTemplate
    .replace('{audienceWord}', sceneState.audienceWord)
    .replace('{sceneLocation}', sceneState.location || 'Unknown location')
    .replace('{sceneEnergy}', sceneState.energy || 'Medium')
    .replace('{sceneMood}', sceneState.mood || 'Neutral')
    .replace('{dialogueCount}', sceneState.totalLines)
    .replace('{characterDetails}', characterDetails)
    .replace('{recentDialogue}', recentDialogueText || 'No dialogue yet')
    .replace('{participationStats}', participationStats);

  try {
    console.log('[SupervisorAgent] Making OpenAI API request...');

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an expert improv director with the personality of a ${supervisorSettings.supervisorPersonality}. Your pacing preference is ${supervisorSettings.pacingSpeed} and you maintain ${supervisorSettings.participationBalance} participation balance. Always respond with valid JSON only.`
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: dialogueSettings.maxTokens || 150,
        temperature: dialogueSettings.temperature || 0.8
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      }
    );

    console.log('[SupervisorAgent] OpenAI API response status:', response.status);

    // Validate response structure
    if (!response.data || !response.data.choices || !response.data.choices[0]) {
      throw new Error('Invalid OpenAI API response structure');
    }

    const aiResponse = response.data.choices[0].message.content.trim();
    console.log('[SupervisorAgent] Raw AI response:', aiResponse);

    // Check for empty response
    if (!aiResponse) {
      throw new Error('Empty response from OpenAI API');
    }

    // Try to extract JSON from response (handle cases where AI adds extra text)
    let jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON object found in AI response');
    }

    let decision;
    try {
      decision = JSON.parse(jsonMatch[0]);
    } catch (jsonError) {
      console.error('[SupervisorAgent] JSON parsing failed:', jsonError);
      console.error('[SupervisorAgent] Attempted to parse:', jsonMatch[0]);
      throw new Error(`JSON parsing failed: ${jsonError.message}`);
    }

    // Validate the response has required fields
    if (!decision.nextSpeaker) {
      throw new Error('Missing nextSpeaker field in AI response');
    }

    const selectedCharacter = availableCharacters.find(c => c.name === decision.nextSpeaker);
    if (!selectedCharacter) {
      console.error('[SupervisorAgent] Available characters:', availableCharacters.map(c => c.name));
      console.error('[SupervisorAgent] AI selected:', decision.nextSpeaker);
      throw new Error(`Invalid speaker selection: "${decision.nextSpeaker}" not found in available characters`);
    }

    console.log('[SupervisorAgent] Successfully parsed AI decision:', {
      speaker: decision.nextSpeaker,
      reason: decision.reason,
      sceneNote: decision.sceneNote
    });

    return {
      speaker: selectedCharacter,
      reason: decision.reason || 'Supervisor decision',
      sceneNote: decision.sceneNote || null
    };

  } catch (networkError) {
    // Enhanced network error handling
    if (networkError.code === 'ECONNABORTED') {
      throw new Error('OpenAI API request timeout. Please check your internet connection.');
    }

    if (networkError.response) {
      const status = networkError.response.status;
      const statusText = networkError.response.statusText;

      console.error('[SupervisorAgent] OpenAI API error response:', {
        status,
        statusText,
        data: networkError.response.data
      });

      switch (status) {
        case 401:
          throw new Error('Invalid OpenAI API key. Please check your API key configuration.');
        case 403:
          throw new Error('OpenAI API access denied. Please check your API key permissions.');
        case 429:
          throw new Error('OpenAI API rate limit exceeded. Please try again later.');
        case 500:
        case 502:
        case 503:
          throw new Error('OpenAI API is currently unavailable. Please try again later.');
        default:
          throw new Error(`OpenAI API error (${status}): ${statusText}`);
      }
    }

    if (networkError.request) {
      throw new Error('Unable to connect to OpenAI API. Please check your internet connection.');
    }

    // Re-throw if it's already our custom error
    if (networkError.message.includes('JSON parsing failed') ||
        networkError.message.includes('Invalid speaker selection') ||
        networkError.message.includes('Missing nextSpeaker field')) {
      throw networkError;
    }

    throw new Error(`OpenAI API request failed: ${networkError.message}`);
  }
}

function handleRoundRobin(sceneState, availableCharacters) {
  // Simple round-robin based on last speaker
  const lastSpeakerIndex = sceneState.lastSpeaker
    ? availableCharacters.findIndex(c => c.name === sceneState.lastSpeaker)
    : -1;

  const nextIndex = (lastSpeakerIndex + 1) % availableCharacters.length;

  return {
    speaker: availableCharacters[nextIndex],
    reason: 'Round-robin rotation',
    sceneNote: null
  };
}

function handleWeightedRandom(sceneState, availableCharacters) {
  // Weight characters by inverse of their participation
  const weights = availableCharacters.map(char => {
    const turnCount = sceneState.characterStats[char.name]?.turnCount || 0;
    // Characters with fewer turns get higher weight
    return Math.max(1, 5 - turnCount);
  });

  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < availableCharacters.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return {
        speaker: availableCharacters[i],
        reason: 'Weighted random selection (balancing participation)',
        sceneNote: null
      };
    }
  }

  // Fallback to first character
  return {
    speaker: availableCharacters[0],
    reason: 'Fallback selection',
    sceneNote: null
  };
}

// Analyze dialogue for scene context
export function analyzeSceneContext(dialogue, audienceWord) {
  if (dialogue.length === 0) {
    return {
      energy: 'building',
      mood: 'neutral',
      location: `somewhere related to ${audienceWord}`,
      themes: [audienceWord],
      relationships: {}
    };
  }

  // Simple analysis based on dialogue content
  const allText = dialogue.map(line => line.text).join(' ').toLowerCase();

  // Energy analysis
  let energy = 'medium';
  if (allText.includes('!') && allText.split('!').length > 3) {
    energy = 'high';
  } else if (allText.includes('?') && allText.split('?').length > 2) {
    energy = 'questioning';
  } else if (dialogue.length < 3) {
    energy = 'building';
  }

  // Mood analysis
  let mood = 'neutral';
  const positiveWords = ['great', 'amazing', 'wonderful', 'fantastic', 'love', 'awesome'];
  const negativeWords = ['terrible', 'awful', 'hate', 'bad', 'wrong', 'problem'];

  const positiveCount = positiveWords.filter(word => allText.includes(word)).length;
  const negativeCount = negativeWords.filter(word => allText.includes(word)).length;

  if (positiveCount > negativeCount) {
    mood = 'positive';
  } else if (negativeCount > positiveCount) {
    mood = 'tense';
  }

  // Location extraction (simple)
  const locationWords = ['here', 'this place', 'factory', 'store', 'office', 'home', 'restaurant'];
  const location = locationWords.find(word => allText.includes(word)) || `somewhere involving ${audienceWord}`;

  return {
    energy,
    mood,
    location,
    themes: [audienceWord],
    relationships: {} // Could be enhanced to track character interactions
  };
}

export { defaultSupervisorSettings };