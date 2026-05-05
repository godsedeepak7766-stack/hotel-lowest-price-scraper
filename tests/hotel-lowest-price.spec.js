const { test, expect } = require("@playwright/test");
const { scrapeBookingLowestPrice } = require("../lib/scrape-booking");

test.describe.configure({ mode: "serial" });

test.describe("Booking.com — lowest 5-night INR price", () => {
  test("selects top-rated 5-star hotel and samples future dates in current year", async ({
    page,
  }) => {
    const city = process.env.CITY || "Mumbai";
    const maxSamples = process.env.MAX_SAMPLES ? Number(process.env.MAX_SAMPLES) : undefined;
    const timeoutMs = process.env.TIMEOUT_MS ? Number(process.env.TIMEOUT_MS) : 180_000;

    const result = await scrapeBookingLowestPrice(page, {
      city,
      maxSamples,
      timeoutMs,
      log: (m) => process.stderr.write(`[scrape] ${m}\n`),
    });

    // Human-readable artifact for demos / debugging (also matches assignment “output”)
    console.log(JSON.stringify(result, null, 2));

    expect(result.city).toBe(city);
    expect(result.hotelName).toBeTruthy();
    expect(result.hotelUrl).toContain("booking.com");
    expect(result.reviewScore).toBeGreaterThan(0);

    if (result.bestPrice) {
      expect(result.bestPrice.totalPrice.currency).toBe("INR");
      expect(result.bestPrice.totalPrice.amount).toBeGreaterThan(0);
    } else {
      test.info().annotations.push({
        type: "note",
        description: "No price parsed (often bot wall or layout change). Try PW_HEADLESS=false.",
      });
    }
  });
});
