import axios from 'axios';

export class PatternGame {
  constructor() {
    this.agents = ['Alice', 'Bob', 'Charlie', 'Daisy', 'Eve', 'Frank'];
    this.baseTemperature = 0.7;
    this.leapTemperatureMultiplier = 2.0; // Double temperature for leaps
  }

  async generateAssociation(seedWord, previousWords = [], isLeap = false, temperature = 0.7) {
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const prompt = isLeap
      ? `Given the word '${seedWord}', what's an indirectly related word, phrase, or unique concept? This should require a significant conceptual leap to connect the word to the most recently generated word, phrase, or unique concept. Some examples of sequences including conceptual leaps might be 'Apple' -> 'Pie' -> 'The American Dream' -> 'The American Nightmare' -> 'Lincoln delivering the Gettysburg Address and realizing he's not wearing pants.' That is an example of a sequence, but you should only generate one word, phrase, or unique concept.`
      : `Given the word '${seedWord}', what's a directly related word or phrase? This should be a word or phrase that is just a few degrees of difference away from the most recently generated word or phrase. Some examples of sequences of directly related words or phrases might be 'Apple' -> 'Pie' -> 'Windowsill' -> 'Picket fence.' That is an example of a sequence, but you should only generate one word, phrase, or unique concept.`;

    let attempt = 0;
    const maxAttempts = 3;

    while (attempt < maxAttempts) {
      try {
        const response = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: 'gpt-3.5-turbo',
            messages: [
              { role: 'system', content: 'You are a helpful assistant for word association games.' },
              { role: 'user', content: prompt }
            ],
            temperature: temperature,
            max_tokens: 50
          },
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 8000
          }
        );

        let word = response.data.choices[0].message.content.trim();

        // Clean up the response - remove quotes and extra whitespace
        word = word.replace(/^["']|["']$/g, '').trim();

        // Check if word was already used
        if (!previousWords.includes(word.toLowerCase())) {
          return word;
        }

        // If word was already used, try again with slightly higher temperature
        temperature += 0.1;
        attempt++;
      } catch (error) {
        console.warn(`Association generation attempt ${attempt + 1} failed:`, error.message);
        attempt++;

        if (attempt >= maxAttempts) {
          // Fallback to simple associations
          return this.getFallbackAssociation(seedWord, isLeap);
        }
      }
    }

    return this.getFallbackAssociation(seedWord, isLeap);
  }

  // Fallback associations when AI is unavailable
  getFallbackAssociation(seedWord, isLeap = false) {
    const directAssociations = {
      apple: ['pie', 'tree', 'red', 'fruit'],
      pie: ['crust', 'filling', 'oven', 'slice'],
      tree: ['leaves', 'branches', 'bark', 'roots'],
      house: ['home', 'door', 'window', 'roof'],
      car: ['drive', 'wheels', 'engine', 'road'],
      book: ['read', 'page', 'story', 'author']
    };

    const leapAssociations = {
      apple: ['gravity', 'knowledge', 'temptation', 'doctor'],
      pie: ['American dream', 'comfort', 'grandmother', 'tradition'],
      tree: ['family history', 'wisdom', 'shelter', 'time'],
      house: ['memories', 'security', 'investment', 'neighborhood'],
      car: ['freedom', 'status', 'pollution', 'journey'],
      book: ['education', 'escape', 'imagination', 'history']
    };

    const associations = isLeap ? leapAssociations : directAssociations;
    const wordKey = seedWord.toLowerCase();
    const options = associations[wordKey] || ['connection', 'relationship', 'association', 'link'];

    return options[Math.floor(Math.random() * options.length)];
  }

  async runPatternGame(seedWord, loops = 3) {
    console.log(`\nPattern Game Word Associations starting with: "${seedWord}"`);

    const gameResult = {
      seedWord,
      loops: [],
      totalWords: [seedWord],
      summary: {
        totalAssociations: 0,
        leapsMade: 0,
        agentsParticipated: 0
      }
    };

    for (let loopIndex = 0; loopIndex < loops; loopIndex++) {
      const loop = {
        loopNumber: loopIndex + 1,
        associations: [],
        leapsInThisLoop: 0
      };

      console.log(`\n--- Loop ${loopIndex + 1} ---`);
      let leapsOccurred = 0;

      // Let each agent take a turn
      for (let i = 0; i < this.agents.length; i++) {
        const agent = this.agents[i];

        // Decide on taking a leap or not
        let takeLeap = Math.random() < 0.5; // 50% chance initially

        // Ensure at least one leap occurs per loop, allow up to 2 leaps
        if (leapsOccurred === 0) {
          takeLeap = true; // Force a leap if none have occurred
        } else if (leapsOccurred >= 2) {
          takeLeap = false; // Prevent more than 2 leaps
        }

        // Calculate temperature adjustment for leaps
        let temperature = this.baseTemperature;
        const currentWord = gameResult.totalWords[gameResult.totalWords.length - 1];

        try {
          let associatedWord;

          if (takeLeap && leapsOccurred < 2) {
            temperature = this.baseTemperature * this.leapTemperatureMultiplier;

            if (i === 0) {
              // First agent in loop associates with seed word
              associatedWord = await this.generateAssociation(
                seedWord,
                gameResult.totalWords,
                false,
                temperature
              );
            } else {
              associatedWord = await this.generateAssociation(
                currentWord,
                gameResult.totalWords,
                true,
                temperature
              );
            }
            leapsOccurred++;
            loop.leapsInThisLoop++;
            gameResult.summary.leapsMade++;
          } else {
            associatedWord = await this.generateAssociation(
              currentWord,
              gameResult.totalWords,
              false,
              temperature
            );
          }

          const association = {
            agent,
            word: associatedWord,
            wasLeap: takeLeap && leapsOccurred <= 2,
            temperature,
            previousWord: currentWord
          };

          loop.associations.push(association);
          gameResult.totalWords.push(associatedWord);
          gameResult.summary.totalAssociations++;

          console.log(`${agent}: '${associatedWord}' ${association.wasLeap ? '(LEAP)' : ''}`);

        } catch (error) {
          console.error(`Error generating association for ${agent}:`, error.message);

          // Use fallback
          const fallbackWord = this.getFallbackAssociation(currentWord, takeLeap);
          const association = {
            agent,
            word: fallbackWord,
            wasLeap: false,
            temperature,
            previousWord: currentWord,
            error: error.message
          };

          loop.associations.push(association);
          gameResult.totalWords.push(fallbackWord);
          gameResult.summary.totalAssociations++;

          console.log(`${agent}: '${fallbackWord}' (fallback)`);
        }
      }

      // Try to circle back to the seed word
      gameResult.totalWords.push(seedWord);
      console.log(`All Agents: '${seedWord}' (return to seed)`);

      loop.returnToSeed = seedWord;
      gameResult.loops.push(loop);
    }

    gameResult.summary.agentsParticipated = this.agents.length;
    console.log('\nPattern game concluded.');
    console.log(`Total associations: ${gameResult.summary.totalAssociations}`);
    console.log(`Total leaps made: ${gameResult.summary.leapsMade}`);

    return gameResult;
  }

  // Extract word association patterns from dialogue
  extractPatternsFromDialogue(dialogue) {
    if (dialogue.length < 3) return null;

    const words = [];
    const patterns = {
      directConnections: [],
      conceptualLeaps: [],
      callbacks: [],
      themes: []
    };

    // Extract key words from each line
    dialogue.forEach((line, index) => {
      const keyWords = this.extractKeyWords(line.text);
      words.push(...keyWords);

      if (index > 0) {
        const prevKeyWords = this.extractKeyWords(dialogue[index - 1].text);

        // Check for direct connections
        const connections = this.findDirectConnections(prevKeyWords, keyWords);
        if (connections.length > 0) {
          patterns.directConnections.push({
            lineIndex: index,
            connections
          });
        }

        // Check for conceptual leaps
        const leaps = this.findConceptualLeaps(prevKeyWords, keyWords);
        if (leaps.length > 0) {
          patterns.conceptualLeaps.push({
            lineIndex: index,
            leaps
          });
        }
      }
    });

    // Find callbacks (words that appear again later)
    patterns.callbacks = this.findCallbacks(words, dialogue);

    // Identify recurring themes
    patterns.themes = this.identifyThemes(words);

    return patterns;
  }

  // Extract key words from a line of dialogue
  extractKeyWords(text) {
    // Remove common words and extract meaningful terms
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'can', 'may', 'might', 'must']);

    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !commonWords.has(word))
      .slice(0, 5); // Limit to top 5 key words
  }

  // Find direct connections between word sets
  findDirectConnections(prevWords, currentWords) {
    const connections = [];

    for (const prevWord of prevWords) {
      for (const currentWord of currentWords) {
        if (this.areDirectlyConnected(prevWord, currentWord)) {
          connections.push({ from: prevWord, to: currentWord });
        }
      }
    }

    return connections;
  }

  // Check if two words are directly connected
  areDirectlyConnected(word1, word2) {
    // Simple heuristics for direct connection
    const directConnectionPatterns = [
      // Similar roots or stems
      (w1, w2) => w1.substring(0, 3) === w2.substring(0, 3) && w1 !== w2,
      // Rhyming or similar sounds
      (w1, w2) => w1.endsWith(w2.slice(-2)) || w2.endsWith(w1.slice(-2)),
      // Semantic categories (simplified)
      (w1, w2) => this.getSematicCategory(w1) === this.getSematicCategory(w2)
    ];

    return directConnectionPatterns.some(pattern => pattern(word1, word2));
  }

  // Simple semantic categorization
  getSematicCategory(word) {
    const categories = {
      food: ['eat', 'food', 'cook', 'kitchen', 'meal', 'taste', 'hungry', 'restaurant', 'chef'],
      emotions: ['happy', 'sad', 'angry', 'love', 'hate', 'fear', 'joy', 'excited', 'worried'],
      movement: ['run', 'walk', 'jump', 'fly', 'drive', 'move', 'dance', 'swim', 'climb'],
      time: ['day', 'night', 'morning', 'evening', 'hour', 'minute', 'year', 'month', 'week'],
      people: ['person', 'man', 'woman', 'child', 'friend', 'family', 'neighbor', 'stranger']
    };

    for (const [category, words] of Object.entries(categories)) {
      if (words.some(w => word.includes(w) || w.includes(word))) {
        return category;
      }
    }
    return 'general';
  }

  // Find conceptual leaps between word sets
  findConceptualLeaps(prevWords, currentWords) {
    // This is a simplified version - in reality, this would be much more sophisticated
    const leaps = [];

    for (const prevWord of prevWords) {
      for (const currentWord of currentWords) {
        if (this.isConceptualLeap(prevWord, currentWord)) {
          leaps.push({ from: prevWord, to: currentWord, type: 'conceptual' });
        }
      }
    }

    return leaps;
  }

  // Determine if there's a conceptual leap between words
  isConceptualLeap(word1, word2) {
    // Different semantic categories suggest potential leaps
    const cat1 = this.getSematicCategory(word1);
    const cat2 = this.getSematicCategory(word2);

    return cat1 !== cat2 && cat1 !== 'general' && cat2 !== 'general';
  }

  // Find callbacks (repeated elements)
  findCallbacks(words, dialogue) {
    const wordCount = {};
    const callbacks = [];

    // Count word occurrences
    words.forEach((word, index) => {
      if (!wordCount[word]) {
        wordCount[word] = [];
      }
      wordCount[word].push(index);
    });

    // Find words that appear multiple times
    Object.entries(wordCount).forEach(([word, indices]) => {
      if (indices.length > 1) {
        callbacks.push({
          word,
          occurrences: indices.length,
          positions: indices
        });
      }
    });

    return callbacks.sort((a, b) => b.occurrences - a.occurrences);
  }

  // Identify recurring themes
  identifyThemes(words) {
    const themes = {};

    words.forEach(word => {
      const category = this.getSematicCategory(word);
      if (!themes[category]) {
        themes[category] = [];
      }
      themes[category].push(word);
    });

    // Return themes with multiple words
    return Object.entries(themes)
      .filter(([category, words]) => words.length > 1)
      .map(([category, words]) => ({
        theme: category,
        words: [...new Set(words)], // Remove duplicates
        strength: words.length
      }))
      .sort((a, b) => b.strength - a.strength);
  }
}

// Global instance
export const patternGame = new PatternGame();