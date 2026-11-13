export function isValidRelayUrl(url: string): boolean {
  return /^wss?:\/\/[^\s/:]+(:\d{1,5})?(\/\S*)?$/i.test(url.trim());
}