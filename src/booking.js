const { chromium } = require("playwright");
const { addDays, formatDateYmd, parseInrAmount, unique } = require("./utils");

function nowYearRangeForFutureSearch() {
  const now = new Date();
  const year = now.getFullYear();
  // "any future date range within the calendar year"
  // If we're already in this year, we search from tomorrow through Dec 31.
  const start = addDays(new Date(now.getFullYear(), now.getMonth(), now.getDate()), 1);
  const endExclusive = new Date(year + 1, 0, 1);
  return { start, endExclusive, year };
}

function sampleCheckInDates(start, endExclusive) {
  // Balanced approach: sample 4 dates per month (1st, 8th, 15th, 22nd) within range.
  const dates = [];
  for (let y = start.getFullYear(); y <= endExclusive.getFullYear(); y++) {
    for (let m = 0; m < 12; m++) {
      const candidates = [1, 8, 15, 22].map((day) => new Date(y, m, day));
      for (const d of candidates) {
        if (d >= start && d < endExclusive) dates.push(d);
      }
    }
  }
  // De-dupe and keep sorted.
  const sorted = dates
    .map((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()))
    .sort((a, b) => a.getTime() - b.getTime());
  return unique(sorted.map((d) => d.getTime())).map((t) => new Date(t));
}

async function blockSomeNoise(page) {
  await page.route("**/*", async (route) => {
    const req = route.request();
    const type = req.resourceType();
    const url = req.url();
    if (type === "image" || type === "media" || type === "font") return route.abort();
    if (url.includes("doubleclick.net") || url.includes("googlesyndication.com")) return route.abort();
    return route.continue();
  });
}

async function acceptCookiesIfPresent(page) {
  const btn = page.getByRole("button", { name: /accept|agree|I accept|accept all/i });
  if (await btn.first().isVisible().catch(() => false)) {
    await btn.first().click().catch(() => undefined);
  }
}

async function gotoWithRetries(page, url) {
  const attempts = [0, 1500, 3000];
  let lastErr;
  for (const wait of attempts) {
    if (wait) await page.waitForTimeout(wait);
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
      return;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

function buildSearchUrl(city) {
  const params = new URLSearchParams({
    ss: city,
    group_adults: "2",
    group_children: "1",
    age: "0", // infant <2
    no_rooms: "1",
    // Force INR display where possible
    selected_currency: "INR",
    // Filter: 5-star
    nflt: "class=5",
  });
  return `https://www.booking.com/searchresults.html?${params.toString()}`;
}

async function extractTopHotelFromSearch(page) {
  await page.waitForSelector('[data-testid="property-card"]', { timeout: 60_000 });
  const cards = await page.$$('[data-testid="property-card"]');

  const parsed = [];
  for (const card of cards.slice(0, 10)) {
    const nameEl = await card.$('[data-testid="title"]');
    const hotelName = (await nameEl?.innerText().catch(() => ""))?.trim() || "";

    const linkEl = await card.$('a[data-testid="title-link"]');
    const href = (await linkEl?.getAttribute("href").catch(() => null)) || null;
    const hotelUrl = href ? new URL(href, "https://www.booking.com").toString() : "";

    const starLabel = await card
      .$eval('[data-testid="rating-stars"]', (el) => el.getAttribute("aria-label") || "")
      .catch(() => "");
    const starMatch = starLabel.match(/([0-9](?:\.[0-9])?)\s*out of\s*5/i);
    const starRating = starMatch ? Number(starMatch[1]) : null;

    const reviewText = await card
      .$eval('[data-testid="review-score"]', (el) => el.innerText)
      .catch(() => "");
    const scoreMatch = reviewText.replace(",", ".").match(/([0-9]{1,2}(?:\.[0-9])?)/);
    const reviewScore = scoreMatch ? Number(scoreMatch[1]) : null;

    const countMatch = reviewText.replace(/,/g, "").match(/([0-9]{2,})/);
    const reviewCount = countMatch ? Number(countMatch[1]) : null;

    if (!hotelName || !hotelUrl) continue;
    parsed.push({ hotelName, hotelUrl, starRating, reviewScore, reviewCount });
  }

  if (!parsed.length) throw new Error("No hotel results parsed from Booking.com search.");

  parsed.sort((a, b) => {
    const as = a.reviewScore ?? -1;
    const bs = b.reviewScore ?? -1;
    if (bs !== as) return bs - as;
    const ac = a.reviewCount ?? -1;
    const bc = b.reviewCount ?? -1;
    return bc - ac;
  });

  return parsed[0];
}

function buildHotelPriceUrl(hotelUrl, checkIn, checkOut) {
  const u = new URL(hotelUrl);
  u.searchParams.set("checkin", checkIn);
  u.searchParams.set("checkout", checkOut);
  u.searchParams.set("group_adults", "2");
  u.searchParams.set("group_children", "1");
  u.searchParams.set("age", "0");
  u.searchParams.set("no_rooms", "1");
  u.searchParams.set("selected_currency", "INR");
  return u.toString();
}

async function extractTotalPriceInINRFromHotel(page) {
  await page.waitForTimeout(1500);

  const candidates = await page.$$(
    '[data-testid*="price-and-discounted-price"], [data-testid="price-and-discounted-price"], [data-testid="price"]'
  );
  for (const el of candidates) {
    const txt = (await el.innerText().catch(() => "")).trim();
    if (!/₹|INR|Rs\.?/i.test(txt)) continue;
    const amount = parseInrAmount(txt);
    if (amount && amount > 0) return amount;
  }

  const bodyText = await page.evaluate(() => document.body?.innerText || "");
  const lines = bodyText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    if (!/₹|INR|Rs\.?/i.test(line)) continue;
    if (!/total|for\s*5\s*nights|5\s*nights/i.test(line)) continue;
    const amount = parseInrAmount(line);
    if (amount && amount > 0) return amount;
  }

  for (const line of lines) {
    if (!/₹|INR|Rs\.?/i.test(line)) continue;
    const amount = parseInrAmount(line);
    if (amount && amount > 0) return amount;
  }

  return null;
}

async function runBookingScrape(city, opts) {
  const notes = [];
  const { start, endExclusive, year } = nowYearRangeForFutureSearch();
  const nights = 5;
  const timeoutMs = opts.timeoutMs ?? 180_000;

  let browser = null;
  try {
    browser = await chromium.launch({
      headless: opts.headless,
      args: ["--disable-blink-features=AutomationControlled"],
    });
    const context = await browser.newContext({
      locale: "en-IN",
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    });
    const page = await context.newPage();
    page.setDefaultTimeout(timeoutMs);
    page.setDefaultNavigationTimeout(timeoutMs);
    await blockSomeNoise(page);

    const searchUrl = buildSearchUrl(city);
    process.stderr.write(`[scrape] Opening search for "${city}"\n`);
    await gotoWithRetries(page, searchUrl);
    await acceptCookiesIfPresent(page);

    const title = await page.title().catch(() => "");
    if (/captcha|verify|security/i.test(title)) {
      notes.push("Detected possible bot challenge on Booking.com search page. Try running headed mode.");
    }

    const top = await extractTopHotelFromSearch(page);
    process.stderr.write(
      `[scrape] Selected hotel: ${top.hotelName} (score=${top.reviewScore ?? "n/a"}, reviews=${top.reviewCount ?? "n/a"})\n`
    );

    const sampledAll = sampleCheckInDates(start, endExclusive);
    const sampled =
      typeof opts.maxSamples === "number" ? sampledAll.slice(0, Math.max(0, opts.maxSamples)) : sampledAll;
    const sampledCheckInDates = sampled.map(formatDateYmd);

    let best = null;
    let i = 0;
    for (const checkInDate of sampled) {
      i++;
      const checkOutDate = addDays(checkInDate, nights);
      if (checkOutDate >= endExclusive) continue;

      const checkIn = formatDateYmd(checkInDate);
      const checkOut = formatDateYmd(checkOutDate);
      const url = buildHotelPriceUrl(top.hotelUrl, checkIn, checkOut);

      process.stderr.write(`[scrape] Checking ${i}/${sampled.length}: ${checkIn} → ${checkOut}\n`);
      await gotoWithRetries(page, url);
      await acceptCookiesIfPresent(page);

      const t = await page.title().catch(() => "");
      if (/captcha|verify|security/i.test(t)) {
        notes.push(`Bot challenge detected for dates ${checkIn}→${checkOut}.`);
        continue;
      }

      const total = await extractTotalPriceInINRFromHotel(page);
      if (!total) continue;
      if (!best || total < best.total) best = { total, checkIn, checkOut };
    }

    if (!best) {
      notes.push(`No total INR price found for sampled dates in ${year}. Try headed mode or adjust sampling strategy.`);
    }

    return {
      city,
      hotelName: top.hotelName,
      hotelUrl: top.hotelUrl,
      starRating: top.starRating,
      reviewScore: top.reviewScore,
      reviewCount: top.reviewCount,
      sampledCheckInDates,
      bestPrice: best
        ? {
            checkIn: best.checkIn,
            checkOut: best.checkOut,
            nights,
            totalPrice: { currency: "INR", amount: best.total },
            approxNightlyPrice: { currency: "INR", amount: Math.round(best.total / nights) },
            source: "booking.com",
          }
        : null,
      notes,
    };
  } finally {
    await browser?.close().catch(() => undefined);
  }
}

module.exports = { runBookingScrape };

