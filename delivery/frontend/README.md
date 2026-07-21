# InsightAI — Frontend

A production-ready React frontend for the InsightAI FastAPI backend (dataset upload, data-quality scoring, AI insights, charts, and PDF reports).

## Stack

- **React 18** + **Vite** — fast dev server, small production bundle
- **React Router 6** — client-side routing with a protected-route layout
- **Tailwind CSS** — design-token driven styling (see `tailwind.config.js`)
- **Recharts** — bar / line / pie charts driven directly by `/charts/{file_id}`
- **Axios** — single API client with JWT injection and centralized error handling

## Getting started

```bash
npm install
cp .env.example .env   # set VITE_API_BASE_URL to your backend, e.g. http://localhost:8000
npm run dev
```

The backend must be running (see `backend/main.py`, `uvicorn main:app --reload`) with CORS already open to any origin. Demo login is `admin` / `admin123` (hardcoded in the backend).

Build for production:

```bash
npm run build   # outputs to dist/
npm run preview # serve the production build locally
```

## Project structure

```
src/
  api/client.js          Axios instance, JWT header injection, 401 handling, endpoint wrappers
  context/
    AuthContext.jsx       Login state, token persistence (localStorage), logout-on-401
    ToastContext.jsx       Global toast notifications
  components/             Reusable UI: Sidebar, Topbar, ChartCard, FileDropzone, QualityPulse,
                           StatCard, Pagination, ConfirmDialog, EmptyState, Spinner, ProtectedRoute
  pages/
    Login.jsx              Auth screen
    Dashboard.jsx           Aggregate stats (/dashboard-stats) + recent uploads
    Upload.jsx              Drag-and-drop upload with progress + inline analysis result
    History.jsx             Paginated dataset list (/history) with delete
    DatasetDetail.jsx        Full analysis: quality header, charts, preview table,
                             AI insight generation, PDF report download
    NotFound.jsx
  utils/format.js          Number/date/byte formatting, quality-tier mapping
```

## Notable implementation details

- **AI Insights, grounded in real numbers**: `/generate-insights/{file_id}` now re-reads the
  original file and computes deterministic facts (row/column counts, missing-value rate,
  duplicates, the numeric column that looks like a revenue/sales/amount figure, which
  category it's most concentrated in, a quarter-over-quarter trend if a date column exists,
  and an age-segment breakdown if an age column exists). If an `OPENROUTER_API_KEY` is
  configured, the LLM only rephrases these facts into natural sentences — it's never asked
  to invent a number — and the app falls back to the plain computed facts if the LLM is
  unavailable or returns something malformed. The AI Insights tab renders each fact as its
  own card with a green checkmark, matching a plain-language checklist rather than a wall of
  prose.
- **User profiles**: the topbar's avatar/name (click it — it opens Settings immediately) and
  the Settings → Profile card both show the signed-in user's real username, registered
  email, and auth method (password vs Google), pulled from `GET /me`. Profile photos are
  resized client-side (`Settings.jsx`) before upload to keep the request small, then stored
  as a base64 data URL on the user's document via `POST /me/avatar`; Google accounts get
  their Google profile photo automatically on first sign-in.
- **Theme**: violet/indigo accent system with a working light/dark toggle (top-right sun/moon
  button, persisted in `localStorage`, applied via Tailwind's `class` dark mode strategy).
  `components/Card.jsx` is the shared surface every panel uses, which is what keeps dark mode
  consistent across pages.
- **Per-dataset tabs**: `DatasetDetail.jsx` presents Overview / Visualizations / AI Insights /
  Reports as tabs rather than separate routes, since all four are views over the same
  `/analytics`, `/charts`, `/generate-insights`, and `/report` endpoints for one `file_id`.
- **Auth**: JWT is stored in `localStorage` and attached to every request via an axios
  interceptor. A `401` response anywhere in the app broadcasts a `window` event that
  `AuthContext` listens for, so the user is logged out and redirected consistently —
  no need to catch 401s in individual pages.
- **PDF report download**: `/report/{file_id}` requires the `Authorization` header, which
  a plain `<a href>` can't send. The client fetches it as a `blob` via axios and downloads
  it through an object URL instead (the Reports tab offers both "Preview", which opens the
  blob in a new tab, and "Download PDF").
- **Quality Pulse**: the small waveform used throughout the app (`components/QualityPulse.jsx`)
  is a literal visualization of `quality_score`, `missing_values`, and `duplicates` — it's
  the product's one signature visual element rather than a generic progress bar.
- **Error handling**: the backend's global exception handlers return
  `{ success: false, error: "..." }` / `{ detail: "..." }` shapes; the axios interceptor
  normalizes both into a single `Error` with a human-readable message surfaced via toast.
- **File validation**: client-side checks mirror the backend's rules (extensions, 10 MB
  limit, non-empty file) so users get instant feedback before the network round-trip.

## Environment variables

| Variable | Description | Default |
|---|---|---|
| `VITE_API_BASE_URL` | Base URL of the FastAPI backend | `http://localhost:8000` |
| `VITE_GOOGLE_CLIENT_ID` | OAuth 2.0 Web Client ID from Google Cloud Console. Leave blank to hide "Continue with Google". | _(empty)_ |

## Authentication

- **Username/password**: `/login` and `/register` against the backend's `users` collection
  (passwords are bcrypt-hashed server-side). The old `admin` / `admin123` demo login still
  works — the backend seeds it automatically on startup — but it's now just a regular row
  in the database, not a hardcoded check.
- **Google sign-in**: the frontend uses Google Identity Services to get an ID token, then
  posts it to `/auth/google`, which verifies it server-side and creates the account on first
  login. Requires `GOOGLE_CLIENT_ID` set on the backend and `VITE_GOOGLE_CLIENT_ID` set on
  the frontend (same value, from the same OAuth Client ID). Without it, the button shows an
  explanatory disabled state instead of failing silently.
- `GET /me` returns the signed-in user's username/email/auth_provider, which the topbar and
  Settings page use instead of a hardcoded name.

See `backend/.env.example` for the new `SECRET_KEY` and `GOOGLE_CLIENT_ID` variables, and
`backend/requirements.txt` for the two new dependencies (`passlib[bcrypt]`, `google-auth`).

## Known backend considerations for deployment

- CORS is currently `allow_origins=["*"]`; scope this to your deployed frontend origin in
  production.
