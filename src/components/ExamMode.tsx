import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Timer } from "lucide-react";
import type { ExamAttempt, ExamChecklist, ExamChecklistKey, Lesson } from "../types";
import type { AISettings } from "../utils/ai";
import { createId, extractKeywords } from "../utils/text";
import { AIQuestionPractice } from "./AIQuestionPractice";
import { PracticePlayer } from "./PracticePlayer";
import { TranscriptPanel } from "./TranscriptPanel";

interface ExamModeProps {
  lesson: Lesson;
  aiSettings: AISettings;
  onSaveAttempt: (attempt: ExamAttempt) => void;
}

const checklistLabels: Record<ExamChecklistKey, string> = {
  topic: "Did I catch the topic?",
  mainIdea: "Did I catch the main idea?",
  examples: "Did I catch examples?",
  numbersNames: "Did I catch numbers/names?",
  contrastCauseEffect: "Did I catch contrast/cause-effect?",
};

const emptyChecklist: ExamChecklist = {
  topic: false,
  mainIdea: false,
  examples: false,
  numbersNames: false,
  contrastCauseEffect: false,
};

function formatTimer(seconds: number) {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = Math.max(0, seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
}

export function ExamMode({ lesson, aiSettings, onSaveAttempt }: ExamModeProps) {
  const [listens, setListens] = useState<1 | 2>(1);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(8);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(timeLimitMinutes * 60);
  const [listenCount, setListenCount] = useState(0);
  const [notes, setNotes] = useState("");
  const [checklist, setChecklist] = useState<ExamChecklist>(emptyChecklist);
  const [saved, setSaved] = useState(false);
  const keywords = useMemo(() => extractKeywords(lesson.transcript), [lesson.transcript]);

  useEffect(() => {
    if (!started || finished) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          setFinished(true);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [started, finished]);

  const startExam = () => {
    setStarted(true);
    setFinished(false);
    setSecondsLeft(timeLimitMinutes * 60);
    setListenCount(0);
    setNotes("");
    setChecklist(emptyChecklist);
    setSaved(false);
  };

  const saveAttempt = () => {
    onSaveAttempt({
      id: createId("exam"),
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      listens,
      timeLimitMinutes,
      notes,
      checklist,
      createdAt: new Date().toISOString(),
    });
    setSaved(true);
  };

  if (!started) {
    return (
      <section className="surface mode-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Exam mode</p>
            <h2>Set your listening conditions</h2>
          </div>
        </div>

        <div className="exam-setup">
          <label>
            <span>Number of listens</span>
            <div className="segmented">
              {[1, 2].map((value) => (
                <button
                  key={value}
                  className={listens === value ? "active" : ""}
                  type="button"
                  onClick={() => setListens(value as 1 | 2)}
                >
                  {value}
                </button>
              ))}
            </div>
          </label>

          <label>
            <span>Time limit for notes</span>
            <input
              type="number"
              min={1}
              max={60}
              value={timeLimitMinutes}
              onChange={(event) =>
                setTimeLimitMinutes(Math.max(1, Math.min(60, Number(event.target.value) || 1)))
              }
            />
          </label>
        </div>

        <button className="primary-button" onClick={startExam}>
          <Timer size={18} />
          Start exam practice
        </button>
      </section>
    );
  }

  if (!finished) {
    return (
      <section className="mode-grid">
        <div className="exam-active-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Exam mode</p>
              <h2>Transcript hidden</h2>
            </div>
            <span className="timer-badge">{formatTimer(secondsLeft)}</span>
          </div>

          <PracticePlayer
            lesson={lesson}
            listenLimit={listens}
            listensUsed={listenCount}
            allowSkip={false}
            allowSeeking={false}
            onListenStart={() => setListenCount((current) => Math.min(listens, current + 1))}
          />

          <label>
            <span>Exam notes</span>
            <textarea
              className="exam-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Write your notes while listening..."
            />
          </label>

          <button className="primary-button" onClick={() => setFinished(true)}>
            Finish and review
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="comparison-stack">
      <section className="surface mode-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Exam review</p>
            <h2>Compare your notes</h2>
          </div>
          {saved && <span className="score-badge">Saved</span>}
        </div>

        <div className="saved-notes">
          <h3>Your notes</h3>
          <p>{notes || "No notes written."}</p>
        </div>

        <div>
          <p className="eyebrow">Keyword helper</p>
          <h3>Important terms from the transcript</h3>
        </div>
        <div className="keyword-list">
          {keywords.map((keyword) => (
            <span className={`keyword ${keyword.type}`} key={`${keyword.term}-${keyword.type}`}>
              {keyword.term}
              <small>{keyword.count}</small>
            </span>
          ))}
        </div>

        <div className="checklist">
          {(Object.keys(checklistLabels) as ExamChecklistKey[]).map((key) => (
            <label key={key} className="check-row">
              <input
                type="checkbox"
                checked={checklist[key]}
                onChange={(event) =>
                  setChecklist((current) => ({ ...current, [key]: event.target.checked }))
                }
              />
              <span>{checklistLabels[key]}</span>
            </label>
          ))}
        </div>

        <div className="inline-actions">
          <button className="primary-button" onClick={saveAttempt} disabled={saved}>
            <BadgeCheck size={18} />
            Save attempt
          </button>
          <button className="secondary-button" onClick={() => setStarted(false)}>
            New attempt
          </button>
        </div>
      </section>

      <TranscriptPanel lesson={lesson} hidden={false} allowActions={false} />

      <AIQuestionPractice lesson={lesson} aiSettings={aiSettings} userNotes={notes} />
    </section>
  );
}
