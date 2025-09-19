import axios from 'axios';

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

export async function generateDialogue(speaker, otherCharacters, audienceWord, previousDialogue) {
  // Load dialogue settings from localStorage
  const savedSettings = localStorage.getItem('improv-dialogue-settings');
  const settings = savedSettings
    ? JSON.parse(savedSettings)
    : { maxTokens: 50, temperature: 0.9 };

  // Load prompt templates from localStorage
  const savedPromptTemplates = localStorage.getItem('improv-prompt-templates');
  const promptTemplates = savedPromptTemplates
    ? { ...defaultPromptTemplates, ...JSON.parse(savedPromptTemplates) }
    : defaultPromptTemplates;
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

  // Build the main prompt using the template
  const templateVars = {
    speakerName: speaker.name,
    otherCharacterNames,
    audienceWord,
    personality: speaker.personality,
    catchphrases: speaker.catchphrases.join(', '),
    promptInstructions,
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

export { defaultPromptTemplates };