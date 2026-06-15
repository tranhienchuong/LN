import { useMemo, useState } from "react";
import { FileText, Plus } from "lucide-react";
import type { Lesson, NoteAttempt } from "../types";
import { createId, extractKeywords } from "../utils/text";
import { TranscriptPanel } from "./TranscriptPanel";

interface NoteTakingModeProps {
  lesson: Lesson;
  onAddVocabulary: (word: string) => void;
  onToggleUnknownWord: (word: string) => void;
  onSaveAttempt: (attempt: NoteAttempt) => void;
}

const fields = [
  "Topic",
  "Main idea",
  "Details",
  "Examples",
  "Numbers/dates/names",
  "Cause/effect",
  "Contrast",
  "Conclusion",
];

const quickSymbols = [
  ["bc", "because"],
  ["ex", "example"],
  ["↑", "increase"],
  ["↓", "decrease"],
  ["→", "leads to/result"],
  ["≠", "contrast"],
  ["!", "important"],
];

export function NoteTakingMode({
  lesson,
  onAddVocabulary,
  onToggleUnknownWord,
  onSaveAttempt,
}: NoteTakingModeProps) {
  const [templateNotes, setTemplateNotes] = useState<Record<string, string>>({});
  const [freeNotes, setFreeNotes] = useState("");
  const [showComparison, setShowComparison] = useState(false);
  const [lastSavedKey, setLastSavedKey] = useState("");
  const keywords = useMemo(() => extractKeywords(lesson.transcript), [lesson.transcript]);

  const updateField = (field: string, value: string) => {
    setTemplateNotes((current) => ({ ...current, [field]: value }));
  };

  const insertSymbol = (symbol: string) => {
    setFreeNotes((current) => `${current}${current.endsWith(" ") || current.length === 0 ? "" : " "}${symbol} `);
  };

  const saveAndCompare = () => {
    const normalizedTemplateNotes = fields.reduce<Record<string, string>>((notes, field) => {
      notes[field] = templateNotes[field] ?? "";
      return notes;
    }, {});
    const attemptKey = JSON.stringify({ templateNotes: normalizedTemplateNotes, freeNotes });
    const hasNotes =
      freeNotes.trim().length > 0 ||
      Object.values(normalizedTemplateNotes).some((value) => value.trim().length > 0);

    if (hasNotes && attemptKey !== lastSavedKey) {
      onSaveAttempt({
        id: createId("note"),
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        templateNotes: normalizedTemplateNotes,
        freeNotes,
        createdAt: new Date().toISOString(),
      });
      setLastSavedKey(attemptKey);
    }

    setShowComparison(true);
  };

  return (
    <section className="mode-grid">
      <div className="surface mode-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Note-taking</p>
            <h2>Capture structure while listening</h2>
          </div>
          <button className="primary-button" onClick={saveAndCompare}>
            <FileText size={18} />
            Compare notes
          </button>
        </div>

        <div className="note-template">
          {fields.map((field) => (
            <label key={field}>
              <span>{field}:</span>
              <textarea
                value={templateNotes[field] ?? ""}
                onChange={(event) => updateField(field, event.target.value)}
                placeholder={`Notes for ${field.toLowerCase()}`}
              />
            </label>
          ))}
        </div>

        <div className="quick-symbols">
          {quickSymbols.map(([symbol, label]) => (
            <button className="symbol-button" key={symbol} onClick={() => insertSymbol(symbol)} title={label}>
              {symbol}
            </button>
          ))}
        </div>

        <label>
          <span>Free notes</span>
          <textarea
            className="large-textarea"
            value={freeNotes}
            onChange={(event) => setFreeNotes(event.target.value)}
            placeholder="Write fast lecture notes here..."
          />
        </label>
      </div>

      {showComparison && (
        <div className="comparison-stack">
          <section className="surface">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Keyword helper</p>
                <h2>Important terms to compare after listening</h2>
              </div>
            </div>
            <div className="keyword-list">
              {keywords.map((keyword) => (
                <span className={`keyword ${keyword.type}`} key={`${keyword.term}-${keyword.type}`}>
                  {keyword.term}
                  <small>{keyword.count}</small>
                </span>
              ))}
            </div>
          </section>

          <TranscriptPanel
            lesson={lesson}
            hidden={false}
            allowActions
            onAddVocabulary={onAddVocabulary}
            onToggleUnknownWord={onToggleUnknownWord}
          />

          <button className="ghost-button" onClick={() => setShowComparison(false)}>
            <Plus size={16} />
            Continue note practice
          </button>
        </div>
      )}
    </section>
  );
}
