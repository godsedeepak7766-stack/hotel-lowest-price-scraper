const { runBookingScrape } = require("./booking");
const { getArgValue, mustGetArgValue } = require("./utils");

async function main() {
  const argv = process.argv.slice(2);
  const city = mustGetArgValue(argv, "city");
  const headed = (getArgValue(argv, "headed") ?? "").toLowerCase() === "true";
  const headless = !headed && process.env.PW_HEADLESS !== "false";

  const maxSamplesRaw = getArgValue(argv, "maxSamples");
  const maxSamples = maxSamplesRaw ? Number(maxSamplesRaw) : undefined;
  const timeoutMsRaw = getArgValue(argv, "timeoutMs");
  const timeoutMs = timeoutMsRaw ? Number(timeoutMsRaw) : 180_000;

  const result = await runBookingScrape(city, { headless, maxSamples, timeoutMs });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((err) => {
  const msg = err instanceof Error ? err.stack || err.message : String(err);
  process.stderr.write(`${msg}\n`);
  process.exit(1);
});

