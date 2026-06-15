import type {
  AIFeedback,
  AIQuestion,
  AIQuestionType,
  AIVocabularyItem,
  StructuredModelNotes,
} from "../types";
import { createId } from "./text";

export type AIProvider = "groq" | "openrouter";

export interface AISettings {
  provider: AIProvider;
  groqApiKey: string;
  groqModel: string;
  openrouterApiKey: string;
  openrouterModel: string;
}

interface ChatMessage {
  role: "system" | "user";
  content: string;
}

const AI_SETTINGS_KEY = "listening-note-trainer-ai-settings";

export const emptyModelNotes: StructuredModelNotes = {
  topic: "",
  mainIdea: "",
  details: "",
  examples: "",
  numbersNames: "",
  causeEffect: "",
  contrast: "",
  conclusion: "",
  shorthandNotes: "",
};

export const defaultAISettings: AISettings = {
  provider: "groq",
  groqApiKey: import.meta.env.VITE_GROQ_API_KEY || "",
  groqModel: import.meta.env.VITE_GROQ_MODEL || "llama-3.1-8b-instant",
  openrouterApiKey: import.meta.env.VITE_OPENROUTER_API_KEY || "",
  openrouterModel: import.meta.env.VITE_OPENROUTER_MODEL || "google/gemini-2.0-flash-001",
};

export function loadAISettings(): AISettings {
  try {
    const stored = localStorage.getItem(AI_SETTINGS_KEY);
    if (!stored) {
      return defaultAISettings;
    }
    const parsed = JSON.parse(stored);
    return {
      provider: parsed.provider || defaultAISettings.provider,
      groqApiKey: parsed.groqApiKey || defaultAISettings.groqApiKey,
      groqModel: parsed.groqModel || defaultAISettings.groqModel,
      openrouterApiKey: parsed.openrouterApiKey || defaultAISettings.openrouterApiKey,
      openrouterModel: parsed.openrouterModel || defaultAISettings.openrouterModel,
    };
  } catch {
    return defaultAISettings;
  }
}

export function saveAISettings(settings: AISettings) {
  localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(settings));
}

export function hasConfiguredAI(settings: AISettings) {
  return settings.provider === "groq"
    ? settings.groqApiKey.trim().length > 0
    : settings.openrouterApiKey.trim().length > 0;
}

export function getConfiguredModel(settings: AISettings) {
  return settings.provider === "groq" ? settings.groqModel : settings.openrouterModel;
}

function getProviderConfig(settings: AISettings) {
  if (settings.provider === "groq") {
    return {
      endpoint: "https://api.groq.com/openai/v1/chat/completions",
      apiKey: settings.groqApiKey,
      model: settings.groqModel,
      headers: {} as Record<string, string>,
    };
  }

  return {
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    apiKey: settings.openrouterApiKey,
    model: settings.openrouterModel,
    headers: {
      "HTTP-Referer": window.location.origin,
      "X-Title": "Listening Note Trainer",
    },
  };
}

function extractJsonObject(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI response did not include JSON.");
  }
  return JSON.parse(text.slice(start, end + 1));
}

async function chatJson<T>(settings: AISettings, messages: ChatMessage[]): Promise<T> {
  const config = getProviderConfig(settings);
  if (!config.apiKey.trim()) {
    throw new Error("Add an API key before using AI features.");
  }
  if (!config.model.trim()) {
    throw new Error("Add a model name before using AI features.");
  }

  const response = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey.trim()}`,
      "Content-Type": "application/json",
      ...config.headers,
    },
    body: JSON.stringify({
      model: config.model.trim(),
      temperature: 0.2,
      messages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `AI request failed with status ${response.status}.`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("AI response was missing content.");
  }

  return extractJsonObject(content) as T;
}

const systemPrompt =
  "You are a university listening and note-taking tutor. Return strict valid JSON only. Do not include markdown.";

export async function generateStudyMaterialsWithAI(
  settings: AISettings,
  input: { title: string; topic: string; transcript: string },
) {
  const result = await chatJson<{
    modelNotes: StructuredModelNotes;
    questions: Array<Omit<AIQuestion, "id">>;
    aiVocabulary: AIVocabularyItem[];
  }>(settings, [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: JSON.stringify({
        task: "Generate complete Listening and Note-taking study materials from a transcript.",
        privacy: "Use only the lesson title, topic, and transcript. Do not request or use audio/video.",
        constraints: [
          "Return strict JSON with exactly these top-level keys: modelNotes, questions, aiVocabulary.",
          "Do not invent facts not supported by the transcript.",
          "Questions are post-listening questions. They must not be used as hints during listening.",
          "Generate 6 to 8 questions.",
          "Generate 8 to 14 academic vocabulary items.",
          "modelNotes must use these keys: topic, mainIdea, details, examples, numbersNames, causeEffect, contrast, conclusion, shorthandNotes.",
          "shorthandNotes should look like paper notes and use bc, ex, ↑, ↓, →, ≠, and ! where useful.",
        ],
        outputShape: {
          modelNotes: {
            topic: "string",
            mainIdea: "string",
            details: "string",
            examples: "string",
            numbersNames: "string",
            causeEffect: "string",
            contrast: "string",
            conclusion: "string",
            shorthandNotes: "string",
          },
          questions: [
            {
              questionText: "string",
              questionType: "main_idea",
              answerKey: "string",
              explanation: "string",
            },
          ],
          aiVocabulary: [
            {
              word: "string",
              meaning: "string",
              exampleSentence: "string",
              pronunciationNote: "string",
            },
          ],
        },
        allowedQuestionTypes: [
          "main_idea",
          "detail",
          "example",
          "number_name",
          "cause_effect",
          "contrast",
          "inference",
          "conclusion",
        ],
        input,
      }),
    },
  ]);

  return {
    modelNotes: { ...emptyModelNotes, ...(result.modelNotes ?? {}) },
    questions: (result.questions ?? []).map((question) => normalizeQuestion(question)),
    aiVocabulary: (result.aiVocabulary ?? []).map((item) => normalizeVocabularyItem(item)),
  };
}

export async function generateFeedbackWithAI(
  settings: AISettings,
  input: {
    transcript: string;
    modelNotes: StructuredModelNotes;
    questions: AIQuestion[];
    userAnswers: Record<string, string>;
    userNotes: string;
    keywords: string[];
  },
) {
  return chatJson<AIFeedback>(settings, [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: JSON.stringify({
        task: "Give feedback after a listening and note-taking attempt.",
        constraints: [
          "The user has already listened and submitted answers.",
          "Use the transcript, model notes, keywords, question answer keys, user answers, and optional typed notes.",
          "Be specific, concise, and study-focused.",
          "Return weakQuestionTypes using only the allowed question type ids.",
        ],
        outputShape: {
          overallFeedback: "string",
          missingMainIdeas: ["string"],
          missingDetailsExamplesNumbers: ["string"],
          weakQuestionTypes: ["detail"],
          noteTakingAdvice: "string",
          nextPracticeFocus: ["string"],
        },
        allowedQuestionTypes: [
          "main_idea",
          "detail",
          "example",
          "number_name",
          "cause_effect",
          "contrast",
          "inference",
          "conclusion",
        ],
        input,
      }),
    },
  ]);
}

export function normalizeQuestionType(value: string): AIQuestionType {
  const allowed: AIQuestionType[] = [
    "main_idea",
    "detail",
    "example",
    "number_name",
    "cause_effect",
    "contrast",
    "inference",
    "conclusion",
  ];
  return allowed.includes(value as AIQuestionType) ? (value as AIQuestionType) : "detail";
}

export function normalizeQuestion(question: Partial<AIQuestion>): AIQuestion {
  return {
    id: question.id || createId("ai-question"),
    questionText: question.questionText ?? "",
    questionType: normalizeQuestionType(question.questionType ?? "detail"),
    answerKey: question.answerKey ?? "",
    explanation: question.explanation ?? "",
  };
}

export function normalizeVocabularyItem(item: Partial<AIVocabularyItem>): AIVocabularyItem {
  return {
    word: item.word ?? "",
    meaning: item.meaning ?? "",
    exampleSentence: item.exampleSentence ?? "",
    pronunciationNote: item.pronunciationNote ?? "",
  };
}
