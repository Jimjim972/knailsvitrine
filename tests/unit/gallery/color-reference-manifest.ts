export const COLOR_REFERENCE_MANIFEST = ["srgb-red", "srgb-green", "srgb-blue", "p3-red", "p3-green", "p3-blue"].map((id, imageIndex) => ({
  id,
  path: `tests/fixtures/gallery/${id}.png`,
  profile: imageIndex < 3 ? "sRGB" : "Display-P3",
  samples: Array.from({ length: 25 }, (_, index) => ({
    u: (index % 5) / 4,
    v: Math.floor(index / 5) / 4,
    rgb: [imageIndex % 3 === 0 ? 255 : index * 7 % 256, imageIndex % 3 === 1 ? 255 : index * 11 % 256, imageIndex % 3 === 2 ? 255 : index * 13 % 256] as const,
  })),
}));

export function boundedPixel(coordinate: number, size: number) { return Math.min(size - 1, Math.max(0, Math.floor(coordinate * (size - 1) + 0.5))); }
export function percentile95(values: number[]) {
  if (values.length !== 150) throw new Error("The color oracle requires exactly 150 samples");
  return [...values].sort((a, b) => a - b)[142];
}

export type Lab = { l: number; a: number; b: number };

export function srgb8ToLabD65([red, green, blue]: readonly [number, number, number]): Lab {
  const linear = [red, green, blue].map((value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const x = (0.4124564 * linear[0] + 0.3575761 * linear[1] + 0.1804375 * linear[2]) / 0.95047;
  const y = 0.2126729 * linear[0] + 0.7151522 * linear[1] + 0.072175 * linear[2];
  const z = (0.0193339 * linear[0] + 0.119192 * linear[1] + 0.9503041 * linear[2]) / 1.08883;
  const f = (value: number) => value > 216 / 24389 ? Math.cbrt(value) : (841 / 108) * value + 4 / 29;
  return { l: 116 * f(y) - 16, a: 500 * (f(x) - f(y)), b: 200 * (f(y) - f(z)) };
}

export function ciede2000(first: Lab, second: Lab): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const degrees = (angle: number) => angle * 180 / Math.PI;
  const c1 = Math.hypot(first.a, first.b); const c2 = Math.hypot(second.a, second.b);
  const cBar = (c1 + c2) / 2;
  const g = 0.5 * (1 - Math.sqrt(cBar ** 7 / (cBar ** 7 + 25 ** 7)));
  const a1 = (1 + g) * first.a; const a2 = (1 + g) * second.a;
  const cp1 = Math.hypot(a1, first.b); const cp2 = Math.hypot(a2, second.b);
  const hue = (a: number, b: number) => { const value = degrees(Math.atan2(b, a)); return value < 0 ? value + 360 : value; };
  const h1 = hue(a1, first.b); const h2 = hue(a2, second.b);
  const deltaL = second.l - first.l; const deltaC = cp2 - cp1;
  let deltaHue = 0;
  if (cp1 * cp2 !== 0) {
    const difference = h2 - h1;
    deltaHue = Math.abs(difference) <= 180 ? difference : difference > 180 ? difference - 360 : difference + 360;
  }
  const deltaH = 2 * Math.sqrt(cp1 * cp2) * Math.sin(radians(deltaHue / 2));
  const lBar = (first.l + second.l) / 2; const cpBar = (cp1 + cp2) / 2;
  const hBar = cp1 * cp2 === 0 ? h1 + h2 : Math.abs(h1 - h2) <= 180 ? (h1 + h2) / 2 : (h1 + h2 + (h1 + h2 < 360 ? 360 : -360)) / 2;
  const t = 1 - 0.17 * Math.cos(radians(hBar - 30)) + 0.24 * Math.cos(radians(2 * hBar)) + 0.32 * Math.cos(radians(3 * hBar + 6)) - 0.2 * Math.cos(radians(4 * hBar - 63));
  const sl = 1 + 0.015 * (lBar - 50) ** 2 / Math.sqrt(20 + (lBar - 50) ** 2);
  const sc = 1 + 0.045 * cpBar; const sh = 1 + 0.015 * cpBar * t;
  const rotation = 30 * Math.exp(-(((hBar - 275) / 25) ** 2));
  const rc = 2 * Math.sqrt(cpBar ** 7 / (cpBar ** 7 + 25 ** 7));
  const rt = -rc * Math.sin(radians(2 * rotation));
  const dl = deltaL / sl; const dc = deltaC / sc; const dh = deltaH / sh;
  return Math.sqrt(dl ** 2 + dc ** 2 + dh ** 2 + rt * dc * dh);
}
