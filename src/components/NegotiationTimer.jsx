import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

const NegotiationTimer = ({ durationInSeconds, onTimeUp }) => {
  const [timeRemaining, setTimeRemaining] = useState(durationInSeconds);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    setTimeRemaining(durationInSeconds);
    setIsRunning(true);
  }, [durationInSeconds]);

  useEffect(() => {
    if (!isRunning || timeRemaining <= 0) {
      if (timeRemaining <= 0 && isRunning) {
        onTimeUp();
        setIsRunning(false);
      }
      return;
    }

    const timerId = setInterval(() => {
      setTimeRemaining((prevTime) => prevTime - 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [timeRemaining, isRunning, onTimeUp]);

  const formatTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const timeExpired = timeRemaining <= 0;
  const timerColorClass = timeRemaining <= 30 ? 'text-red-500' : 'text-gray-700';

  return (
    <div className="flex items-center justify-center space-x-2 p-3 bg-gray-100 rounded-lg shadow-inner">
      <Clock className={`h-5 w-5 ${timerColorClass}`} />
      <span className={`font-semibold text-lg ${timerColorClass}`}>
        {timeExpired ? 'Time Up!' : formatTime(timeRemaining)}
      </span>
    </div>
  );
};

export default NegotiationTimer;
