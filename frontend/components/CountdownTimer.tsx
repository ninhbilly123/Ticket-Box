'use client';

import React, { useState, useEffect } from 'react';

interface CountdownTimerProps {
  expiredAt: string;
  onExpire: () => void;
}

export default function CountdownTimer({ expiredAt, onExpire }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const targetDate = new Date(expiredAt).getTime();
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate - now;

      if (distance <= 0) {
        clearInterval(interval);
        setTimeLeft(0);
        onExpire();
      } else {
        setTimeLeft(distance);
      }
    }, 1000);

    // Initial check
    const now = new Date().getTime();
    const distance = targetDate - now;
    if (distance <= 0) {
      clearInterval(interval);
      setTimeLeft(0);
      onExpire();
    } else {
      setTimeLeft(distance);
    }

    return () => clearInterval(interval);
  }, [expiredAt, onExpire]);

  if (timeLeft <= 0) return <span className="font-mono text-2xl font-bold">00:00</span>;

  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  return (
    <span className="font-mono text-3xl font-bold tracking-widest text-white drop-shadow-md">
      {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
    </span>
  );
}
