/**
 * Shared navigation / noise-reduction helpers used by page objects and CLI.
 */

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

module.exports = { blockSomeNoise, acceptCookiesIfPresent, gotoWithRetries };
