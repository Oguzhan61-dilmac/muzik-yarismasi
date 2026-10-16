/** Afişin görsel öğesi: plak ve güneş, iki mürekkeple üst üste basılmış. */
export function PosterArt({ className = "" }: { className?: string }) {
  return (
    <div className={`relative aspect-square w-full ${className}`} aria-hidden="true">
      <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full overflow-visible">
        <g style={{ mixBlendMode: "multiply" }}>
          <circle cx="262" cy="150" r="128" fill="var(--color-pink)" />
          {Array.from({ length: 7 }, (_, i) => (
            <rect key={i} x="120" y={226 + i * 13} width="290" height="6" fill="var(--color-pink)" />
          ))}
        </g>
        <g className="poster-disc" style={{ mixBlendMode: "multiply" }}>
          <circle cx="165" cy="235" r="150" fill="var(--color-blue)" />
          {[132, 116, 100, 84, 70].map((r) => (
            <circle key={r} cx="165" cy="235" r={r} fill="none" stroke="var(--color-paper)" strokeOpacity=".28" strokeWidth="1.5" />
          ))}
          <circle cx="165" cy="235" r="46" fill="var(--color-pink)" />
          <circle cx="165" cy="235" r="7" fill="var(--color-paper)" />
        </g>
      </svg>
      <div className="grain" />
    </div>
  );
}
