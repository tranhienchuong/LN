import { useMemo, useState } from "react";
import { CheckCircle2, Search, XCircle } from "lucide-react";
import type { VocabularyItem, VocabularyStatus } from "../types";

interface VocabularyPageProps {
  vocabulary: VocabularyItem[];
  onUpdateVocabulary: (id: string, updates: Partial<VocabularyItem>) => void;
  onReviewVocabulary: (id: string, isCorrect: boolean) => void;
}

const statuses: VocabularyStatus[] = ["new", "learning", "mastered"];

export function VocabularyPage({
  vocabulary,
  onUpdateVocabulary,
  onReviewVocabulary,
}: VocabularyPageProps) {
  const [query, setQuery] = useState("");
  const [reviewIndex, setReviewIndex] = useState(0);
  const [reviewAnswer, setReviewAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);

  const filteredVocabulary = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return vocabulary;
    return vocabulary.filter(
      (item) =>
        item.word.toLowerCase().includes(normalized) ||
        item.sourceLessonTitle.toLowerCase().includes(normalized) ||
        item.status.includes(normalized),
    );
  }, [query, vocabulary]);

  const reviewPool = vocabulary.length
    ? [...vocabulary].sort((a, b) => {
        const statusWeight = { new: 0, learning: 1, mastered: 2 };
        return statusWeight[a.status] - statusWeight[b.status] || a.word.localeCompare(b.word);
      })
    : [];
  const reviewItem = reviewPool[reviewIndex % Math.max(reviewPool.length, 1)];

  const markReview = (isCorrect: boolean) => {
    if (!reviewItem) return;
    onReviewVocabulary(reviewItem.id, isCorrect);
    setReviewAnswer("");
    setRevealed(false);
    setReviewIndex((current) => current + 1);
  };

  return (
    <section className="page-stack">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">Vocabulary</p>
          <h1>Collected words</h1>
        </div>
        <label className="search-box">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search words or lessons"
          />
        </label>
      </div>

      <section className="surface review-card">
        <div>
          <p className="eyebrow">Review mode</p>
          <h2>{reviewItem ? reviewItem.word : "No vocabulary yet"}</h2>
          <p className="muted">{reviewItem ? `From ${reviewItem.sourceLessonTitle}` : "Add words from lessons to begin."}</p>
        </div>

        {reviewItem && (
          <>
            <input
              value={reviewAnswer}
              onChange={(event) => setReviewAnswer(event.target.value)}
              placeholder="Type the meaning from memory"
            />
            {revealed && (
              <div className="answer-reveal">
                <strong>Meaning:</strong> {reviewItem.meaning || "No meaning added yet."}
              </div>
            )}
            <div className="inline-actions">
              <button className="secondary-button" onClick={() => setRevealed(true)}>
                Reveal
              </button>
              <button className="ghost-button" onClick={() => markReview(false)}>
                <XCircle size={17} />
                Incorrect
              </button>
              <button className="primary-button" onClick={() => markReview(true)}>
                <CheckCircle2 size={17} />
                Correct
              </button>
            </div>
          </>
        )}
      </section>

      <div className="vocab-list">
        {filteredVocabulary.map((item) => (
          <article className="surface vocab-card" key={item.id}>
            <div className="vocab-card-header">
              <div>
                <h2>{item.word}</h2>
                <p>{item.sourceLessonTitle}</p>
              </div>
              <select
                value={item.status}
                onChange={(event) =>
                  onUpdateVocabulary(item.id, { status: event.target.value as VocabularyStatus })
                }
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div className="vocab-fields">
              <label>
                <span>Meaning</span>
                <input
                  value={item.meaning}
                  onChange={(event) => onUpdateVocabulary(item.id, { meaning: event.target.value })}
                />
              </label>
              <label>
                <span>Example sentence</span>
                <input
                  value={item.exampleSentence}
                  onChange={(event) =>
                    onUpdateVocabulary(item.id, { exampleSentence: event.target.value })
                  }
                />
              </label>
              <label>
                <span>Pronunciation note</span>
                <input
                  value={item.pronunciationNote}
                  onChange={(event) =>
                    onUpdateVocabulary(item.id, { pronunciationNote: event.target.value })
                  }
                />
              </label>
            </div>
          </article>
        ))}
      </div>

      {filteredVocabulary.length === 0 && (
        <div className="empty-state surface">
          <h2>No matching words</h2>
          <p>Highlight words in a transcript or add vocabulary in the lesson editor.</p>
        </div>
      )}
    </section>
  );
}
