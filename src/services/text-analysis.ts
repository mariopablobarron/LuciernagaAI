/**
 * Shared text-analysis utilities used by both state.ts and emotional-model.ts.
 * Single source of truth for text normalization and keyword matching.
 */

export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function countMatches(message: string, keywords: string[]): number {
  return keywords.reduce((total, keyword) => {
    return total + (message.includes(normalizeText(keyword)) ? 1 : 0);
  }, 0);
}

export function countMessagesWithSignals(messages: string[], keywords: string[]): number {
  return messages.reduce((total, message) => {
    return total + (countMatches(message, keywords) > 0 ? 1 : 0);
  }, 0);
}
