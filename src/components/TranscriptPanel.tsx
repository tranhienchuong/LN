import { useMemo, useState } from "react";
import { Eye, EyeOff, Highlighter, Plus } from "lucide-react";
import type { Lesson } from "../types";
import { TRANSITION_PHRASES } from "../utils/text";

interface TranscriptPanelProps {
  lesson: Lesson;
  hidden: boolean;
  onToggleHidden?: () => void;
  allowActions?: boolean;
  onToggleUnknownWord?: (word: string) => void;
  onAddVocabulary?: (word: string) => void;
}

const cleanWord = (word: string) =>
  word
    .toLowerCase()
    .replace(/[^\p{L}\p{N}'-]/gu, "")
    .trim();

const transitionRegex = new RegExp(
  `(${TRANSITION_PHRASES.map((phrase) => phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
  "gi",
);

export function TranscriptPanel({
  lesson,
  hidden,
  onToggleHidden,
  allowActions = true,
  onToggleUnknownWord,
  onAddVocabulary,
}: TranscriptPanelProps) {
  const [selectedWord, setSelectedWord] = useState("");
  const unknownSet = useMemo(() => new Set(lesson.unknownWords.map(cleanWord)), [lesson.unknownWords]);

  const renderPlainSegment = (segment: string, segmentIndex: number) => {
    const pieces = segment.match(/[\p{L}\p{N}'-]+|[^\p{L}\p{N}'-]+/gu) ?? [];
    return pieces.map((piece, index) => {
      const normalized = cleanWord(piece);
      if (!normalized) return <span key={`${segmentIndex}-${index}`}>{piece}</span>;

      const isUnknown = unknownSet.has(normalized);
      return (
        <button
          key={`${segmentIndex}-${index}`}
          className={`transcript-word ${isUnknown ? "unknown" : ""}`}
          type="button"
          onClick={() => {
            if (!allowActions) return;
            setSelectedWord(normalized);
            onToggleUnknownWord?.(normalized);
          }}
        >
          {piece}
        </button>
      );
    });
  };

  const renderParagraph = (paragraph: string, paragraphIndex: number) => {
    const segments = paragraph.split(transitionRegex).filter(Boolean);
    return (
      <p key={paragraphIndex}>
        {segments.map((segment, segmentIndex) => {
          const isTransition = TRANSITION_PHRASES.includes(segment.toLowerCase());
          if (isTransition) {
            return (
              <mark className="transition-mark" key={`${paragraphIndex}-${segmentIndex}`}>
                {segment}
              </mark>
            );
          }
          return renderPlainSegment(segment, paragraphIndex * 1000 + segmentIndex);
        })}
      </p>
    );
  };

  if (hidden) {
    return (
      <section className="surface transcript-panel hidden-panel">
        <div>
          <p className="eyebrow">Transcript</p>
          <h2>Hidden for practice</h2>
        </div>
        {onToggleHidden && (
          <button className="secondary-button" onClick={onToggleHidden}>
            <Eye size={17} />
            Show transcript
          </button>
        )}
      </section>
    );
  }

  const paragraphs = lesson.transcript
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <section className="surface transcript-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Transcript</p>
          <h2>Read, compare, and collect words</h2>
        </div>
        {onToggleHidden && (
          <button className="secondary-button" onClick={onToggleHidden}>
            <EyeOff size={17} />
            Hide
          </button>
        )}
      </div>

      {allowActions && selectedWord && (
        <div className="selected-word-bar">
          <span>
            <Highlighter size={16} />
            {selectedWord}
          </span>
          <button className="ghost-button" onClick={() => onAddVocabulary?.(selectedWord)}>
            <Plus size={16} />
            Add to vocabulary
          </button>
        </div>
      )}

      <div className="transcript-body">
        {paragraphs.length ? paragraphs.map(renderParagraph) : <p>No transcript yet.</p>}
      </div>
    </section>
  );
}
