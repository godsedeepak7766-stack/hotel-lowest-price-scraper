# Hotel Lowest Price Scraper (5-night stay, INR)

Scrapes Booking.com to:

1. Find a **5-star** hotel in a given city and pick the **highest-rated** result (by review score, then review count).
2. Search **future 5-night** date windows **within the current calendar year** (sampled dates) and return the **lowest total price** found in **INR** for **2 adults + 1 infant (age 0)**.

> Note: Some travel sites may present bot checks/CAPTCHA depending on your network/environment. This project includes a **headed mode** to help when that happens.

## Requirements

- Node.js 18+ (recommended 20+)
- Windows / macOS / Linux

## Install

```bash
npm install
npm run install:browsers
```

## Run

### Headless (default)

```bash
npm start -- --city "Mumbai"
```

### Headed (useful if you hit bot checks)

```bash
npm run start:headed -- --city "Mumbai"
```

### Optional flags

- `--maxSamples <n>`: limit how many check-in dates are tried (useful for quick runs)
- `--timeoutMs <ms>`: increase timeouts if pages are slow

Example:

```bash
npm start -- --city "Mumbai" --maxSamples 12 --timeoutMs 120000
```

## Output

The script prints JSON to stdout, e.g.

- `hotelName`, `hotelUrl`, `reviewScore`, `reviewCount`
- `bestPrice` with `checkIn`, `checkOut`, `totalPrice` (INR) and `approxNightlyPrice`
- `sampledCheckInDates` used for the search
- `notes` for bot-check detection or parsing issues

## Design notes (matches assignment constraints)

- **Programming language**: JavaScript (Node.js)
- **Target platform**: Web scraper (Playwright browser automation)
- **Rating reference**: Booking.com review score on search results
- **Currency**: INR (`selected_currency=INR` + INR parsing)
- **Scope**: Single site scraping (no extension crawling)

