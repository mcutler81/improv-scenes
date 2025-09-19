import React from 'react';
import './Timer.css';

function Timer({ timeLeft }) {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="timer">
      <span className={timeLeft <= 10 ? 'time-warning' : ''}>
        {minutes}:{seconds.toString().padStart(2, '0')}
      </span>
    </div>
  );
}

export default Timer;