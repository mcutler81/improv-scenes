import React, { useState } from 'react';
import CharacterSelect from './components/CharacterSelect';
import ImprovStage from './components/ImprovStage';
import Settings from './components/Settings';
import './App.css';

function App() {
  const [screen, setScreen] = useState('select');
  const [character1, setCharacter1] = useState(null);
  const [character2, setCharacter2] = useState(null);
  const [character3, setCharacter3] = useState(null);
  const [character4, setCharacter4] = useState(null);
  const [audienceWord, setAudienceWord] = useState('');

  const handleStartImprov = () => {
    if (character1 && character2 && character3 && character4 && audienceWord) {
      setScreen('improv');
    }
  };

  const handleReset = () => {
    setScreen('select');
    setAudienceWord('');
  };

  const handleSettings = () => {
    setScreen('settings');
  };

  const handleBackFromSettings = () => {
    setScreen('select');
  };

  return (
    <div className="App">
      {screen === 'select' && (
        <CharacterSelect
          character1={character1}
          character2={character2}
          character3={character3}
          character4={character4}
          setCharacter1={setCharacter1}
          setCharacter2={setCharacter2}
          setCharacter3={setCharacter3}
          setCharacter4={setCharacter4}
          audienceWord={audienceWord}
          setAudienceWord={setAudienceWord}
          onStart={handleStartImprov}
          onSettings={handleSettings}
        />
      )}

      {screen === 'improv' && (
        <ImprovStage
          character1={character1}
          character2={character2}
          character3={character3}
          character4={character4}
          audienceWord={audienceWord}
          onReset={handleReset}
        />
      )}

      {screen === 'settings' && (
        <Settings onBack={handleBackFromSettings} />
      )}
    </div>
  );
}

export default App;
