const { buildSearchUrl } = require("../lib/booking-urls");
const { acceptCookiesIfPresent, gotoWithRetries } = require("../lib/navigation");

/**
 * Page Object: Booking.com search results (5-star filter applied via URL).
 */
class BookingSearchResultsPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
  }

  async gotoForCity(city) {
    await gotoWithRetries(this.page, buildSearchUrl(city));
  }

  async dismissCookiesIfPresent() {
    await acceptCookiesIfPresent(this.page);
  }

  async assertNoObviousBotWall() {
    const title = await this.page.title().catch(() => "");
    return !/captcha|verify|security/i.test(title);
  }

  /**
   * Parse first N property cards; return highest reviewScore, tie-break reviewCount.
   */
  async pickTopRatedHotelFromFirstTen(maxCards = 10) {
    await this.page.waitForSelector('[data-testid="property-card"]', { timeout: 60_000 });
    const cards = await this.page.$$('[data-testid="property-card"]');

    const parsed = [];
    for (const card of cards.slice(0, maxCards)) {
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
}

module.exports = { BookingSearchResultsPage };
