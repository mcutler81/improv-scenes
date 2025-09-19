import React, { useState } from 'react';
import CharacterSelect from './components/CharacterSelect';
import ImprovStage from './components/ImprovStage';
import './App.css';

function App() {
  const [screen, setScreen] = useState('select');
  const [character1, setCharacter1] = useState(null);
  const [character2, setCharacter2] = useState(null);
  const [audienceWord, setAudienceWord] = useState('');

  const handleStartImprov = () => {
    if (character1 && character2 && audienceWord) {
      setScreen('improv');
    }
  };

  const handleReset = () => {
    setScreen('select');
    setAudienceWord('');
  };

  return (
    <div className="App">
      {screen === 'select' ? (
        <CharacterSelect
          character1={character1}
          character2={character2}
          setCharacter1={setCharacter1}
          setCharacter2={setCharacter2}
          audienceWord={audienceWord}
          setAudienceWord={setAudienceWord}
          onStart={handleStartImprov}
        />
      ) : (
        <ImprovStage
          character1={character1}
          character2={character2}
          audienceWord={audienceWord}
          onReset={handleReset}
        />
      )}
    </div>
  );
}

export default App;
