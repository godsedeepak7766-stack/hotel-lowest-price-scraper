const { chromium } = require("playwright");
const { scrapeBookingLowestPrice } = require("../lib/scrape-booking");
const { getArgValue, mustGetArgValue } = require("../utils/args");

async function main() {
  const argv = process.argv.slice(2);
  const city = mustGetArgValue(argv, "city");
  const headed = (getArgValue(argv, "headed") ?? "").toLowerCase() === "true";
  const headless = !headed && process.env.PW_HEADLESS !== "false";

  const maxSamplesRaw = getArgValue(argv, "maxSamples");
  const maxSamples = maxSamplesRaw ? Number(maxSamplesRaw) : undefined;
  const timeoutMsRaw = getArgValue(argv, "timeoutMs");
  const timeoutMs = timeoutMsRaw ? Number(timeoutMsRaw) : 180_000;

  const browser = await chromium.launch({
    headless,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  try {
    const context = await browser.newContext({
      locale: "en-IN",
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    });
    const page = await context.newPage();
    const result = await scrapeBookingLowestPrice(page, {
      city,
      maxSamples,
      timeoutMs,
      log: (m) => process.stderr.write(`[scrape] ${m}\n`),
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } finally {
    await browser.close().catch(() => undefined);
  }
}

main().catch((err) => {
  const msg = err instanceof Error ? err.stack || err.message : String(err);
  process.stderr.write(`${msg}\n`);
  process.exit(1);
});
