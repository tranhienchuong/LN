import { BarChart3, BookOpen, ClipboardCheck, FileText, Headphones, ListChecks } from "lucide-react";
import type { AppData, ExamChecklistKey } from "../types";
import { compactPreview } from "../utils/text";

interface ProgressPageProps {
  data: AppData;
}

const checklistLabels: Record<ExamChecklistKey, string> = {
  topic: "Topic",
  mainIdea: "Main idea",
  examples: "Examples",
  numbersNames: "Numbers/names",
  contrastCauseEffect: "Contrast or cause-effect",
};

export function ProgressPage({ data }: ProgressPageProps) {
  const practicedLessonIds = new Set([
    ...data.dictationResults.map((result) => result.lessonId),
    ...data.noteAttempts.map((attempt) => attempt.lessonId),
    ...data.examAttempts.map((attempt) => attempt.lessonId),
  ]);
  const averageAccuracy = data.dictationResults.length
    ? Math.round(
        data.dictationResults.reduce((total, result) => total + result.accuracy, 0) /
          data.dictationResults.length,
      )
    : 0;
  const recentResults = data.dictationResults.slice(-8).reverse();
  const missedChecklist = data.examAttempts.reduce<Record<ExamChecklistKey, number>>(
    (totals, attempt) => {
      (Object.keys(totals) as ExamChecklistKey[]).forEach((key) => {
        if (!attempt.checklist[key]) totals[key] += 1;
      });
      return totals;
    },
    {
      topic: 0,
      mainIdea: 0,
      examples: 0,
      numbersNames: 0,
      contrastCauseEffect: 0,
    },
  );
  const newWords = data.vocabulary.filter((item) => item.status !== "mastered").length;
  const recentNotes = data.noteAttempts.slice(-5).reverse();

  const summarizeNoteAttempt = (attempt: (typeof data.noteAttempts)[number]) => {
    const templateText = Object.entries(attempt.templateNotes)
      .filter(([, value]) => value.trim().length > 0)
      .map(([key, value]) => `${key}: ${value}`)
      .join(" ");
    return compactPreview(`${templateText} ${attempt.freeNotes}`.trim() || "No note text saved.", 140);
  };

  return (
    <section className="page-stack">
      <div>
        <p className="eyebrow">Progress</p>
        <h1>Practice dashboard</h1>
      </div>

      <div className="stats-grid">
        <article className="surface stat-card">
          <Headphones size={22} />
          <span>{practicedLessonIds.size}</span>
          <p>Lessons practiced</p>
        </article>
        <article className="surface stat-card">
          <BarChart3 size={22} />
          <span>{averageAccuracy}%</span>
          <p>Average dictation</p>
        </article>
        <article className="surface stat-card">
          <BookOpen size={22} />
          <span>{data.vocabulary.length}</span>
          <p>Vocabulary words</p>
        </article>
        <article className="surface stat-card">
          <ClipboardCheck size={22} />
          <span>{data.examAttempts.length}</span>
          <p>Exam attempts</p>
        </article>
        <article className="surface stat-card">
          <FileText size={22} />
          <span>{data.noteAttempts.length}</span>
          <p>Note attempts</p>
        </article>
      </div>

      <section className="surface">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Dictation accuracy history</p>
            <h2>Recent checks</h2>
          </div>
        </div>
        {recentResults.length ? (
          <div className="history-list">
            {recentResults.map((result) => (
              <div className="history-row" key={result.id}>
                <div>
                  <strong>{result.lessonTitle}</strong>
                  <span>{result.sentencePreview}</span>
                </div>
                <div className="bar-track">
                  <span style={{ width: `${result.accuracy}%` }} />
                </div>
                <b>{result.accuracy}%</b>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">Dictation checks will appear here after practice.</p>
        )}
      </section>

      <section className="surface">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Note-taking attempts</p>
            <h2>Recent notes</h2>
          </div>
        </div>
        {recentNotes.length ? (
          <div className="history-list">
            {recentNotes.map((attempt) => (
              <div className="note-history-row" key={attempt.id}>
                <div>
                  <strong>{attempt.lessonTitle}</strong>
                  <span>{new Date(attempt.createdAt).toLocaleString()}</span>
                </div>
                <p>{summarizeNoteAttempt(attempt)}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">Saved note-taking attempts will appear here after you compare notes.</p>
        )}
      </section>

      <section className="surface">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Weak areas checklist</p>
            <h2>What to practice next</h2>
          </div>
          <ListChecks size={22} />
        </div>
        <div className="weak-list">
          <label className="check-row">
            <input type="checkbox" checked={averageAccuracy >= 80 || data.dictationResults.length === 0} readOnly />
            <span>Dictation accuracy is at least 80%</span>
          </label>
          <label className="check-row">
            <input type="checkbox" checked={newWords === 0} readOnly />
            <span>{newWords} vocabulary words still need review</span>
          </label>
          {(Object.keys(missedChecklist) as ExamChecklistKey[]).map((key) => (
            <label className="check-row" key={key}>
              <input type="checkbox" checked={missedChecklist[key] === 0} readOnly />
              <span>
                {checklistLabels[key]} missed in {missedChecklist[key]} exam attempt
                {missedChecklist[key] === 1 ? "" : "s"}
              </span>
            </label>
          ))}
        </div>
      </section>
    </section>
  );
}
