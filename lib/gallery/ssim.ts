const WINDOW_SIZE = 11;
const WINDOW_RADIUS = (WINDOW_SIZE - 1) / 2;
const SIGMA = 1.5;
const C1 = (0.01 * 255) ** 2;
const C2 = (0.03 * 255) ** 2;

const GAUSSIAN_KERNEL = (() => {
  const values = Array.from({ length: WINDOW_SIZE }, (_, index) => Math.exp(-((index - WINDOW_RADIUS) ** 2) / (2 * SIGMA ** 2)));
  const sum = values.reduce((total, value) => total + value, 0);
  return values.map((value) => value / sum);
})();

function reflected(index: number, length: number) {
  if (length < 1) throw new RangeError("Image dimensions must be positive");
  let value = index;
  while (value < 0 || value >= length) value = value < 0 ? -value - 1 : 2 * length - value - 1;
  return value;
}

function gaussianBlur(input: Float64Array, width: number, height: number) {
  const horizontal = new Float64Array(input.length); const output = new Float64Array(input.length);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    let value = 0;
    for (let offset = -WINDOW_RADIUS; offset <= WINDOW_RADIUS; offset += 1) value += input[y * width + reflected(x + offset, width)] * GAUSSIAN_KERNEL[offset + WINDOW_RADIUS];
    horizontal[y * width + x] = value;
  }
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    let value = 0;
    for (let offset = -WINDOW_RADIUS; offset <= WINDOW_RADIUS; offset += 1) value += horizontal[reflected(y + offset, height) * width + x] * GAUSSIAN_KERNEL[offset + WINDOW_RADIUS];
    output[y * width + x] = value;
  }
  return output;
}

export function rgbToLuminance(bytes: Uint8Array, width: number, height: number, channels = 3) {
  if (width < 1 || height < 1 || channels < 3 || bytes.length !== width * height * channels) throw new RangeError("Invalid RGB image buffer");
  const result = new Float64Array(width * height);
  for (let pixel = 0; pixel < result.length; pixel += 1) {
    const offset = pixel * channels;
    result[pixel] = 0.299 * bytes[offset] + 0.587 * bytes[offset + 1] + 0.114 * bytes[offset + 2];
  }
  return result;
}

export function structuralSimilarity(first: Float64Array, second: Float64Array, width: number, height: number) {
  if (first.length !== width * height || second.length !== first.length) throw new RangeError("SSIM images must share exact dimensions");
  const firstSquared = new Float64Array(first.length); const secondSquared = new Float64Array(first.length); const product = new Float64Array(first.length);
  for (let index = 0; index < first.length; index += 1) { firstSquared[index] = first[index] ** 2; secondSquared[index] = second[index] ** 2; product[index] = first[index] * second[index]; }
  const firstMean = gaussianBlur(first, width, height); const secondMean = gaussianBlur(second, width, height);
  const firstSecondMoment = gaussianBlur(firstSquared, width, height); const secondSecondMoment = gaussianBlur(secondSquared, width, height); const productMoment = gaussianBlur(product, width, height);
  let total = 0;
  for (let index = 0; index < first.length; index += 1) {
    const firstMeanSquared = firstMean[index] ** 2; const secondMeanSquared = secondMean[index] ** 2;
    const varianceFirst = Math.max(0, firstSecondMoment[index] - firstMeanSquared); const varianceSecond = Math.max(0, secondSecondMoment[index] - secondMeanSquared);
    const covariance = productMoment[index] - firstMean[index] * secondMean[index];
    total += ((2 * firstMean[index] * secondMean[index] + C1) * (2 * covariance + C2))
      / ((firstMeanSquared + secondMeanSquared + C1) * (varianceFirst + varianceSecond + C2));
  }
  return total / first.length;
}
