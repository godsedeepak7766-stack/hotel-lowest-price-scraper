const { acceptCookiesIfPresent, gotoWithRetries } = require("../lib/navigation");
const { parseInrAmount } = require("../utils/inr");

/**
 * Page Object: individual hotel page (pricing for a stay).
 */
class BookingHotelPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
  }

  async open(url) {
    await gotoWithRetries(this.page, url);
    await acceptCookiesIfPresent(this.page);
  }

  async assertNoObviousBotWall() {
    const title = await this.page.title().catch(() => "");
    return !/captcha|verify|security/i.test(title);
  }

  /** Best-effort total price in INR from visible DOM / text. */
  async readTotalPriceInInr() {
    await this.page.waitForTimeout(1500);

    const candidates = await this.page.$$(
      '[data-testid*="price-and-discounted-price"], [data-testid="price-and-discounted-price"], [data-testid="price"]'
    );
    for (const el of candidates) {
      const txt = (await el.innerText().catch(() => "")).trim();
      if (!/₹|INR|Rs\.?/i.test(txt)) continue;
      const amount = parseInrAmount(txt);
      if (amount && amount > 0) return amount;
    }

    const bodyText = await this.page.evaluate(() => document.body?.innerText || "");
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
}

module.exports = { BookingHotelPage };
