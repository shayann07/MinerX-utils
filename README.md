# MinerX-utils

Single-page static web tool that drives the `computeTeamDeposits` Firebase Cloud Function on the MinerX backend. Enter a root UID + password, and the page streams live progress logs back from the function as NDJSON, then renders a per-level deposits table plus grand totals. Plain HTML/CSS/JavaScript, no framework, no build step.

## Status

Working utility page. Three checked-in files (`index.html`, `app.js`, `styles.css`); the most recent commits are UX polish (responsive table, smooth-center scroll into the results card after a run).

## How It Works

1. The form on `index.html` collects a **Root UID** and a **Password**.
2. On **Start**, `app.js` POSTs `{ rootUid, password }` as JSON to the hardcoded endpoint:

   ```
   https://us-central1-minerxgloble.cloudfunctions.net/computeTeamDeposits
   ```

3. The response body is read as a stream (`response.body.getReader()` + `TextDecoder`) and parsed line by line as NDJSON. Each line is one of:
   - `{ "type": "log",    "text": "..." }`        → appended to the live log with a `[HH:MM:SS]` prefix.
   - `{ "type": "error",  "text": "..." }`        → appended as `ERROR: ...`.
   - `{ "type": "result", "value": { ... } }`     → renders a `Level / Users / AdminDepositTotal / TotalDeposit` table and a Grand Totals JSON block via `renderResult(value)`.
   - `{ "type": "done",   "durationMs": 1234 }`   → appended as `Done. Duration: 1234 ms`.
   - anything else                                → appended as `MSG: <json>`.
4. After the table is built, `centerElementInViewport` blurs any focused input (so the mobile keyboard retracts) and smooth-scrolls the results card to the middle of the viewport.

All cell values are passed through an in-file `escapeHtml` helper before being interpolated into the table HTML.

## Files

```
MinerX-utils/
  index.html     # form + logs + results layout
  app.js         # fetch, NDJSON streaming, table rendering, smooth-scroll helper
  styles.css     # dark theme, glassmorphism cards, responsive table wrapper
```

There is no `package.json`, no bundler config, and no test harness — the three files above are the entire project.

## Tech Stack

- **HTML5** with `<meta name="viewport">` for mobile.
- **Vanilla JavaScript (ES2017+):** `fetch`, `ReadableStream` reader, `TextDecoder`, async/await.
- **CSS:** custom properties, gradients, `@media` breakpoints at 880px and 480px, internal-scroll table wrapper.
- **Backend:** external Firebase Cloud Function (`computeTeamDeposits` on project `minerxgloble`, region `us-central1`). The function source is not in this repository.

## Run Locally

The page is fully static. Either:

- Open `index.html` directly in a browser, or
- Serve the directory with any static server, e.g. `python -m http.server` from the repo root and visit `http://localhost:8000/`.

No install or build is required. The page only needs network access to the Cloud Function URL.

## Honest Limitations

- The Cloud Function URL is **hardcoded** in `app.js`. To point at a different deployment, edit the `FUNCTION_URL` constant at the top of the file.
- The matching server-side `computeTeamDeposits` function — which authenticates the password and walks the team graph — is **not included** in this repository. It lives in a separate MinerX backend project.
- The form transmits the password in a JSON request body to the Cloud Function. The page itself does not enforce TLS or rate limiting; both are responsibilities of the deployed Cloud Function.
- There is no `LICENSE` file in the repository. Treat the source as **all rights reserved by the author** until a license is added.
