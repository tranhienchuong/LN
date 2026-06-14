import type { AppData, Lesson } from "../types";

const now = new Date().toISOString();

export const sampleLesson: Lesson = {
  id: "lesson-demo-campus-sustainability",
  title: "Demo: Campus Sustainability",
  topic: "Environmental studies lecture",
  transcript:
    "The main point is that universities can reduce waste when students, staff, and local partners work together. First, dining halls can measure food waste every week and adjust how much they prepare. For example, one campus reduced leftovers by 18 percent after tracking popular meals. Another reason this matters is cost. When less food is thrown away, the university spends less money on disposal. However, recycling alone is not enough because many disposable cups and containers cannot be processed easily. As a result, some schools introduce reusable containers and small deposits. In conclusion, successful sustainability programs combine measurement, student habits, and clear campus rules.",
  vocabularyWords: ["sustainability", "leftovers", "disposal", "reusable", "deposit"],
  unknownWords: [],
  createdAt: now,
  updatedAt: now,
};

export const createInitialData = (): AppData => ({
  lessons: [sampleLesson],
  vocabulary: sampleLesson.vocabularyWords.map((word) => ({
    id: `vocab-demo-${word}`,
    word,
    meaning: "",
    exampleSentence: "",
    pronunciationNote: "",
    sourceLessonId: sampleLesson.id,
    sourceLessonTitle: sampleLesson.title,
    status: "new",
    correctReviews: 0,
    incorrectReviews: 0,
    createdAt: now,
    updatedAt: now,
  })),
  dictationResults: [],
  examAttempts: [],
});
