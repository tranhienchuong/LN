import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, Play, Repeat2, Square } from "lucide-react";
import type { DictationComparison, DictationResult, Lesson } from "../types";
import {
  buildTranscriptSegments,
  compactPreview,
  compareDictationText,
  createId,
  hasSegmentTiming,
} from "../utils/text";

interface DictationModeProps {
  lesson: Lesson;
  onSaveResult: (result: DictationResult) => void;
}

export function DictationMode({ lesson, onSaveResult }: DictationModeProps) {
  const segments = useMemo(
    () => buildTranscriptSegments(lesson.transcript, lesson.segments),
    [lesson.segments, lesson.transcript],
  );
  const mediaRef = useRef<HTMLMediaElement | null>(null);
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [comparison, setComparison] = useState<DictationComparison | null>(null);
  const [isSegmentPlaying, setIsSegmentPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);

  const segment = segments[sentenceIndex];
  const sentence = segment?.text ?? "";
  const canPlaySegment = Boolean(lesson.media && hasSegmentTiming(segment));

  useEffect(() => {
    const element = mediaRef.current;
    if (!element) return;
    element.pause();
    setIsSegmentPlaying(false);
    setIsLooping(false);
  }, [lesson.id, sentenceIndex]);

  const moveTo = (nextIndex: number) => {
    setSentenceIndex(nextIndex);
    setAnswer("");
    setComparison(null);
  };

  const checkAnswer = () => {
    const result = compareDictationText(sentence, answer);
    setComparison(result);
    onSaveResult({
      id: createId("dictation"),
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      sentenceIndex,
      sentencePreview: compactPreview(sentence),
      startTime: segment?.startTime,
      endTime: segment?.endTime,
      accuracy: result.accuracy,
      createdAt: new Date().toISOString(),
    });
  };

  const playSegment = async (loop: boolean) => {
    const element = mediaRef.current;
    if (!element || !canPlaySegment || !segment) return;
    setIsLooping(loop);
    element.currentTime = segment.startTime ?? 0;
    await element.play();
    setIsSegmentPlaying(true);
  };

  const stopSegment = () => {
    const element = mediaRef.current;
    if (!element) return;
    element.pause();
    setIsSegmentPlaying(false);
    setIsLooping(false);
  };

  const handleSegmentTimeUpdate = () => {
    const element = mediaRef.current;
    if (!element || !segment || !hasSegmentTiming(segment)) return;
    if (element.currentTime < (segment.endTime ?? 0)) return;

    if (isLooping) {
      element.currentTime = segment.startTime ?? 0;
      void element.play();
      return;
    }

    element.pause();
    setIsSegmentPlaying(false);
  };

  if (!segments.length) {
    return (
      <section className="surface mode-panel">
        <h2>Dictation mode</h2>
        <p className="muted">Add a transcript to split it into sentence practice cards.</p>
      </section>
    );
  }

  return (
    <section className="surface mode-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Dictation</p>
          <h2>Sentence {sentenceIndex + 1} of {segments.length}</h2>
        </div>
        {comparison && <span className="score-badge">{comparison.accuracy}% accuracy</span>}
      </div>

      {lesson.media && (
        lesson.media.kind === "video" ? (
          <video
            className="sentence-media"
            ref={(node) => {
              mediaRef.current = node;
            }}
            src={lesson.media.dataUrl}
            onTimeUpdate={handleSegmentTimeUpdate}
            onEnded={stopSegment}
          />
        ) : (
          <audio
            className="sentence-media"
            ref={(node) => {
              mediaRef.current = node;
            }}
            src={lesson.media.dataUrl}
            onTimeUpdate={handleSegmentTimeUpdate}
            onEnded={stopSegment}
          />
        )
      )}

      <div className="dictation-card">
        <div className="segment-toolbar">
          <div>
            <p className="muted">Listen with the player, or play this timed sentence if timestamps are set.</p>
            {hasSegmentTiming(segment) ? (
              <span className="segment-time">
                {segment?.startTime?.toFixed(1)}s to {segment?.endTime?.toFixed(1)}s
              </span>
            ) : (
              <span className="segment-time">No timestamp set for this sentence.</span>
            )}
          </div>
          <div className="inline-actions">
            <button
              className="secondary-button"
              onClick={() => playSegment(false)}
              disabled={!canPlaySegment}
              type="button"
            >
              <Play size={17} />
              Play this sentence
            </button>
            <button
              className={isLooping ? "primary-button" : "secondary-button"}
              onClick={() => (isLooping ? stopSegment() : playSegment(true))}
              disabled={!canPlaySegment}
              type="button"
            >
              <Repeat2 size={17} />
              Loop this sentence
            </button>
            {isSegmentPlaying && (
              <button className="ghost-button danger" onClick={stopSegment} type="button">
                <Square size={16} />
                Stop
              </button>
            )}
          </div>
        </div>
        <textarea
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          placeholder="Type the sentence here..."
        />
        <button className="primary-button" onClick={checkAnswer} disabled={!answer.trim()}>
          <CheckCircle2 size={18} />
          Check
        </button>
      </div>

      {comparison && (
        <div className="comparison-box">
          <div className="comparison-legend">
            <span className="legend correct">Correct</span>
            <span className="legend wrong">Wrong</span>
            <span className="legend missing">Missing</span>
          </div>
          <div className="token-row">
            {comparison.tokens.map((token) => (
              <span className={`token ${token.status}`} key={token.id} title={token.expected ? `Expected: ${token.expected}` : undefined}>
                {token.text}
              </span>
            ))}
          </div>
          <p className="expected-sentence">
            <strong>Transcript:</strong> {sentence}
          </p>
        </div>
      )}

      <div className="mode-footer">
        <button
          className="secondary-button"
          disabled={sentenceIndex === 0}
          onClick={() => moveTo(sentenceIndex - 1)}
        >
          <ChevronLeft size={17} />
          Previous
        </button>
        <button
          className="secondary-button"
          disabled={sentenceIndex === segments.length - 1}
          onClick={() => moveTo(sentenceIndex + 1)}
        >
          Next
          <ChevronRight size={17} />
        </button>
      </div>
    </section>
  );
}
