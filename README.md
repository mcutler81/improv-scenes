# AI Improv Theater

An interactive improv comedy show featuring AI-powered celebrity impressions using ElevenLabs voice synthesis.

## Features

- Choose any 2 celebrities from a curated list
- Manual word input from the audience
- 1-minute timed improv scenes
- Real-time dialogue generation with GPT-4
- Celebrity voice synthesis with ElevenLabs
- Visual indicators for current speaker

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory:
```bash
cp .env.example .env
```

3. Add your API keys to `.env`:
- **OpenAI API Key**: For dialogue generation (GPT-4)
- **ElevenLabs API Key**: For celebrity voice synthesis

4. Set up ElevenLabs voices:
- Go to ElevenLabs Voice Library
- Clone or find celebrity voices
- Update voice IDs in `src/data/characters.js`

## Running the App

```bash
npm start
```

Visit http://localhost:3000

## How to Use

1. **Select Characters**: Choose two celebrities from the dropdowns
2. **Enter Word**: Type in an audience suggestion word
3. **Start Scene**: Click "Start the Scene!"
4. **Watch**: The AI performers will improvise for 60 seconds
5. **New Scene**: Click "New Scene" to start over

## Celebrity List

- Morgan Freeman & Samuel L. Jackson
- Christopher Walken & Jack Nicholson
- Arnold Schwarzenegger & Sylvester Stallone
- Owen Wilson & Matthew McConaughey
- Jeff Goldblum & Nicolas Cage
- Mike Tyson & Snoop Dogg
- Gordon Ramsay & Bob Ross
- Barack Obama (and any combination of above)

## Tech Stack

- React for the frontend
- OpenAI GPT-4 for dialogue generation
- ElevenLabs API for voice synthesis
- CSS for styling

## Notes

- Requires active internet connection
- API usage will incur costs on OpenAI and ElevenLabs
- Voice quality depends on ElevenLabs voice models available