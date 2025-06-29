import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

const NegotiationTimer = ({ duration, onTimeUp, isActive }) => {
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [timerStarted, setTimerStarted] = useState(false);

  useEffect(() => {
    if (isActive && !timerStarted) {
      setTimerStarted(true);
      setTimeRemaining(duration);
    }
  }, [isActive, duration, timerStarted]);

  useEffect(() => {
    let timer;
    if (isActive && timeRemaining > 0) {
      timer = setInterval(() => {
        setTimeRemaining(prevTime => prevTime - 1);
      }, 1000);
    } else if (timeRemaining === 0 && timerStarted) {
      onTimeUp();
      setTimerStarted(false); // Reset for next negotiation
    }

    return () => clearInterval(timer);
  }, [timeRemaining, onTimeUp, isActive, timerStarted]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const timerColorClass = timeRemaining <= 10 ? 'text-red-500' : 'text-gray-700';

  return (
    <div className="flex items-center space-x-2 p-2 bg-gray-100 rounded-lg">
      <Clock className="h-5 w-5 text-gray-500" />
      <span className={`font-semibold text-lg ${timerColorClass}`}>
        {formatTime(timeRemaining)}
      </span>
    </div>
  );
};

export default NegotiationTimer;
