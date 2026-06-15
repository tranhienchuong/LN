import type { ComparedToken, DictationComparison, Keyword, TranscriptSegment } from "../types";

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "been",
  "but",
  "by",
  "can",
  "could",
  "did",
  "do",
  "does",
  "for",
  "from",
  "had",
  "has",
  "have",
  "he",
  "her",
  "his",
  "i",
  "if",
  "in",
  "is",
  "it",
  "its",
  "may",
  "more",
  "most",
  "not",
  "of",
  "on",
  "or",
  "our",
  "she",
  "so",
  "such",
  "than",
  "that",
  "the",
  "their",
  "there",
  "these",
  "they",
  "this",
  "to",
  "was",
  "we",
  "were",
  "which",
  "will",
  "with",
  "would",
  "you",
  "your",
]);

const NON_NAME_WORDS = new Set([
  ...STOP_WORDS,
  "another",
  "as",
  "because",
  "first",
  "for",
  "however",
  "in",
  "the",
  "when",
]);

export const TRANSITION_PHRASES = [
  "the main point is",
  "for example",
  "as a result",
  "another reason",
  "in conclusion",
  "first",
  "however",
  "because",
];

const normalizeWord = (word: string) =>
  word
    .toLowerCase()
    .replace(/[^\p{L}\p{N}'-]/gu, "")
    .trim();

const tokenizeWords = (text: string) =>
  text
    .match(/[\p{L}\p{N}'-]+/gu)
    ?.map((word) => ({ raw: word, normalized: normalizeWord(word) }))
    .filter((token) => token.normalized.length > 0) ?? [];

export function splitTranscriptIntoSentences(transcript: string): string[] {
  return transcript
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'])/g)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

export function buildTranscriptSegments(
  transcript: string,
  existingSegments: TranscriptSegment[] = [],
): TranscriptSegment[] {
  const sentences = splitTranscriptIntoSentences(transcript);
  return sentences.map((sentence, index) => {
    const existing = existingSegments[index];
    return {
      id: existing?.id ?? `segment-${index}`,
      text: sentence,
      startTime: Number.isFinite(existing?.startTime) ? existing?.startTime : undefined,
      endTime: Number.isFinite(existing?.endTime) ? existing?.endTime : undefined,
    };
  });
}

export function hasSegmentTiming(segment?: TranscriptSegment) {
  return (
    typeof segment?.startTime === "number" &&
    typeof segment?.endTime === "number" &&
    segment.endTime > segment.startTime
  );
}

export function compareDictationText(expected: string, actual: string): DictationComparison {
  const expectedTokens = tokenizeWords(expected);
  const actualTokens = tokenizeWords(actual);
  const rows = expectedTokens.length + 1;
  const cols = actualTokens.length + 1;
  const dp = Array.from({ length: rows }, () => Array<number>(cols).fill(0));

  for (let i = expectedTokens.length - 1; i >= 0; i -= 1) {
    for (let j = actualTokens.length - 1; j >= 0; j -= 1) {
      dp[i][j] =
        expectedTokens[i].normalized === actualTokens[j].normalized
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const tokens: ComparedToken[] = [];
  let i = 0;
  let j = 0;
  let correctWords = 0;

  while (i < expectedTokens.length || j < actualTokens.length) {
    const expectedToken = expectedTokens[i];
    const actualToken = actualTokens[j];

    if (
      expectedToken &&
      actualToken &&
      expectedToken.normalized === actualToken.normalized
    ) {
      correctWords += 1;
      tokens.push({
        id: `${i}-${j}-correct`,
        text: actualToken.raw,
        status: "correct",
      });
      i += 1;
      j += 1;
      continue;
    }

    if (expectedToken && (!actualToken || dp[i + 1][j] >= dp[i][j + 1])) {
      tokens.push({
        id: `${i}-${j}-missing`,
        text: expectedToken.raw,
        status: "missing",
      });
      i += 1;
      continue;
    }

    if (actualToken) {
      tokens.push({
        id: `${i}-${j}-wrong`,
        text: actualToken.raw,
        expected: expectedToken?.raw,
        status: "wrong",
      });
      j += 1;
    }
  }

  const expectedWords = expectedTokens.length || 1;
  return {
    tokens,
    correctWords,
    expectedWords,
    accuracy: Math.round((correctWords / expectedWords) * 100),
  };
}

export function extractKeywords(transcript: string, limit = 18): Keyword[] {
  const lowerTranscript = transcript.toLowerCase();
  const keywords = new Map<string, Keyword>();

  TRANSITION_PHRASES.forEach((phrase) => {
    const matches = lowerTranscript.match(new RegExp(`\\b${phrase}\\b`, "g"));
    if (matches?.length) {
      keywords.set(phrase, {
        term: phrase,
        count: matches.length,
        type: "transition",
      });
    }
  });

  tokenizeWords(transcript).forEach((token) => {
    const isNumber = /\d/.test(token.raw);
    const looksLikeName =
      /^[A-Z][a-z]+$/.test(token.raw) &&
      token.normalized.length > 2 &&
      !NON_NAME_WORDS.has(token.normalized);
    const isUsefulTerm = token.normalized.length > 4 && !STOP_WORDS.has(token.normalized);

    if (!isNumber && !looksLikeName && !isUsefulTerm) return;

    const current = keywords.get(token.normalized);
    if (current?.type === "transition") return;
    const type: Keyword["type"] = isNumber ? "number" : looksLikeName ? "name" : "repeated";
    keywords.set(token.normalized, {
      term: current?.term ?? token.raw,
      count: (current?.count ?? 0) + 1,
      type,
    });
  });

  const score = (keyword: Keyword) => {
    const typeBonus = { transition: 70, number: 45, name: 35, repeated: 0 }[keyword.type];
    const repeatBonus = keyword.count > 1 ? keyword.count * 12 : keyword.count * 4;
    return typeBonus + repeatBonus + Math.min(keyword.term.length, 12);
  };

  return [...keywords.values()]
    .filter((keyword) => keyword.type !== "repeated" || keyword.count > 1 || keyword.term.length > 7)
    .sort((a, b) => score(b) - score(a) || a.term.localeCompare(b.term))
    .slice(0, limit);
}

export function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function compactPreview(text: string, maxLength = 80) {
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length > maxLength ? `${compact.slice(0, maxLength - 1)}...` : compact;
}
