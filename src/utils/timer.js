// src/utils/timer.js

// Formats seconds into MM:SS format
export const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
};

// Returns 15 min break for every 4th session, otherwise returns 5 min break
export const calculateBreakTime = (sessionCount) => {
  if (!sessionCount || sessionCount <= 0) return 5; // Default to 5 min break for invalid session counts
  return sessionCount % 4 === 0 ? 15 : 5;
};
