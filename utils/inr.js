function parseInrAmount(text) {
  if (!/(₹|\bINR\b|\bRs\.?\b)/i.test(text)) return null;
  const cleaned = text
    .replace(/\s+/g, " ")
    .replace(/[₹]|INR|Rs\.?/gi, "")
    .trim();
  const m = cleaned.match(/([0-9][0-9,]*)/);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ""));
  return Number.isFinite(n) ? Math.round(n) : null;
}

module.exports = { parseInrAmount };
