# Listening Note Trainer

Listening Note Trainer is a local React + TypeScript + Vite app for practicing a university course such as **Listening and Note-taking**. It is designed for study practice: listening comprehension, vocabulary recognition, dictation, exam-style note-taking, and progress reflection.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL shown in the terminal, usually `http://localhost:5173`.

## How to use

1. Go to **Library** and create a listening lesson with a title, topic, transcript, and optional audio or video upload.
2. Open the lesson in **Practice**.
3. Use the player controls to play, pause, rewind 5 or 10 seconds, move forward 5 seconds, and change speed.
4. Use **Transcript** practice to show or hide the transcript, highlight unknown words, and add words to vocabulary.
5. Add optional sentence timestamps in the lesson editor, then use **Dictation** to play or loop one timed transcript sentence at a time, type what you hear, and check accuracy.
6. Use **Note-taking** to write structured notes, then compare with the transcript and extracted keywords after listening. Note attempts are saved locally.
7. Use **Exam** mode to hide the transcript, set one or two listens, choose a time limit, write notes, and save a self-check attempt. Exam playback removes seeking and skip controls.
8. Use **Vocabulary** to edit meanings, examples, pronunciation notes, status, and review words.
9. Use **Progress** to review practice counts, dictation accuracy, recent note attempts, vocabulary totals, exam attempts, and weak areas.

## Optional AI study aids

AI is optional. The app works without an API key, and generated materials can still be edited manually after they exist.

In the lesson editor, configure either **Groq** or **OpenRouter** with your own API key and model name. Default model suggestions are:

- OpenRouter: `google/gemini-2.0-flash-001`
- Groq: `llama-3.1-8b-instant`

Click **Generate study materials with AI** to create, from the transcript:

- Structured model notes.
- Shorthand paper-style notes.
- Post-listening questions.
- Answer keys and explanations.
- Academic vocabulary.

Questions, model notes, answer keys, explanations, and vocabulary are hidden before and during listening. They appear only after note comparison or exam review. After answers are submitted, **Get AI feedback** can review user answers and optional typed notes.

Privacy and cost notes:

- No real API keys are committed to the repo.
- API keys are stored locally in your browser.
- This is frontend-only, so browser API keys are not fully secure. Anyone with access to the browser/app runtime may be able to inspect client-side requests.
- The app sends only lesson title, topic, transcript, user answers, and optional typed notes to the selected AI provider.
- Audio and video files are never sent to AI.

## Local and offline behavior

- Lesson data, transcripts, vocabulary, uploaded media, dictation results, and exam attempts are saved in browser storage.
- Generated AI model notes, questions, answer keys, explanations, and academic vocabulary are saved locally with the lesson.
- No backend is required.
- A small service worker caches the app shell after it has been opened, so the app can continue to load from the same browser on the same device.

## Notes

- Uploaded media is stored locally in your browser. Very large audio or video files may take more browser storage.
- The included demo lesson has a transcript and vocabulary so the app can be tested immediately. Add your own audio or video file to practice with real course material.
