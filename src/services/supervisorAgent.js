import axios from 'axios';

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
  // Load supervisor settings from localStorage
  const savedSupervisorSettings = localStorage.getItem('improv-supervisor-settings');
  const supervisorSettings = savedSupervisorSettings
    ? { ...defaultSupervisorSettings, ...JSON.parse(savedSupervisorSettings) }
    : defaultSupervisorSettings;

  // Load dialogue settings for API configuration
  const savedDialogueSettings = localStorage.getItem('improv-dialogue-settings');
  const dialogueSettings = savedDialogueSettings
    ? JSON.parse(savedDialogueSettings)
    : { maxTokens: 150, temperature: 0.8 };

  // Handle simple strategies without AI
  if (supervisorSettings.turnTakingStrategy === 'round-robin') {
    return handleRoundRobin(sceneState, availableCharacters);
  }

  if (supervisorSettings.turnTakingStrategy === 'weighted-random') {
    return handleWeightedRandom(sceneState, availableCharacters);
  }

  // For AI-driven strategies, use the supervisor AI
  try {
    const supervisorDecision = await callSupervisorAI(
      sceneState,
      availableCharacters,
      recentDialogue,
      supervisorSettings,
      dialogueSettings
    );

    return supervisorDecision;
  } catch (error) {
    console.error('Supervisor AI error, falling back to weighted random:', error);
    return handleWeightedRandom(sceneState, availableCharacters);
  }
}

async function callSupervisorAI(sceneState, availableCharacters, recentDialogue, supervisorSettings, dialogueSettings) {
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
        'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );

  try {
    const aiResponse = response.data.choices[0].message.content.trim();
    // Try to parse JSON response
    const decision = JSON.parse(aiResponse);

    // Validate the response has required fields
    if (!decision.nextSpeaker || !availableCharacters.find(c => c.name === decision.nextSpeaker)) {
      throw new Error('Invalid speaker selection');
    }

    return {
      speaker: availableCharacters.find(c => c.name === decision.nextSpeaker),
      reason: decision.reason || 'Supervisor decision',
      sceneNote: decision.sceneNote || null
    };
  } catch (parseError) {
    console.error('Failed to parse supervisor response:', parseError);
    throw new Error('Invalid supervisor response format');
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