"use client";

import { Disc, usePlayer, type Track } from "./player";

/** Kare kapak; çalınca plak kılıfından dışarı kayar. */
export function CoverPlayer({ track, size = "md" }: { track: Track; size?: "md" | "lg" }) {
  const player = usePlayer();
  const active = player.track?.id === track.id;
  const playing = active && player.playing;
  const canPlay = Boolean(track.url);

  return (
    <div className={`relative ${size === "lg" ? "mr-[14%]" : "mr-[12%]"}`}>
      <Disc
        spinning={playing}
        className={`absolute inset-y-[3%] right-0 h-[94%] w-[94%] text-ink transition-transform duration-500 ease-out motion-reduce:transition-none ${
          active ? "translate-x-[14%]" : "translate-x-0"
        }`}
      />
      <button
        type="button"
        onClick={() => canPlay && player.toggle(track)}
        disabled={!canPlay}
        aria-label={canPlay ? `${track.title}, ${playing ? "duraklat" : "dinle"}` : `${track.title}, ses dosyası yok`}
        aria-pressed={playing}
        className="group relative block aspect-square w-full border-2 border-ink bg-sheet disabled:cursor-default"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={track.cover} alt="" loading="lazy" className="h-full w-full object-cover" />
        {canPlay && (
          <span
            className={`absolute bottom-3 left-3 grid h-12 w-12 place-items-center rounded-full border-2 border-ink bg-pink text-ink shadow-[3px_3px_0_var(--color-blue)] transition-transform group-hover:scale-105 ${
              size === "lg" ? "sm:h-16 sm:w-16" : ""
            }`}
          >
            {playing ? (
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                <path d="M6 4h4v16H6zM14 4h4v16h-4z" fill="currentColor" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="ml-0.5 h-5 w-5" aria-hidden="true">
                <path d="M7 4.5v15l13-7.5z" fill="currentColor" />
              </svg>
            )}
          </span>
        )}
      </button>
    </div>
  );
}
