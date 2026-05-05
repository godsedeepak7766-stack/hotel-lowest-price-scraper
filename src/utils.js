function getArgValue(argv, name) {
  const key = `--${name}`;
  const idx = argv.findIndex((a) => a === key || a.startsWith(`${key}=`));
  if (idx === -1) return undefined;
  const token = argv[idx];
  if (token.includes("=")) return token.split("=").slice(1).join("=");
  return argv[idx + 1];
}

function mustGetArgValue(argv, name) {
  const v = getArgValue(argv, name);
  if (!v) throw new Error(`Missing required argument --${name}`);
  return v;
}

function parseInrAmount(text) {
  // Accepts strings like: "₹ 12,345", "INR 12,345", "Rs. 12,345"
  // Guardrail: only parse if the text actually mentions INR/₹/Rs to avoid picking up "1 room", etc.
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

function formatDateYmd(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(date, days) {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

function unique(arr) {
  return Array.from(new Set(arr));
}

module.exports = {
  getArgValue,
  mustGetArgValue,
  parseInrAmount,
  formatDateYmd,
  addDays,
  unique,
};

