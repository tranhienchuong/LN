import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { Clock, Save, Trash2, Upload, X } from "lucide-react";
import type { Lesson, MediaAsset, TranscriptSegment } from "../types";
import { buildTranscriptSegments, createId } from "../utils/text";

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
    segments: [],
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
    setDraft({
      ...nextLesson,
      segments: buildTranscriptSegments(nextLesson.transcript, nextLesson.segments ?? []),
    });
    setVocabText(nextLesson.vocabularyWords.join("\n"));
    setFileStatus("");
  }, [lesson]);

  const updateDraft = <K extends keyof Lesson>(key: K, value: Lesson[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const updateTranscript = (transcript: string) => {
    setDraft((current) => ({
      ...current,
      transcript,
      segments: buildTranscriptSegments(transcript, current.segments),
    }));
  };

  const updateSegmentTime = (
    segmentId: string,
    key: "startTime" | "endTime",
    value: string,
  ) => {
    const parsed = value === "" ? undefined : Math.max(0, Number(value));
    setDraft((current) => ({
      ...current,
      segments: current.segments.map((segment) =>
        segment.id === segmentId
          ? { ...segment, [key]: Number.isFinite(parsed) ? parsed : undefined }
          : segment,
      ),
    }));
  };

  const normalizeSegmentsForSave = (segments: TranscriptSegment[]) =>
    buildTranscriptSegments(draft.transcript, segments).map((segment) => ({
      ...segment,
      startTime: Number.isFinite(segment.startTime) ? segment.startTime : undefined,
      endTime: Number.isFinite(segment.endTime) ? segment.endTime : undefined,
    }));

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
        segments: normalizeSegmentsForSave(draft.segments),
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
          onChange={(event) => updateTranscript(event.target.value)}
          placeholder="Paste the transcript here. It will be used for dictation, comparison, vocabulary, and keyword practice."
        />
      </label>

      <section className="timestamp-editor">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Dictation timestamps</p>
            <h3>Sentence start and end times</h3>
          </div>
          <Clock size={20} />
        </div>
        <p className="helper-text">
          Times are optional. Add seconds from the media file to enable sentence playback and looping.
        </p>
        <div className="timestamp-list">
          {draft.segments.map((segment, index) => (
            <div className="timestamp-row" key={segment.id}>
              <div>
                <strong>{index + 1}</strong>
                <p>{segment.text}</p>
              </div>
              <div className="time-inputs">
                <label>
                  <span>Start</span>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={segment.startTime ?? ""}
                    onChange={(event) => updateSegmentTime(segment.id, "startTime", event.target.value)}
                    placeholder="0.0"
                  />
                </label>
                <label>
                  <span>End</span>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={segment.endTime ?? ""}
                    onChange={(event) => updateSegmentTime(segment.id, "endTime", event.target.value)}
                    placeholder="4.5"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      </section>

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
