export function formatTravel(distanceM: number, durationS: number): string {
  const km = Math.round(distanceM / 1000);
  const totalMin = Math.round(durationS / 60);
  const time = totalMin >= 60 ? `${Math.floor(totalMin / 60)} h ${totalMin % 60} min` : `${totalMin} min`;
  return `${km} km · ${time}`;
}
