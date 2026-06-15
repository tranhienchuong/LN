import { useMemo, useState } from "react";
import { BadgeCheck, MessageSquareText, Sparkles } from "lucide-react";
import type { AIFeedback, Lesson } from "../types";
import {
  type AISettings,
  emptyModelNotes,
  generateFeedbackWithAI,
  hasConfiguredAI,
} from "../utils/ai";
import { extractKeywords } from "../utils/text";

interface AIQuestionPracticeProps {
  lesson: Lesson;
  aiSettings: AISettings;
  userNotes: string;
}

const modelNoteLabels: Array<[keyof typeof emptyModelNotes, string]> = [
  ["topic", "Topic"],
  ["mainIdea", "Main idea"],
  ["details", "Details"],
  ["examples", "Examples"],
  ["numbersNames", "Numbers/dates/names"],
  ["causeEffect", "Cause/effect"],
  ["contrast", "Contrast"],
  ["conclusion", "Conclusion"],
];

export function AIQuestionPractice({ lesson, aiSettings, userNotes }: AIQuestionPracticeProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState<AIFeedback | null>(null);
  const [feedbackStatus, setFeedbackStatus] = useState("");
  const aiReady = hasConfiguredAI(aiSettings);
  const modelNotes = lesson.modelNotes ?? emptyModelNotes;
  const questions = lesson.questions ?? [];
  const aiVocabulary = lesson.aiVocabulary ?? [];
  const keywords = useMemo(() => extractKeywords(lesson.transcript), [lesson.transcript]);

  const hasModelNotes = useMemo(
    () => Object.values(modelNotes).some((value) => value.trim().length > 0),
    [modelNotes],
  );

  const submitAnswers = () => {
    setSubmitted(true);
    setFeedback(null);
    setFeedbackStatus("");
  };

  const getFeedback = async () => {
    if (!aiReady || !submitted) return;
    setFeedbackStatus("Getting AI feedback...");
    try {
      const result = await generateFeedbackWithAI(aiSettings, {
        transcript: lesson.transcript,
        modelNotes,
        questions,
        userAnswers: answers,
        userNotes,
        keywords: keywords.map((keyword) => keyword.term),
      });
      setFeedback(result);
      setFeedbackStatus("");
    } catch (error) {
      setFeedbackStatus(error instanceof Error ? error.message : "Could not get AI feedback.");
    }
  };

  return (
    <section className="surface ai-review-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Post-listening AI study</p>
          <h2>Model notes, questions, and vocabulary</h2>
        </div>
        <MessageSquareText size={22} />
      </div>

      {!hasModelNotes && questions.length === 0 && aiVocabulary.length === 0 && (
        <p className="muted">
          No AI study materials are saved for this lesson yet. Generate them in the lesson editor.
        </p>
      )}

      {hasModelNotes && (
        <div className="model-notes-review">
          <div>
            <p className="eyebrow">Model notes</p>
            <div className="model-note-list">
              {modelNoteLabels.map(([key, label]) => {
                const value = modelNotes[key];
                if (!value.trim()) return null;
                return (
                  <div key={key}>
                    <strong>{label}</strong>
                    <p>{value}</p>
                  </div>
                );
              })}
            </div>
          </div>
          {modelNotes.shorthandNotes.trim() && (
            <div className="shorthand-notes">
              <p className="eyebrow">Shorthand notes</p>
              <p>{modelNotes.shorthandNotes}</p>
            </div>
          )}
        </div>
      )}

      {aiVocabulary.length > 0 && (
        <div>
          <p className="eyebrow">Academic vocabulary</p>
          <div className="keyword-list">
            {aiVocabulary.map((item) => (
              <span className="keyword" key={item.word}>
                {item.word}
              </span>
            ))}
          </div>
        </div>
      )}

      {questions.length > 0 && (
        <div className="question-practice-list">
          {questions.map((question, index) => (
            <article className="question-practice-card" key={question.id}>
              <div className="question-meta">
                <span>Question {index + 1}</span>
                <span>{question.questionType}</span>
              </div>
              <h3>{question.questionText}</h3>
              <textarea
                value={answers[question.id] ?? ""}
                onChange={(event) =>
                  setAnswers((current) => ({ ...current, [question.id]: event.target.value }))
                }
                placeholder="Answer using your paper notes after listening..."
                disabled={submitted}
              />
              {submitted && (
                <div className="answer-key-box">
                  <p>
                    <strong>Your answer:</strong> {answers[question.id] || "No answer typed."}
                  </p>
                  <p>
                    <strong>Answer key:</strong> {question.answerKey}
                  </p>
                  {question.explanation && (
                    <p>
                      <strong>Explanation:</strong> {question.explanation}
                    </p>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {questions.length > 0 && !submitted && (
        <button className="primary-button" type="button" onClick={submitAnswers}>
          <BadgeCheck size={18} />
          Submit answers
        </button>
      )}

      {submitted && (
        <div className="feedback-actions">
          {!aiReady ? (
            <p className="helper-text">AI is optional. Add an API key to request feedback.</p>
          ) : (
            <button className="primary-button" type="button" onClick={getFeedback}>
              <Sparkles size={18} />
              Get AI feedback
            </button>
          )}
          {feedbackStatus && <p className="helper-text">{feedbackStatus}</p>}
        </div>
      )}

      {feedback && (
        <div className="ai-feedback-box">
          <h3>AI feedback</h3>
          <p>{feedback.overallFeedback}</p>
          <div className="feedback-grid">
            <div>
              <strong>Missing main ideas</strong>
              <ul>
                {feedback.missingMainIdeas.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
            <div>
              <strong>Missing details/examples/numbers</strong>
              <ul>
                {feedback.missingDetailsExamplesNumbers.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
            <div>
              <strong>Weak question types</strong>
              <ul>
                {feedback.weakQuestionTypes.map((type) => (
                  <li key={type}>{type}</li>
                ))}
              </ul>
            </div>
            <div>
              <strong>Note-taking advice</strong>
              <p>{feedback.noteTakingAdvice}</p>
            </div>
            <div>
              <strong>Next practice focus</strong>
              <ul>
                {feedback.nextPracticeFocus.map((focus) => (
                  <li key={focus}>{focus}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
