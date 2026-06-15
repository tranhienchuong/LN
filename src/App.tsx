import { useEffect, useMemo, useState } from "react";
import { BarChart3, BookOpen, GraduationCap, Headphones, Library, ListChecks } from "lucide-react";
import { createInitialData } from "./data/sampleLesson";
import { DictationMode } from "./components/DictationMode";
import { ExamMode } from "./components/ExamMode";
import { LessonEditor } from "./components/LessonEditor";
import { LessonLibrary } from "./components/LessonLibrary";
import { NoteTakingMode } from "./components/NoteTakingMode";
import { PracticePlayer } from "./components/PracticePlayer";
import { ProgressPage } from "./components/ProgressPage";
import { TranscriptPanel } from "./components/TranscriptPanel";
import { VocabularyPage } from "./components/VocabularyPage";
import type {
  AIQuestion,
  AIVocabularyItem,
  AppData,
  DictationResult,
  ExamAttempt,
  Lesson,
  NoteAttempt,
  VocabularyItem,
} from "./types";
import {
  type AISettings,
  emptyModelNotes,
  loadAISettings,
  normalizeQuestionType,
  normalizeVocabularyItem,
  saveAISettings,
} from "./utils/ai";
import { buildTranscriptSegments, createId } from "./utils/text";
import { loadFromStorage, saveToStorage } from "./utils/storage";
import "./styles.css";

type Tab = "library" | "practice" | "vocabulary" | "progress";
type PracticeMode = "transcript" | "dictation" | "notes" | "exam";

const navItems: Array<{ id: Tab; label: string; icon: typeof Library }> = [
  { id: "library", label: "Library", icon: Library },
  { id: "practice", label: "Practice", icon: Headphones },
  { id: "vocabulary", label: "Vocabulary", icon: BookOpen },
  { id: "progress", label: "Progress", icon: BarChart3 },
];

const normalizeWord = (word: string) => word.trim().toLowerCase();

function createVocabularyItem(
  word: string,
  lesson: Lesson,
  details?: Partial<Pick<VocabularyItem, "meaning" | "exampleSentence" | "pronunciationNote">>,
): VocabularyItem {
  const now = new Date().toISOString();
  return {
    id: createId("vocab"),
    word: word.trim(),
    meaning: details?.meaning ?? "",
    exampleSentence: details?.exampleSentence ?? "",
    pronunciationNote: details?.pronunciationNote ?? "",
    sourceLessonId: lesson.id,
    sourceLessonTitle: lesson.title,
    status: "new",
    correctReviews: 0,
    incorrectReviews: 0,
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeLesson(lesson: Lesson): Lesson {
  const legacyLesson = lesson as Lesson & {
    shorthandNotes?: string;
    aiQuestions?: AIQuestion[];
  };
  const modelNotes = {
    ...emptyModelNotes,
    ...(lesson.modelNotes ?? {}),
    shorthandNotes:
      lesson.modelNotes?.shorthandNotes ?? legacyLesson.shorthandNotes ?? emptyModelNotes.shorthandNotes,
  };

  return {
    ...lesson,
    transcript: lesson.transcript ?? "",
    segments: buildTranscriptSegments(lesson.transcript ?? "", lesson.segments ?? []),
    modelNotes,
    questions: (lesson.questions ?? legacyLesson.aiQuestions ?? []).map((question) => ({
      ...question,
      questionType: normalizeQuestionType(question.questionType),
      explanation: question.explanation ?? "",
    })),
    aiVocabulary: (lesson.aiVocabulary ?? []).map(normalizeVocabularyItem),
    vocabularyWords: lesson.vocabularyWords ?? [],
    unknownWords: lesson.unknownWords ?? [],
  };
}

function normalizeAppData(stored: AppData): AppData {
  const fallback = createInitialData();
  const partial = stored as Partial<AppData>;
  return {
    lessons: (partial.lessons?.length ? partial.lessons : fallback.lessons).map(normalizeLesson),
    vocabulary: partial.vocabulary ?? fallback.vocabulary,
    dictationResults: partial.dictationResults ?? [],
    noteAttempts: partial.noteAttempts ?? [],
    examAttempts: partial.examAttempts ?? [],
  };
}

function App() {
  const [data, setData] = useState<AppData>(() => createInitialData());
  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("library");
  const [practiceMode, setPracticeMode] = useState<PracticeMode>("transcript");
  const [selectedLessonId, setSelectedLessonId] = useState("lesson-demo-campus-sustainability");
  const [editorLesson, setEditorLesson] = useState<Lesson | null | undefined>(undefined);
  const [transcriptHidden, setTranscriptHidden] = useState(true);
  const [aiSettings, setAISettings] = useState<AISettings>(() => loadAISettings());

  useEffect(() => {
    loadFromStorage(createInitialData()).then((stored) => {
      const normalized = normalizeAppData(stored);
      setData(normalized);
      setSelectedLessonId(normalized.lessons[0]?.id ?? "");
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) {
      void saveToStorage(data);
    }
  }, [data, loaded]);

  const updateAISettings = (settings: AISettings) => {
    setAISettings(settings);
    saveAISettings(settings);
  };

  useEffect(() => {
    if (!data.lessons.length) {
      setSelectedLessonId("");
      return;
    }
    if (!data.lessons.some((lesson) => lesson.id === selectedLessonId)) {
      setSelectedLessonId(data.lessons[0].id);
    }
  }, [data.lessons, selectedLessonId]);

  const selectedLesson = useMemo(
    () => data.lessons.find((lesson) => lesson.id === selectedLessonId),
    [data.lessons, selectedLessonId],
  );

  const upsertLessonVocabulary = (lesson: Lesson, words: string[], aiVocabulary: AIVocabularyItem[]) => {
    setData((current) => {
      const existingKeys = new Set(
        current.vocabulary
          .filter((item) => item.sourceLessonId === lesson.id)
          .map((item) => normalizeWord(item.word)),
      );
      const aiByWord = new Map(aiVocabulary.map((item) => [normalizeWord(item.word), item]));
      const newItems = words
        .map((word) => word.trim())
        .filter(Boolean)
        .filter((word) => !existingKeys.has(normalizeWord(word)))
        .map((word) => {
          const aiItem = aiByWord.get(normalizeWord(word));
          return createVocabularyItem(word, lesson, {
            meaning: aiItem?.meaning,
            exampleSentence: aiItem?.exampleSentence,
            pronunciationNote: aiItem?.pronunciationNote,
          });
        });

      return {
        ...current,
        vocabulary: [
          ...current.vocabulary.map((item) =>
            item.sourceLessonId === lesson.id
              ? {
                  ...item,
                  ...(aiByWord.get(normalizeWord(item.word)) ?? {}),
                  sourceLessonTitle: lesson.title,
                  updatedAt: new Date().toISOString(),
                }
              : item,
          ),
          ...newItems,
        ],
      };
    });
  };

  const saveLesson = (lesson: Lesson) => {
    const aiVocabulary = (lesson.aiVocabulary ?? [])
      .map(normalizeVocabularyItem)
      .filter((item) => item.word.trim());
    const vocabularyWords = [
      ...new Set([
        ...(lesson.vocabularyWords ?? []),
        ...aiVocabulary.map((item) => normalizeWord(item.word)),
      ]),
    ];
    const cleanLesson = {
      ...lesson,
      modelNotes: { ...emptyModelNotes, ...(lesson.modelNotes ?? {}) },
      questions: (lesson.questions ?? [])
        .map((question) => ({
          ...question,
          questionType: normalizeQuestionType(question.questionType),
          questionText: question.questionText.trim(),
          answerKey: question.answerKey.trim(),
          explanation: question.explanation?.trim() ?? "",
        }))
        .filter((question) => question.questionText || question.answerKey),
      aiVocabulary,
      vocabularyWords,
      unknownWords: [...new Set(lesson.unknownWords.map(normalizeWord))],
      segments: buildTranscriptSegments(lesson.transcript, lesson.segments),
    };
    setData((current) => ({
      ...current,
      lessons: current.lessons.some((item) => item.id === cleanLesson.id)
        ? current.lessons.map((item) => (item.id === cleanLesson.id ? cleanLesson : item))
        : [cleanLesson, ...current.lessons],
    }));
    upsertLessonVocabulary(cleanLesson, vocabularyWords, aiVocabulary);
    setSelectedLessonId(cleanLesson.id);
    setEditorLesson(undefined);
  };

  const deleteLesson = (lessonId: string) => {
    const lesson = data.lessons.find((item) => item.id === lessonId);
    if (!lesson || !window.confirm(`Delete "${lesson.title}"?`)) return;
    setData((current) => ({
      ...current,
      lessons: current.lessons.filter((item) => item.id !== lessonId),
      vocabulary: current.vocabulary.filter((item) => item.sourceLessonId !== lessonId),
      dictationResults: current.dictationResults.filter((result) => result.lessonId !== lessonId),
      noteAttempts: current.noteAttempts.filter((attempt) => attempt.lessonId !== lessonId),
      examAttempts: current.examAttempts.filter((attempt) => attempt.lessonId !== lessonId),
    }));
  };

  const addVocabularyFromLesson = (word: string) => {
    if (!selectedLesson || !word.trim()) return;
    const cleanWord = normalizeWord(word);
    setData((current) => {
      const hasWord = current.vocabulary.some(
        (item) => item.sourceLessonId === selectedLesson.id && normalizeWord(item.word) === cleanWord,
      );
      return {
        ...current,
        lessons: current.lessons.map((lesson) =>
          lesson.id === selectedLesson.id
            ? {
                ...lesson,
                vocabularyWords: [...new Set([...lesson.vocabularyWords, cleanWord])],
                updatedAt: new Date().toISOString(),
              }
            : lesson,
        ),
        vocabulary: hasWord
          ? current.vocabulary
          : [...current.vocabulary, createVocabularyItem(cleanWord, selectedLesson)],
      };
    });
  };

  const toggleUnknownWord = (word: string) => {
    if (!selectedLesson || !word.trim()) return;
    const cleanWord = normalizeWord(word);
    setData((current) => ({
      ...current,
      lessons: current.lessons.map((lesson) => {
        if (lesson.id !== selectedLesson.id) return lesson;
        const existing = new Set(lesson.unknownWords.map(normalizeWord));
        if (existing.has(cleanWord)) existing.delete(cleanWord);
        else existing.add(cleanWord);
        return {
          ...lesson,
          unknownWords: [...existing],
          updatedAt: new Date().toISOString(),
        };
      }),
    }));
  };

  const saveDictationResult = (result: DictationResult) => {
    setData((current) => ({
      ...current,
      dictationResults: [...current.dictationResults, result],
    }));
  };

  const saveExamAttempt = (attempt: ExamAttempt) => {
    setData((current) => ({
      ...current,
      examAttempts: [...current.examAttempts, attempt],
    }));
  };

  const saveNoteAttempt = (attempt: NoteAttempt) => {
    setData((current) => ({
      ...current,
      noteAttempts: [...current.noteAttempts, attempt],
    }));
  };

  const updateVocabulary = (id: string, updates: Partial<VocabularyItem>) => {
    setData((current) => ({
      ...current,
      vocabulary: current.vocabulary.map((item) =>
        item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item,
      ),
    }));
  };

  const reviewVocabulary = (id: string, isCorrect: boolean) => {
    setData((current) => ({
      ...current,
      vocabulary: current.vocabulary.map((item) => {
        if (item.id !== id) return item;
        const correctReviews = item.correctReviews + (isCorrect ? 1 : 0);
        const incorrectReviews = item.incorrectReviews + (isCorrect ? 0 : 1);
        return {
          ...item,
          correctReviews,
          incorrectReviews,
          status: isCorrect && correctReviews >= 3 ? "mastered" : isCorrect ? "learning" : "learning",
          updatedAt: new Date().toISOString(),
        };
      }),
    }));
  };

  const openPractice = (lessonId: string) => {
    setSelectedLessonId(lessonId);
    setActiveTab("practice");
  };

  const renderPractice = () => {
    if (!selectedLesson) {
      return (
        <div className="empty-state surface">
          <ListChecks size={34} />
          <h2>Choose or create a lesson</h2>
          <p>Practice modes appear after you select a lesson from the Library.</p>
        </div>
      );
    }

    return (
      <section className="page-stack">
        <div className="practice-header">
          <div>
            <p className="eyebrow">Practice</p>
            <h1>{selectedLesson.title}</h1>
          </div>
          <select value={selectedLesson.id} onChange={(event) => setSelectedLessonId(event.target.value)}>
            {data.lessons.map((lesson) => (
              <option value={lesson.id} key={lesson.id}>
                {lesson.title}
              </option>
            ))}
          </select>
        </div>

        <div className="mode-tabs" role="tablist" aria-label="Practice modes">
          {[
            ["transcript", "Transcript"],
            ["dictation", "Dictation"],
            ["notes", "Note-taking"],
            ["exam", "Exam"],
          ].map(([mode, label]) => (
            <button
              key={mode}
              className={practiceMode === mode ? "active" : ""}
              onClick={() => setPracticeMode(mode as PracticeMode)}
            >
              {label}
            </button>
          ))}
        </div>

        {practiceMode !== "exam" && <PracticePlayer lesson={selectedLesson} />}

        {practiceMode === "transcript" && (
          <TranscriptPanel
            lesson={selectedLesson}
            hidden={transcriptHidden}
            onToggleHidden={() => setTranscriptHidden((current) => !current)}
            onAddVocabulary={addVocabularyFromLesson}
            onToggleUnknownWord={toggleUnknownWord}
          />
        )}

        {practiceMode === "dictation" && (
          <DictationMode lesson={selectedLesson} onSaveResult={saveDictationResult} />
        )}

        {practiceMode === "notes" && (
          <NoteTakingMode
            lesson={selectedLesson}
            aiSettings={aiSettings}
            onAddVocabulary={addVocabularyFromLesson}
            onToggleUnknownWord={toggleUnknownWord}
            onSaveAttempt={saveNoteAttempt}
          />
        )}

        {practiceMode === "exam" && (
          <ExamMode lesson={selectedLesson} aiSettings={aiSettings} onSaveAttempt={saveExamAttempt} />
        )}
      </section>
    );
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <GraduationCap size={24} />
          </div>
          <div>
            <strong>Listening Note Trainer</strong>
            <span>Listening and Note-taking</span>
          </div>
        </div>

        <nav className="main-nav" aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={activeTab === item.id ? "active" : ""}
                onClick={() => setActiveTab(item.id)}
              >
                <Icon size={19} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="content">
        {activeTab === "library" && (
          <>
            {editorLesson !== undefined && (
              <LessonEditor
                lesson={editorLesson}
                aiSettings={aiSettings}
                onAISettingsChange={updateAISettings}
                onSave={saveLesson}
                onCancel={() => setEditorLesson(undefined)}
              />
            )}
            <LessonLibrary
              lessons={data.lessons}
              selectedLessonId={selectedLessonId}
              onCreate={() => setEditorLesson(null)}
              onEdit={(lesson) => setEditorLesson(lesson)}
              onDelete={deleteLesson}
              onPractice={openPractice}
            />
          </>
        )}

        {activeTab === "practice" && renderPractice()}

        {activeTab === "vocabulary" && (
          <VocabularyPage
            vocabulary={data.vocabulary}
            onUpdateVocabulary={updateVocabulary}
            onReviewVocabulary={reviewVocabulary}
          />
        )}

        {activeTab === "progress" && <ProgressPage data={data} />}
      </main>
    </div>
  );
}

export default App;
