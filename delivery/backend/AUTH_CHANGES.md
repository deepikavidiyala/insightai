# Backend changes — accounts, Google sign-in, grounded AI insights, profiles, richer reports & charts

This file originally covered just auth; it now also covers the AI Insights rework, profile
picture support, and a later round covering PDF report visuals, quality suggestions, and
chart variety, since they touch the same files.

## Reports, quality suggestions & charts: what changed

- **`chart_engine.py`** — `generate_chart_data(df)` now returns **6–8 charts** instead of up
  to 3: total & average of the detected "target" numeric column by up to two categorical
  columns, that target's own distribution (histogram), a time trend (if a date column
  exists) or a numeric-vs-numeric line otherwise, a second category's distribution, a second
  numeric column's distribution, plus two charts that work on *any* dataset (missing values
  per column, column type breakdown) so the minimum is met even on sparse data. ID-like
  columns (`order_id`, `customer_no`, etc.) and very high-cardinality text columns (customer
  names) are filtered out of consideration so charts group by genuine categories (Region,
  Category, Product) instead. Added `render_chart_png(chart)`, which draws any chart spec
  with matplotlib for embedding in the PDF.
- **`analysis.py`** — added `compute_quality_suggestions(df)`: instead of a fixed list, it
  looks at what's actually wrong with *this* dataset (which columns have missing values and
  how much, duplicate rows, constant/no-signal columns) and returns specific fixes for each
  (impute vs. drop, by how much it would move the needle). `analyze_dataframe()` now returns
  these as `ai_suggestions`, and `chart_recommendations` was trimmed to only list chart types
  that are actually implemented (dropped "Heatmap").
- **`main.py`** — `GET /report/{file_id}` now re-reads the dataset file (same pattern as
  `/charts` and `/generate-insights`) and adds two new sections to the PDF: **"How to
  Improve Data Quality"** (the suggestions above) and **"Visualizations"** (every chart from
  `generate_chart_data`, rendered as PNGs via `render_chart_png`, two per page).
- **`requirements.txt`** — added `matplotlib`.
- Frontend: `StatCard` on the Dashboard now accepts a `to` prop and renders its footer as a
  real link — "View all datasets", "View details", "View insights", and "View charts" all
  navigate to `/history` (there isn't yet a separate page per metric, so they share the one
  list view that has all of them).

## Auth: what changed

- **`database.py`** — added `users_collection`.
- **`auth.py`** — added `hash_password` / `verify_password` (bcrypt via passlib), and
  `verify_google_token` (verifies a Google Identity Services ID token server-side using
  `google-auth`). `SECRET_KEY` is now read from the `SECRET_KEY` env var (still falls back
  to the old hardcoded value if unset, so nothing breaks if you don't set it).
- **`main.py`**:
  - `POST /login` now checks username **or email** + password against the `users`
    collection instead of a hardcoded check.
  - `POST /register` — new endpoint: `{ username, email, password }` → creates the user and
    returns a token (auto-login after signup).
  - `POST /auth/google` — new endpoint: `{ credential }` (the ID token from Google Identity
    Services) → verifies it, finds-or-creates the user by email, returns a token. New Google
    accounts also get their Google profile photo stored automatically.
  - `GET /me` — returns the signed-in user's `{ username, email, auth_provider, avatar }`.
  - `POST /me/avatar` — `{ avatar: "data:image/...;base64,..." }` → stores/replaces the
    user's profile photo (capped at roughly a 375KB source image once base64-encoded).
  - `DELETE /me/avatar` — removes the stored photo.
  - A startup hook seeds the old `admin` / `admin123` account into the `users` collection the
    first time the server runs, so the existing demo login keeps working.
- **`requirements.txt`** — added `passlib[bcrypt]` and `google-auth`.
- **`.env.example`** — added `SECRET_KEY` and `GOOGLE_CLIENT_ID`.

## AI Insights: what changed

The original `generate_insights()` only sent the AI a row *count* and column *names* — never
the actual data — so it had nothing real to summarize from. It now works like this:

- **`analysis.py`** — added `compute_insight_facts(df)`, which re-reads the uploaded file and
  computes a short list of plain-language facts straight from pandas: shape, missing-value
  rate, duplicate count, a numeric "target" column picked by name (revenue/sales/total/
  amount/profit/etc.), which category that target is most concentrated in, a quarter-over-
  quarter trend if a date-like column exists, and an age-segment breakdown if an age column
  exists. Every number in these facts comes directly from the data.
- **`ai_insights.py`** — `generate_insights(dataset, df)` now takes the dataframe, computes
  the facts above, and (only if `OPENROUTER_API_KEY` is set) asks the LLM to rephrase each
  fact as one natural sentence — explicitly forbidding it from changing any number — falling
  back to the raw facts unchanged if the key is missing, the request fails, or the model's
  response doesn't come back as the same number of lines. Returns `{"insights": [...]}` — a
  **list of strings**, not one prose blob.
- **`main.py`** — `POST /generate-insights/{file_id}` now re-reads the dataset file from
  `storage_path` (the same way `/charts/{file_id}` already did) and passes the dataframe in.
  Regenerating insights now `update`s the existing insights document instead of inserting a
  duplicate. The PDF report builder (`/report/{file_id}`) was updated to render the new list
  of insights as individual checkmarked lines instead of assuming a single string.

**This is a breaking response-shape change**: `insights` was a string, it's now an array of
strings. The frontend has been updated to match.

## Setup

```bash
pip install -r requirements.txt --break-system-packages   # or in a venv, without that flag
cp .env.example .env
```

Fill in `.env`:

- `MONGODB_URI` / `MONGODB_DB_NAME` — unchanged from before.
- `SECRET_KEY` — set this to a long random string in any real deployment (JWTs are signed
  with it).
- `GOOGLE_CLIENT_ID` — only needed if you want "Continue with Google" to work. Get one at
  https://console.cloud.google.com/apis/credentials → **Create Credentials → OAuth client ID
  → Web application**. Add your frontend's URL (e.g. `http://localhost:5173`) under
  **Authorized JavaScript origins**. You don't need a redirect URI — Google Identity Services
  uses a popup/One Tap flow, not a redirect.
- `OPENROUTER_API_KEY` / `OPENROUTER_MODEL` — unchanged from before; only needed for the LLM
  phrasing polish on AI Insights. Insights work without it, just as the raw computed facts.

Then run the same way as before: `uvicorn main:app --reload`.

## API summary

| Endpoint | Body | Returns |
|---|---|---|
| `POST /login` | `{ username, password }` (username can be a username or email) | `{ access_token, token_type, user }` |
| `POST /register` | `{ username, email, password }` | `{ access_token, token_type, user }` |
| `POST /auth/google` | `{ credential }` (Google ID token) | `{ access_token, token_type, user }` |
| `GET /me` | — (auth header) | `{ username, email, auth_provider, avatar }` |
| `POST /me/avatar` | `{ avatar: "data:image/...;base64,..." }` | updated user object |
| `DELETE /me/avatar` | — | updated user object |
| `POST /generate-insights/{file_id}` | — | `{ insights: ["...", "...", ...] }` |

All other endpoints are unchanged.

