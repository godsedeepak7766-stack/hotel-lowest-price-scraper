const STAY_NIGHTS = 5;

function addDays(date, days) {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

function formatDateYmd(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function unique(arr) {
  return Array.from(new Set(arr));
}

function nowYearRangeForFutureSearch() {
  const now = new Date();
  const year = now.getFullYear();
  const start = addDays(new Date(now.getFullYear(), now.getMonth(), now.getDate()), 1);
  const endExclusive = new Date(year + 1, 0, 1);
  return { start, endExclusive, year };
}

function sampleCheckInDates(start, endExclusive) {
  const dates = [];
  for (let y = start.getFullYear(); y <= endExclusive.getFullYear(); y++) {
    for (let m = 0; m < 12; m++) {
      const candidates = [1, 8, 15, 22].map((day) => new Date(y, m, day));
      for (const d of candidates) {
        if (d >= start && d < endExclusive) dates.push(d);
      }
    }
  }
  const sorted = dates
    .map((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()))
    .sort((a, b) => a.getTime() - b.getTime());
  return unique(sorted.map((d) => d.getTime())).map((t) => new Date(t));
}

module.exports = {
  STAY_NIGHTS,
  addDays,
  formatDateYmd,
  unique,
  nowYearRangeForFutureSearch,
  sampleCheckInDates,
};
