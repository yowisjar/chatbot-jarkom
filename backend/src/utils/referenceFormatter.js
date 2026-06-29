/**
 * Format referensi sumber berdasarkan metadata slide dokumen.
 * Tidak menggunakan chunkIndex sebagai pengganti nomor slide.
 */

const formatSlideRangePart = (start, end) => {
  if (start === end) return String(start);
  return `${start}–${end}`;
};

const groupConsecutiveNumbers = (numbers) => {
  if (!numbers.length) return [];

  const sorted = [...numbers].sort((a, b) => a - b);
  const ranges = [];
  let rangeStart = sorted[0];
  let rangeEnd = sorted[0];

  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i] === rangeEnd + 1) {
      rangeEnd = sorted[i];
    } else {
      ranges.push(formatSlideRangePart(rangeStart, rangeEnd));
      rangeStart = sorted[i];
      rangeEnd = sorted[i];
    }
  }

  ranges.push(formatSlideRangePart(rangeStart, rangeEnd));
  return ranges;
};

const formatSlideNumbers = (slideNumbers) => {
  const unique = [...new Set(slideNumbers.filter((n) => Number.isInteger(n) && n > 0))];
  if (unique.length === 0) return null;

  const parts = groupConsecutiveNumbers(unique);
  return `Slide ${parts.join(', Slide ')}`;
};

/**
 * @param {Array<{ materialTitle: string, slideNumber?: number|null }>} chunks
 * @returns {Array<{ materialTitle: string, displayLabel: string, slideNumbers?: number[] }>}
 */
const buildReferences = (chunks) => {
  const byMaterial = new Map();

  for (const chunk of chunks) {
    const title = chunk.materialTitle;
    if (!title) continue;

    if (!byMaterial.has(title)) {
      byMaterial.set(title, {
        materialTitle: title,
        slideNumbers: new Set(),
      });
    }

    if (chunk.slideNumber != null && Number.isInteger(chunk.slideNumber) && chunk.slideNumber > 0) {
      byMaterial.get(title).slideNumbers.add(chunk.slideNumber);
    }
  }

  return [...byMaterial.values()].map(({ materialTitle, slideNumbers }) => {
    const nums = [...slideNumbers].sort((a, b) => a - b);
    const slideLabel = formatSlideNumbers(nums);

    return {
      materialTitle,
      ...(nums.length > 0 && { slideNumbers: nums }),
      displayLabel: slideLabel ? `${materialTitle} — ${slideLabel}` : materialTitle,
    };
  });
};

module.exports = {
  buildReferences,
  formatSlideNumbers,
  groupConsecutiveNumbers,
};
