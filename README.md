# Hotel Lowest Price Scraper (5-night stay, INR)

Scrapes Booking.com to:

1. Find a **5-star** hotel in a given city and pick the **highest-rated** result (by review score, then review count).
2. Search **future 5-night** date windows **within the current calendar year** (sampled dates) and return the **lowest total price** found in **INR** for **2 adults + 1 infant (age 0)**.

## Industry-standard Playwright layout (good for interviews)

This repo follows the setup most teams use:

- **`@playwright/test`** — official test runner, reports, trace, CI hooks  
- **`playwright.config.js`** — timeouts, browser project (`chromium`), reporters  
- **`tests/*.spec.js`** — specs call a stable domain flow  
- **`page-objects/`** — **Page Object Model** (selectors + actions per page)  
- **`lib/`** — URL builders, date sampling, navigation helpers shared by tests + CLI  

The **same scraping logic** runs in:

- `npm test` (Playwright Test — what you’d show in an interview)
- `npm start` (plain Node + `playwright` — optional convenience CLI)

> Note: Some travel sites may present bot checks/CAPTCHA depending on your network/environment. Use **headed** mode when that happens.

## Requirements

- Node.js 18+ (recommended 20+)
- Windows / macOS / Linux

## Install

```bash
npm install
npm run install:browsers
```

## Run (recommended): Playwright Test

Default city is **Mumbai**; override with `CITY`:

**Windows (PowerShell)**

```powershell
$env:CITY="Mumbai"; $env:MAX_SAMPLES="2"; npm test
```

**macOS / Linux**

```bash
CITY=Mumbai MAX_SAMPLES=2 npm test
```

Headed browser:

```bash
npx playwright test --headed
```

Interactive UI mode:

```bash
npm run test:ui
```

After a run, open the HTML report:

```bash
npx playwright show-report
```

## Run (optional): Node CLI

### Headless (default)

```bash
npm start -- --city "Mumbai"
```

### Headed (PowerShell)

```powershell
$env:PW_HEADLESS="false"; node src/index.js --city "Mumbai" --headed true
```

### Optional flags

- `--maxSamples <n>`: limit how many check-in dates are tried
- `--timeoutMs <ms>`: increase timeouts if pages are slow

```bash
npm start -- --city "Mumbai" --maxSamples 12 --timeoutMs 120000
```

## Output

- Tests print JSON via `console.log` and use `expect()` for basic assertions.
- CLI prints JSON to stdout.

Fields include `hotelName`, `hotelUrl`, `reviewScore`, `bestPrice` (INR total), `sampledCheckInDates`, and `notes`.

## Design notes (assignment constraints)

- **Language**: JavaScript (Node.js)
- **Automation**: Playwright (`@playwright/test` + Page Objects)
- **Rating reference**: Booking.com review score on search results
- **Currency**: INR (`selected_currency=INR` + guarded INR parsing)
- **Scope**: Single-site flow (no broad crawling)
