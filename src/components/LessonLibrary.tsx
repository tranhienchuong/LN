import { BookOpen, FileAudio, Pencil, Plus, Trash2 } from "lucide-react";
import type { Lesson } from "../types";
import { compactPreview } from "../utils/text";

interface LessonLibraryProps {
  lessons: Lesson[];
  selectedLessonId?: string;
  onCreate: () => void;
  onEdit: (lesson: Lesson) => void;
  onDelete: (lessonId: string) => void;
  onPractice: (lessonId: string) => void;
}

export function LessonLibrary({
  lessons,
  selectedLessonId,
  onCreate,
  onEdit,
  onDelete,
  onPractice,
}: LessonLibraryProps) {
  return (
    <section className="page-stack">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">Library</p>
          <h1>Your listening lessons</h1>
        </div>
        <button className="primary-button" onClick={onCreate}>
          <Plus size={18} />
          New lesson
        </button>
      </div>

      <div className="lesson-grid">
        {lessons.map((lesson) => (
          <article
            className={`lesson-card ${lesson.id === selectedLessonId ? "selected" : ""}`}
            key={lesson.id}
          >
            <div className="lesson-card-top">
              <div className="lesson-icon">
                {lesson.media ? <FileAudio size={22} /> : <BookOpen size={22} />}
              </div>
              <div>
                <h2>{lesson.title}</h2>
                <p>{lesson.topic || "No topic yet"}</p>
              </div>
            </div>

            <p className="lesson-preview">{compactPreview(lesson.transcript, 135)}</p>

            <div className="pill-row">
              <span className="pill">{lesson.media ? lesson.media.kind : "transcript only"}</span>
              <span className="pill">{lesson.vocabularyWords.length} words</span>
              <span className="pill">{lesson.unknownWords.length} highlighted</span>
            </div>

            <div className="card-actions">
              <button className="primary-button compact" onClick={() => onPractice(lesson.id)}>
                Practice
              </button>
              <button className="icon-button" onClick={() => onEdit(lesson)} aria-label={`Edit ${lesson.title}`}>
                <Pencil size={17} />
              </button>
              <button
                className="icon-button danger"
                onClick={() => onDelete(lesson.id)}
                aria-label={`Delete ${lesson.title}`}
              >
                <Trash2 size={17} />
              </button>
            </div>
          </article>
        ))}
      </div>

      {lessons.length === 0 && (
        <div className="empty-state surface">
          <BookOpen size={34} />
          <h2>No lessons yet</h2>
          <p>Create a lesson with a transcript and media file to start practicing.</p>
        </div>
      )}
    </section>
  );
}
