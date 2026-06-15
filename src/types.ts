export type MediaKind = "audio" | "video";

export interface MediaAsset {
  name: string;
  kind: MediaKind;
  mimeType: string;
  dataUrl: string;
}

export interface TranscriptSegment {
  id: string;
  text: string;
  startTime?: number;
  endTime?: number;
}

export interface Lesson {
  id: string;
  title: string;
  topic: string;
  media?: MediaAsset;
  transcript: string;
  segments: TranscriptSegment[];
  vocabularyWords: string[];
  unknownWords: string[];
  createdAt: string;
  updatedAt: string;
}

export type VocabularyStatus = "new" | "learning" | "mastered";

export interface VocabularyItem {
  id: string;
  word: string;
  meaning: string;
  exampleSentence: string;
  pronunciationNote: string;
  sourceLessonId: string;
  sourceLessonTitle: string;
  status: VocabularyStatus;
  correctReviews: number;
  incorrectReviews: number;
  createdAt: string;
  updatedAt: string;
}

export interface ComparedToken {
  id: string;
  text: string;
  status: "correct" | "wrong" | "missing";
  expected?: string;
}

export interface DictationComparison {
  tokens: ComparedToken[];
  correctWords: number;
  expectedWords: number;
  accuracy: number;
}

export interface DictationResult {
  id: string;
  lessonId: string;
  lessonTitle: string;
  sentenceIndex: number;
  sentencePreview: string;
  startTime?: number;
  endTime?: number;
  accuracy: number;
  createdAt: string;
}

export type ExamChecklistKey =
  | "topic"
  | "mainIdea"
  | "examples"
  | "numbersNames"
  | "contrastCauseEffect";

export type ExamChecklist = Record<ExamChecklistKey, boolean>;

export interface ExamAttempt {
  id: string;
  lessonId: string;
  lessonTitle: string;
  listens: 1 | 2;
  timeLimitMinutes: number;
  notes: string;
  checklist: ExamChecklist;
  createdAt: string;
}

export interface NoteAttempt {
  id: string;
  lessonId: string;
  lessonTitle: string;
  templateNotes: Record<string, string>;
  freeNotes: string;
  createdAt: string;
}

export interface Keyword {
  term: string;
  count: number;
  type: "repeated" | "number" | "name" | "transition";
}

export interface AppData {
  lessons: Lesson[];
  vocabulary: VocabularyItem[];
  dictationResults: DictationResult[];
  noteAttempts: NoteAttempt[];
  examAttempts: ExamAttempt[];
}
