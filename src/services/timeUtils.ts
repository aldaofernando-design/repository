export const getElapsedTime = (startTime: string | undefined): string => {
  if (!startTime) return 'Iniciado recién';
  
  const start = new Date(startTime);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffHrs > 0) {
    return `Iniciada hace ${diffHrs}h ${diffMins}m`;
  } else if (diffMins > 0) {
    return `Iniciada hace ${diffMins}m`;
  } else {
    return 'Iniciada hace < 1 min';
  }
};
export const formatTime = (isoString: string | undefined): string => {
  if (!isoString) return '--:--';
  const date = new Date(isoString);
  const hrs = String(date.getHours()).padStart(2, '0');
  const mins = String(date.getMinutes()).padStart(2, '0');
  return `${hrs}:${mins}`;
};
