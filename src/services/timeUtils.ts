export const getElapsedTime = (startTime: string | null | undefined): string => {
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
export const formatTime = (isoString: string | null | undefined): string => {
  if (!isoString) return '--:--';
  const date = new Date(isoString);
  const hrs = String(date.getHours()).padStart(2, '0');
  const mins = String(date.getMinutes()).padStart(2, '0');
  return `${hrs}:${mins}`;
};

export const getSantiagoTodayString = (): string => {
  const today = new Date();
  try {
    const formatter = new Intl.DateTimeFormat('fr-CA', {
      timeZone: 'America/Santiago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(today);
  } catch (e) {
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }
};

