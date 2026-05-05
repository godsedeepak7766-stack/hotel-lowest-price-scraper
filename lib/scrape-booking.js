const { buildHotelPriceUrl } = require("./booking-urls");
const {
  STAY_NIGHTS,
  addDays,
  formatDateYmd,
  nowYearRangeForFutureSearch,
  sampleCheckInDates,
} = require("./date-sampling");
const { blockSomeNoise } = require("./navigation");
const { BookingSearchResultsPage } = require("../page-objects/BookingSearchResultsPage");
const { BookingHotelPage } = require("../page-objects/BookingHotelPage");

/**
 * Core flow used by Playwright tests and the optional Node CLI.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{
 *   city: string,
 *   maxSamples?: number,
 *   timeoutMs?: number,
 *   log?: (msg: string) => void,
 * }} opts
 */
async function scrapeBookingLowestPrice(page, opts) {
  const { city, maxSamples, timeoutMs = 180_000, log = () => {} } = opts;
  const notes = [];
  const nights = STAY_NIGHTS;
  const { start, endExclusive, year } = nowYearRangeForFutureSearch();

  page.setDefaultTimeout(timeoutMs);
  page.setDefaultNavigationTimeout(timeoutMs);

  await blockSomeNoise(page);

  const searchPage = new BookingSearchResultsPage(page);
  log(`Opening search for "${city}"`);
  await searchPage.gotoForCity(city);
  await searchPage.dismissCookiesIfPresent();

  if (!(await searchPage.assertNoObviousBotWall())) {
    notes.push("Detected possible bot challenge on Booking.com search page. Try headed mode.");
  }

  const top = await searchPage.pickTopRatedHotelFromFirstTen();
  log(
    `Selected hotel: ${top.hotelName} (score=${top.reviewScore ?? "n/a"}, reviews=${top.reviewCount ?? "n/a"})`
  );

  const sampledAll = sampleCheckInDates(start, endExclusive);
  const sampled =
    typeof maxSamples === "number" ? sampledAll.slice(0, Math.max(0, maxSamples)) : sampledAll;
  const sampledCheckInDates = sampled.map(formatDateYmd);

  const hotelPage = new BookingHotelPage(page);
  let best = null;
  let i = 0;
  for (const checkInDate of sampled) {
    i++;
    const checkOutDate = addDays(checkInDate, nights);
    if (checkOutDate >= endExclusive) continue;

    const checkIn = formatDateYmd(checkInDate);
    const checkOut = formatDateYmd(checkOutDate);
    const url = buildHotelPriceUrl(top.hotelUrl, checkIn, checkOut);

    log(`Checking ${i}/${sampled.length}: ${checkIn} → ${checkOut}`);
    await hotelPage.open(url);

    if (!(await hotelPage.assertNoObviousBotWall())) {
      notes.push(`Bot challenge detected for dates ${checkIn}→${checkOut}.`);
      continue;
    }

    const total = await hotelPage.readTotalPriceInInr();
    if (!total) continue;
    if (!best || total < best.total) best = { total, checkIn, checkOut };
  }

  if (!best) {
    notes.push(
      `No total INR price found for sampled dates in ${year}. Try headed mode or adjust sampling strategy.`
    );
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
}

module.exports = { scrapeBookingLowestPrice };
