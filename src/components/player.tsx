"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { demoTrackUrl } from "@/lib/demo-audio";

export type Track = {
  id: string;
  title: string;
  artist: string;
  cover: string;
  url: string | null;
};

type State = {
  track: Track | null;
  playing: boolean;
  time: number;
  duration: number;
  error: string | null;
};

type PlayerApi = State & {
  toggle: (track: Track) => void;
  seek: (seconds: number) => void;
  close: () => void;
};

const PlayerContext = createContext<PlayerApi | null>(null);

export function usePlayer(): PlayerApi {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer, PlayerProvider içinde kullanılmalı");
  return ctx;
}

function resolveUrl(url: string): string {
  return url.startsWith("demo:") ? demoTrackUrl(Number(url.slice(5))) : url;
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<State>({ track: null, playing: false, time: 0, duration: 0, error: null });

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audioRef.current = audio;
    const update = (patch: Partial<State>) => setState((s) => ({ ...s, ...patch }));
    const onTime = () => update({ time: audio.currentTime });
    const onMeta = () => update({ duration: Number.isFinite(audio.duration) ? audio.duration : 0 });
    const onPlay = () => update({ playing: true, error: null });
    const onPause = () => update({ playing: false });
    const onEnded = () => update({ playing: false, time: 0 });
    const onError = () =>
      update({ playing: false, error: "Şarkı açılamadı. Sayfayı yenileyip tekrar dene." });
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    return () => {
      audio.pause();
      audio.removeAttribute("src");
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, []);

  const trackRef = useRef<Track | null>(null);

  const toggle = useCallback((track: Track) => {
    const audio = audioRef.current;
    if (!audio || !track.url) return;
    if (trackRef.current?.id === track.id) {
      if (audio.paused) void audio.play().catch(() => {});
      else audio.pause();
      return;
    }
    trackRef.current = track;
    audio.src = resolveUrl(track.url);
    setState({ track, playing: false, time: 0, duration: 0, error: null });
    void audio.play().catch(() => {});
  }, []);

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (audio && Number.isFinite(seconds)) audio.currentTime = seconds;
  }, []);

  const close = useCallback(() => {
    const audio = audioRef.current;
    audio?.pause();
    trackRef.current = null;
    setState({ track: null, playing: false, time: 0, duration: 0, error: null });
  }, []);

  return (
    <PlayerContext value={{ ...state, toggle, seek, close }}>
      {children}
      <MiniPlayer />
    </PlayerContext>
  );
}

function fmt(t: number) {
  if (!Number.isFinite(t) || t < 0) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function Disc({ spinning, className = "" }: { spinning: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`${spinning ? "spin" : ""} ${className}`}>
      <circle cx="12" cy="12" r="11" fill="currentColor" />
      <circle cx="12" cy="12" r="7.5" fill="none" stroke="var(--color-paper)" strokeOpacity=".35" />
      <circle cx="12" cy="12" r="5" fill="none" stroke="var(--color-paper)" strokeOpacity=".35" />
      <circle cx="12" cy="12" r="3" fill="var(--color-pink)" />
      <circle cx="12" cy="12" r="0.9" fill="var(--color-paper)" />
    </svg>
  );
}

export function PlayButton({ track, label = true }: { track: Track; label?: boolean }) {
  const player = usePlayer();
  const active = player.track?.id === track.id;
  const playing = active && player.playing;
  if (!track.url) {
    return (
      <span className="text-sm text-ink-soft" title="Bu şarkıyı dinleme iznin yok ya da dosya bulunamadı.">
        Ses dosyası açılamıyor
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={() => player.toggle(track)}
      className="btn btn-ghost bg-sheet"
      aria-pressed={playing}
      aria-label={`${track.title}, ${playing ? "duraklat" : "dinle"}`}
    >
      {playing ? (
        <Disc spinning className="h-5 w-5" />
      ) : (
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <path d="M7 4.5v15l13-7.5z" fill="currentColor" />
        </svg>
      )}
      {label && <span>{playing ? "Duraklat" : active ? "Devam et" : "Dinle"}</span>}
    </button>
  );
}

function MiniPlayer() {
  const p = usePlayer();
  if (!p.track) return null;
  const { track } = p;
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-ink bg-sheet"
      role="region"
      aria-label="Çalan şarkı"
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 sm:gap-4">
        <div className="relative h-12 w-12 shrink-0">
          <Disc spinning={p.playing} className="absolute -right-3 top-1 h-10 w-10 text-ink" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={track.cover} alt="" className="relative h-12 w-12 border-2 border-ink object-cover" />
        </div>
        <button
          type="button"
          onClick={() => p.toggle(track)}
          className="btn btn-primary h-11 w-11 shrink-0 p-0"
          aria-label={p.playing ? "Duraklat" : "Çal"}
        >
          {p.playing ? (
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path d="M6 4h4v16H6zM14 4h4v16h-4z" fill="currentColor" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path d="M7 4.5v15l13-7.5z" fill="currentColor" />
            </svg>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate leading-tight">
            <span className="font-semibold">{track.title}</span>
            <span className="ml-2 text-ink-soft">{track.artist}</span>
          </p>
          {p.error ? (
            <p className="text-sm font-semibold text-pink-deep">{p.error}</p>
          ) : (
            <div className="flex items-center gap-2 text-xs tabular-nums text-ink-soft">
              <span>{fmt(p.time)}</span>
              <input
                type="range"
                min={0}
                max={p.duration || 0}
                step={0.1}
                value={Math.min(p.time, p.duration || 0)}
                onChange={(e) => p.seek(Number(e.target.value))}
                aria-label="Şarkıda ilerle"
                className="h-1 flex-1 cursor-pointer accent-[var(--color-pink)]"
              />
              <span>{fmt(p.duration)}</span>
            </div>
          )}
        </div>
        <button type="button" onClick={p.close} className="btn btn-quiet h-11 w-11 p-0" aria-label="Oynatıcıyı kapat">
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
