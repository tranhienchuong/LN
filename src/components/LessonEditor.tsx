import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { Brain, Clock, Plus, Save, Sparkles, Trash2, Upload, X } from "lucide-react";
import type { AIQuestion, AIQuestionType, AIVocabularyItem, Lesson, MediaAsset, TranscriptSegment } from "../types";
import {
  type AISettings,
  emptyModelNotes,
  generateStudyMaterialsWithAI,
  getConfiguredModel,
  hasConfiguredAI,
  normalizeQuestion,
  normalizeQuestionType,
  normalizeVocabularyItem,
} from "../utils/ai";
import { buildTranscriptSegments, createId } from "../utils/text";

interface LessonEditorProps {
  lesson?: Lesson | null;
  aiSettings: AISettings;
  onAISettingsChange: (settings: AISettings) => void;
  onSave: (lesson: Lesson) => void;
  onCancel: () => void;
}

const noteFields: Array<[keyof typeof emptyModelNotes, string]> = [
  ["topic", "Topic"],
  ["mainIdea", "Main idea"],
  ["details", "Details"],
  ["examples", "Examples"],
  ["numbersNames", "Numbers/dates/names"],
  ["causeEffect", "Cause/effect"],
  ["contrast", "Contrast"],
  ["conclusion", "Conclusion"],
];

const questionTypes: AIQuestionType[] = [
  "main_idea",
  "detail",
  "example",
  "number_name",
  "cause_effect",
  "contrast",
  "inference",
  "conclusion",
];

const emptyLesson = (): Lesson => {
  const now = new Date().toISOString();
  return {
    id: createId("lesson"),
    title: "",
    topic: "",
    transcript: "",
    segments: [],
    modelNotes: emptyModelNotes,
    questions: [],
    aiVocabulary: [],
    vocabularyWords: [],
    unknownWords: [],
    createdAt: now,
    updatedAt: now,
  };
};

export function LessonEditor({
  lesson,
  aiSettings,
  onAISettingsChange,
  onSave,
  onCancel,
}: LessonEditorProps) {
  const [draft, setDraft] = useState<Lesson>(() => lesson ?? emptyLesson());
  const [fileStatus, setFileStatus] = useState("");
  const [aiStatus, setAIStatus] = useState("");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const aiReady = hasConfiguredAI(aiSettings);

  useEffect(() => {
    const nextLesson = lesson ?? emptyLesson();
    setDraft({
      ...nextLesson,
      segments: buildTranscriptSegments(nextLesson.transcript, nextLesson.segments ?? []),
      modelNotes: { ...emptyModelNotes, ...(nextLesson.modelNotes ?? {}) },
      questions: (nextLesson.questions ?? []).map(normalizeQuestion),
      aiVocabulary: (nextLesson.aiVocabulary ?? []).map(normalizeVocabularyItem),
    });
    setFileStatus("");
    setAIStatus("");
    setIsGeneratingAI(false);
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

  const updateModelNote = (key: keyof typeof emptyModelNotes, value: string) => {
    setDraft((current) => ({
      ...current,
      modelNotes: {
        ...(current.modelNotes ?? emptyModelNotes),
        [key]: value,
      },
    }));
  };

  const addQuestion = () => {
    setDraft((current) => ({
      ...current,
      questions: [
        ...(current.questions ?? []),
        {
          id: createId("manual-question"),
          questionText: "",
          questionType: "detail",
          answerKey: "",
          explanation: "",
        },
      ],
    }));
  };

  const updateQuestion = <K extends keyof AIQuestion>(
    questionId: string,
    key: K,
    value: AIQuestion[K],
  ) => {
    setDraft((current) => ({
      ...current,
      questions: (current.questions ?? []).map((question) =>
        question.id === questionId ? { ...question, [key]: value } : question,
      ),
    }));
  };

  const removeQuestion = (questionId: string) => {
    setDraft((current) => ({
      ...current,
      questions: (current.questions ?? []).filter((question) => question.id !== questionId),
    }));
  };

  const addVocabularyItem = () => {
    setDraft((current) => ({
      ...current,
      aiVocabulary: [
        ...(current.aiVocabulary ?? []),
        { word: "", meaning: "", exampleSentence: "", pronunciationNote: "" },
      ],
    }));
  };

  const updateVocabularyItem = <K extends keyof AIVocabularyItem>(
    index: number,
    key: K,
    value: AIVocabularyItem[K],
  ) => {
    setDraft((current) => ({
      ...current,
      aiVocabulary: (current.aiVocabulary ?? []).map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    }));
  };

  const removeVocabularyItem = (index: number) => {
    setDraft((current) => ({
      ...current,
      aiVocabulary: (current.aiVocabulary ?? []).filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const generateStudyMaterials = async () => {
    if (!aiReady) {
      setAIStatus("Add a Groq or OpenRouter API key before generating study materials.");
      return;
    }
    setIsGeneratingAI(true);
    setAIStatus("Generating study materials...");
    try {
      const result = await generateStudyMaterialsWithAI(aiSettings, {
        title: draft.title,
        topic: draft.topic,
        transcript: draft.transcript,
      });
      setDraft((current) => ({
        ...current,
        modelNotes: result.modelNotes,
        questions: result.questions,
        aiVocabulary: result.aiVocabulary,
      }));
      setAIStatus("Study materials generated. Review and edit them before saving.");
    } catch (error) {
      setAIStatus(error instanceof Error ? error.message : "Could not generate study materials.");
    } finally {
      setIsGeneratingAI(false);
    }
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
    const aiVocabulary = (draft.aiVocabulary ?? [])
      .map(normalizeVocabularyItem)
      .filter((item) => item.word.trim());
    const vocabularyWords = [
      ...new Set([
        ...(draft.vocabularyWords ?? []),
        ...aiVocabulary.map((item) => item.word.trim().toLowerCase()).filter(Boolean),
      ]),
    ];

    onSave({
      ...draft,
      title: draft.title.trim(),
      topic: draft.topic.trim(),
      transcript: draft.transcript.trim(),
      segments: normalizeSegmentsForSave(draft.segments),
      modelNotes: { ...emptyModelNotes, ...(draft.modelNotes ?? {}) },
      questions: (draft.questions ?? []).map(normalizeQuestion),
      aiVocabulary,
      vocabularyWords,
      updatedAt: new Date().toISOString(),
    });
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
          placeholder="Paste the transcript here. AI uses this text only, never the audio or video file."
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

      <section className="ai-editor-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">AI settings and generated materials</p>
            <h3>Generate study materials from the transcript</h3>
          </div>
          <Brain size={21} />
        </div>

        <div className="ai-settings-grid">
          <label>
            <span>Provider</span>
            <select
              value={aiSettings.provider}
              onChange={(event) =>
                onAISettingsChange({ ...aiSettings, provider: event.target.value as AISettings["provider"] })
              }
            >
              <option value="openrouter">OpenRouter</option>
              <option value="groq">Groq</option>
            </select>
          </label>
          <label>
            <span>{aiSettings.provider === "groq" ? "Groq API key" : "OpenRouter API key"}</span>
            <input
              type="password"
              value={aiSettings.provider === "groq" ? aiSettings.groqApiKey : aiSettings.openrouterApiKey}
              onChange={(event) =>
                onAISettingsChange(
                  aiSettings.provider === "groq"
                    ? { ...aiSettings, groqApiKey: event.target.value }
                    : { ...aiSettings, openrouterApiKey: event.target.value },
                )
              }
              placeholder="Stored locally in this browser"
            />
          </label>
          <label>
            <span>Model</span>
            <input
              value={getConfiguredModel(aiSettings)}
              onChange={(event) =>
                onAISettingsChange(
                  aiSettings.provider === "groq"
                    ? { ...aiSettings, groqModel: event.target.value }
                    : { ...aiSettings, openrouterModel: event.target.value },
                )
              }
            />
          </label>
        </div>

        <div className="inline-actions">
          <button
            className="primary-button"
            type="button"
            onClick={generateStudyMaterials}
            disabled={!draft.transcript.trim() || isGeneratingAI}
          >
            <Sparkles size={17} />
            {isGeneratingAI ? "Generating..." : "Generate study materials with AI"}
          </button>
        </div>
        {!aiReady && (
          <p className="helper-text">
            AI is optional. Add an API key to generate materials automatically, or edit the fallback fields below.
          </p>
        )}
        {aiStatus && <p className="helper-text">{aiStatus}</p>}

        <div className="model-notes-grid">
          {noteFields.map(([key, label]) => (
            <label key={key}>
              <span>{label}</span>
              <textarea
                value={(draft.modelNotes ?? emptyModelNotes)[key]}
                onChange={(event) => updateModelNote(key, event.target.value)}
              />
            </label>
          ))}
        </div>

        <label>
          <span>Shorthand paper-style notes</span>
          <textarea
            value={(draft.modelNotes ?? emptyModelNotes).shorthandNotes}
            onChange={(event) => updateModelNote("shorthandNotes", event.target.value)}
            placeholder="Use bc, ex, ↑, ↓, →, ≠, ! where helpful."
          />
        </label>

        <div className="section-heading">
          <div>
            <p className="eyebrow">Question bank</p>
            <h3>Hidden until post-listening review</h3>
          </div>
          <button className="secondary-button" type="button" onClick={addQuestion}>
            <Plus size={17} />
            Add question
          </button>
        </div>
        <div className="question-editor-list">
          {(draft.questions ?? []).map((question, index) => (
            <article className="question-editor-card" key={question.id}>
              <div className="section-heading">
                <strong>Question {index + 1}</strong>
                <button
                  className="icon-button danger"
                  type="button"
                  onClick={() => removeQuestion(question.id)}
                  aria-label={`Remove question ${index + 1}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <label>
                <span>Question text</span>
                <textarea
                  value={question.questionText}
                  onChange={(event) => updateQuestion(question.id, "questionText", event.target.value)}
                />
              </label>
              <div className="form-grid">
                <label>
                  <span>Question type</span>
                  <select
                    value={question.questionType}
                    onChange={(event) =>
                      updateQuestion(question.id, "questionType", normalizeQuestionType(event.target.value))
                    }
                  >
                    {questionTypes.map((type) => (
                      <option value={type} key={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Answer key</span>
                  <textarea
                    value={question.answerKey}
                    onChange={(event) => updateQuestion(question.id, "answerKey", event.target.value)}
                  />
                </label>
              </div>
              <label>
                <span>Explanation</span>
                <textarea
                  value={question.explanation ?? ""}
                  onChange={(event) => updateQuestion(question.id, "explanation", event.target.value)}
                />
              </label>
            </article>
          ))}
        </div>

        <div className="section-heading">
          <div>
            <p className="eyebrow">Academic vocabulary</p>
            <h3>Generated from the transcript</h3>
          </div>
          <button className="secondary-button" type="button" onClick={addVocabularyItem}>
            <Plus size={17} />
            Add word
          </button>
        </div>
        <div className="question-editor-list">
          {(draft.aiVocabulary ?? []).map((item, index) => (
            <article className="question-editor-card" key={`${item.word}-${index}`}>
              <div className="section-heading">
                <strong>Vocabulary {index + 1}</strong>
                <button
                  className="icon-button danger"
                  type="button"
                  onClick={() => removeVocabularyItem(index)}
                  aria-label={`Remove vocabulary ${index + 1}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="form-grid">
                <label>
                  <span>Word</span>
                  <input
                    value={item.word}
                    onChange={(event) => updateVocabularyItem(index, "word", event.target.value)}
                  />
                </label>
                <label>
                  <span>Meaning</span>
                  <input
                    value={item.meaning}
                    onChange={(event) => updateVocabularyItem(index, "meaning", event.target.value)}
                  />
                </label>
              </div>
              <label>
                <span>Example sentence</span>
                <textarea
                  value={item.exampleSentence}
                  onChange={(event) => updateVocabularyItem(index, "exampleSentence", event.target.value)}
                />
              </label>
              <label>
                <span>Pronunciation note</span>
                <input
                  value={item.pronunciationNote ?? ""}
                  onChange={(event) => updateVocabularyItem(index, "pronunciationNote", event.target.value)}
                />
              </label>
            </article>
          ))}
        </div>
      </section>

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
