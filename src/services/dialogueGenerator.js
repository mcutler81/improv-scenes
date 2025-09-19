import axios from 'axios';

export async function generateDialogue(speaker, otherSpeaker, audienceWord, previousDialogue) {
  const lastLine = previousDialogue.length > 0
    ? previousDialogue[previousDialogue.length - 1].text
    : null;

  const isFirstLine = previousDialogue.length === 0;
  const isSecondLine = previousDialogue.length === 1;

  let promptInstructions;

  if (isFirstLine) {
    promptInstructions = `You are STARTING the scene. ESTABLISH:
- WHERE we are (location related to "${audienceWord}")
- WHO you are in this scene (a character/role)
- WHAT is happening
Example: "Well, here we are at the ${audienceWord} factory again..."`;
  } else if (isSecondLine) {
    promptInstructions = `${otherSpeaker.name} just said: "${lastLine}"
BUILD on their scene setup by:
- Accepting their WHERE/WHO/WHAT
- Adding more detail about the situation
- "Yes, and..." their idea`;
  } else {
    promptInstructions = `${otherSpeaker.name} just said: "${lastLine}"
Continue the conversation naturally, building on what was said.`;
  }

  const prompt = `You are ${speaker.name} doing improv comedy with ${otherSpeaker.name}.
The audience suggestion word is: "${audienceWord}"

Your personality: ${speaker.personality}
Famous phrases you might reference: ${speaker.catchphrases.join(', ')}

${promptInstructions}

Generate ONE short, funny line (max 20 words) as ${speaker.name} that:
- ${isFirstLine ? 'Establishes the scene (who/what/where)' : 'Builds on the established scene'}
- Incorporates "${audienceWord}" naturally
- Stays in character as ${speaker.name}
- Creates "Yes, and..." improv energy
- Could use one of your catchphrases if it fits naturally

Respond with ONLY the dialogue line, no quotes or attribution.`;

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          { role: 'system', content: `You are an expert improv comedian performing as ${speaker.name}. Follow the "Yes, and..." rule - always accept what your partner says and build on it. Keep responses short, punchy, and in character. Make the conversation flow naturally.` },
          { role: 'user', content: prompt }
        ],
        max_tokens: 50,
        temperature: 0.9
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