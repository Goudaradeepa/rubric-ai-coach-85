export function studentNamesMatch(selectedName: string, detectedName: string): boolean {
  const normalize = (name: string) => name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]/g, "");

  const selected = normalize(selectedName);
  const detected = normalize(detectedName);
  return selected.length > 0 && selected === detected;
}