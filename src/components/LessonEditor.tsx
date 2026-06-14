import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { Save, Trash2, Upload, X } from "lucide-react";
import type { Lesson, MediaAsset } from "../types";
import { createId } from "../utils/text";

interface LessonEditorProps {
  lesson?: Lesson | null;
  onSave: (lesson: Lesson, vocabularyWords: string[]) => void;
  onCancel: () => void;
}

const emptyLesson = (): Lesson => {
  const now = new Date().toISOString();
  return {
    id: createId("lesson"),
    title: "",
    topic: "",
    transcript: "",
    vocabularyWords: [],
    unknownWords: [],
    createdAt: now,
    updatedAt: now,
  };
};

export function LessonEditor({ lesson, onSave, onCancel }: LessonEditorProps) {
  const [draft, setDraft] = useState<Lesson>(() => lesson ?? emptyLesson());
  const [vocabText, setVocabText] = useState("");
  const [fileStatus, setFileStatus] = useState("");

  useEffect(() => {
    const nextLesson = lesson ?? emptyLesson();
    setDraft(nextLesson);
    setVocabText(nextLesson.vocabularyWords.join("\n"));
    setFileStatus("");
  }, [lesson]);

  const updateDraft = <K extends keyof Lesson>(key: K, value: Lesson[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const media: MediaAsset = {
        name: file.name,
        kind: file.type.startsWith("video") ? "video" : "audio",
        mimeType: file.type || "application/octet-stream",
        dataUrl: String(reader.result),
      };
      updateDraft("media", media);
      setFileStatus(`${file.name} is ready to save.`);
    };
    reader.onerror = () => setFileStatus("Could not read this file. Try another audio or video file.");
    reader.readAsDataURL(file);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const vocabularyWords = vocabText
      .split(/\n|,/g)
      .map((word) => word.trim())
      .filter(Boolean);

    onSave(
      {
        ...draft,
        title: draft.title.trim(),
        topic: draft.topic.trim(),
        transcript: draft.transcript.trim(),
        vocabularyWords,
        updatedAt: new Date().toISOString(),
      },
      vocabularyWords,
    );
  };

  return (
    <form className="editor surface" onSubmit={handleSubmit}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">{lesson ? "Edit lesson" : "New lesson"}</p>
          <h2>{lesson ? lesson.title : "Create a listening lesson"}</h2>
        </div>
        <button className="icon-button" type="button" onClick={onCancel} aria-label="Close editor">
          <X size={18} />
        </button>
      </div>

      <div className="form-grid">
        <label>
          <span>Title</span>
          <input
            required
            value={draft.title}
            onChange={(event) => updateDraft("title", event.target.value)}
            placeholder="Lecture 4: Urban transport"
          />
        </label>

        <label>
          <span>Topic</span>
          <input
            value={draft.topic}
            onChange={(event) => updateDraft("topic", event.target.value)}
            placeholder="Sociology, environment, business..."
          />
        </label>
      </div>

      <label className="file-drop">
        <Upload size={20} />
        <span>{draft.media ? draft.media.name : "Upload audio or video"}</span>
        <input type="file" accept="audio/*,video/*" onChange={handleFileChange} />
      </label>
      {draft.media && (
        <div className="inline-actions">
          <span className="muted">{draft.media.kind.toUpperCase()} file stored locally with this lesson.</span>
          <button
            className="ghost-button danger"
            type="button"
            onClick={() => updateDraft("media", undefined)}
          >
            <Trash2 size={16} />
            Remove media
          </button>
        </div>
      )}
      {fileStatus && <p className="helper-text">{fileStatus}</p>}

      <label>
        <span>Transcript</span>
        <textarea
          required
          className="large-textarea"
          value={draft.transcript}
          onChange={(event) => updateDraft("transcript", event.target.value)}
          placeholder="Paste the transcript here. It will be used for dictation, comparison, vocabulary, and keyword practice."
        />
      </label>

      <label>
        <span>Vocabulary list</span>
        <textarea
          value={vocabText}
          onChange={(event) => setVocabText(event.target.value)}
          placeholder="Add one word per line, or separate words with commas."
        />
      </label>

      <div className="form-footer">
        <button className="secondary-button" type="button" onClick={onCancel}>
          Cancel
        </button>
        <button className="primary-button" type="submit">
          <Save size={18} />
          Save lesson
        </button>
      </div>
    </form>
  );
}
