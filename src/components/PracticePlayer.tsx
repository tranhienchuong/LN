import { useEffect, useRef, useState } from "react";
import { FastForward, Pause, Play, Rewind } from "lucide-react";
import type { Lesson } from "../types";

interface PracticePlayerProps {
  lesson: Lesson;
  listenLimit?: 1 | 2;
  listensUsed?: number;
  onListenComplete?: () => void;
}

const SPEEDS = [0.75, 0.9, 1, 1.25];

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
}

export function PracticePlayer({
  lesson,
  listenLimit,
  listensUsed = 0,
  onListenComplete,
}: PracticePlayerProps) {
  const mediaRef = useRef<HTMLMediaElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const reachedListenLimit = listenLimit ? listensUsed >= listenLimit : false;

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [lesson.id, lesson.media?.dataUrl]);

  useEffect(() => {
    if (mediaRef.current) {
      mediaRef.current.playbackRate = speed;
    }
  }, [speed]);

  const media = lesson.media;

  const playPause = async () => {
    const element = mediaRef.current;
    if (!element || reachedListenLimit) return;
    if (element.paused) {
      await element.play();
      setIsPlaying(true);
    } else {
      element.pause();
      setIsPlaying(false);
    }
  };

  const shiftTime = (amount: number) => {
    const element = mediaRef.current;
    if (!element) return;
    element.currentTime = Math.max(0, Math.min(element.duration || 0, element.currentTime + amount));
  };

  const handleSeek = (value: string) => {
    const element = mediaRef.current;
    if (!element) return;
    element.currentTime = Number(value);
  };

  if (!media) {
    return (
      <section className="surface player-shell">
        <div>
          <p className="eyebrow">Practice player</p>
          <h2>{lesson.title}</h2>
          <p className="muted">
            This lesson has a transcript only. Add an audio or video file in the Library when
            you are ready to practice with media.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="surface player-shell">
      <div className="player-header">
        <div>
          <p className="eyebrow">Practice player</p>
          <h2>{lesson.title}</h2>
        </div>
        {listenLimit && (
          <span className="listen-badge">
            Listens {listensUsed}/{listenLimit}
          </span>
        )}
      </div>

      {media.kind === "video" ? (
        <video
          className="video-frame"
          ref={(node) => {
            mediaRef.current = node;
          }}
          src={media.dataUrl}
          onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
          onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
          onEnded={() => {
            setIsPlaying(false);
            onListenComplete?.();
          }}
        />
      ) : (
        <audio
          ref={(node) => {
            mediaRef.current = node;
          }}
          src={media.dataUrl}
          onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
          onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
          onEnded={() => {
            setIsPlaying(false);
            onListenComplete?.();
          }}
        />
      )}

      {media.kind === "audio" && (
        <div className="audio-visual">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      )}

      <div className="player-controls">
        <button className="control-button" onClick={() => shiftTime(-10)} disabled={reachedListenLimit}>
          <Rewind size={17} />
          10s
        </button>
        <button className="control-button" onClick={() => shiftTime(-5)} disabled={reachedListenLimit}>
          <Rewind size={17} />
          5s
        </button>
        <button className="primary-button round" onClick={playPause} disabled={reachedListenLimit}>
          {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          {isPlaying ? "Pause" : "Play"}
        </button>
        <button className="control-button" onClick={() => shiftTime(5)} disabled={reachedListenLimit}>
          <FastForward size={17} />
          5s
        </button>
        <div className="speed-group" aria-label="Playback speed">
          {SPEEDS.map((rate) => (
            <button
              key={rate}
              className={speed === rate ? "speed active" : "speed"}
              onClick={() => setSpeed(rate)}
              type="button"
            >
              {rate}x
            </button>
          ))}
        </div>
      </div>

      <div className="timeline-row">
        <span>{formatTime(currentTime)}</span>
        <input
          aria-label="Seek media"
          type="range"
          min={0}
          max={duration || 0}
          value={Math.min(currentTime, duration || 0)}
          onChange={(event) => handleSeek(event.target.value)}
          disabled={reachedListenLimit}
        />
        <span>{formatTime(duration)}</span>
      </div>

      {reachedListenLimit && <p className="helper-text">Listen limit reached for this exam attempt.</p>}
    </section>
  );
}
