import { useMemo, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import type { DictationComparison, DictationResult, Lesson } from "../types";
import { compactPreview, compareDictationText, createId, splitTranscriptIntoSentences } from "../utils/text";

interface DictationModeProps {
  lesson: Lesson;
  onSaveResult: (result: DictationResult) => void;
}

export function DictationMode({ lesson, onSaveResult }: DictationModeProps) {
  const sentences = useMemo(() => splitTranscriptIntoSentences(lesson.transcript), [lesson.transcript]);
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [comparison, setComparison] = useState<DictationComparison | null>(null);

  const sentence = sentences[sentenceIndex] ?? "";

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
      accuracy: result.accuracy,
      createdAt: new Date().toISOString(),
    });
  };

  if (!sentences.length) {
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
          <h2>Sentence {sentenceIndex + 1} of {sentences.length}</h2>
        </div>
        {comparison && <span className="score-badge">{comparison.accuracy}% accuracy</span>}
      </div>

      <div className="dictation-card">
        <p className="muted">Listen with the player, then type what you hear.</p>
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
          disabled={sentenceIndex === sentences.length - 1}
          onClick={() => moveTo(sentenceIndex + 1)}
        >
          Next
          <ChevronRight size={17} />
        </button>
      </div>
    </section>
  );
}
