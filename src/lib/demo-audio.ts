// Önizleme modu için tarayıcıda kısa bir melodi üretir (gerçek kurulumda kullanılmaz).

const cache = new Map<string, string>();

export function demoTrackUrl(seed: number): string {
  const key = String(seed);
  const hit = cache.get(key);
  if (hit) return hit;

  const rate = 22050;
  const seconds = 16;
  const n = rate * seconds;
  const pcm = new Float32Array(n);
  const scale = [0, 3, 5, 7, 10, 12, 15]; // minör pentatonik
  const root = 196 * Math.pow(2, (seed % 5) / 12);
  const bpm = 96 + (seed % 4) * 8;
  const step = (60 / bpm / 2) * rate; // sekizlik nota

  for (let s = 0; s * step < n; s++) {
    const start = Math.floor(s * step);
    const deg = scale[(s * (seed + 3) + Math.floor(s / 8) * 2) % scale.length];
    const freq = root * Math.pow(2, deg / 12) * (s % 8 === 0 ? 0.5 : 1);
    const len = Math.floor(step * 1.8);
    for (let i = 0; i < len && start + i < n; i++) {
      const t = i / rate;
      const env = Math.exp(-t * 5);
      pcm[start + i] += 0.22 * env * (Math.sin(2 * Math.PI * freq * t) + 0.3 * Math.sin(4 * Math.PI * freq * t));
    }
    if (s % 4 === 0) {
      // basit davul
      for (let i = 0; i < rate * 0.18 && start + i < n; i++) {
        const t = i / rate;
        pcm[start + i] += 0.35 * Math.exp(-t * 22) * Math.sin(2 * Math.PI * (110 - 60 * t) * t);
      }
    }
  }

  const buffer = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buffer);
  const write = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  write(0, "RIFF");
  v.setUint32(4, 36 + n * 2, true);
  write(8, "WAVEfmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  write(36, "data");
  v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const fade = Math.min(1, i / (rate * 0.05), (n - i) / (rate * 0.8));
    v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, pcm[i] * fade)) * 32767, true);
  }
  const url = URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
  cache.set(key, url);
  return url;
}
