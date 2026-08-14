export const ALPHA_COORDINATES = Array.from({ length: 25 }, (_, index) => ({
  u: index / 24,
  v: (index % 5) / 4,
  expected: Math.round(255 * (index / 24)),
}));

export const ALPHA_REFERENCE_MANIFEST = {
  unchanged: { path: "tests/fixtures/gallery/alpha-unchanged.png", width: 800, height: 600, outputWidth: 800, outputHeight: 600, tolerance: 1, coordinates: ALPHA_COORDINATES },
  resized: { path: "tests/fixtures/gallery/alpha-resized.png", width: 2000, height: 1000, outputWidth: 1600, outputHeight: 800, tolerance: 3, coordinates: ALPHA_COORDINATES },
} as const;
