# Emberfall

## Deploy to Render

The repository is configured as one Render web service. Render builds the Vue frontend, then the Express backend serves both the website and `/api` from the same origin. This avoids production CORS and `VITE_API_URL` configuration.

### 1. Prepare Supabase

Run these files in the Supabase SQL editor:

1. The original players and leaderboard schema used by the game.
2. `backend/google-oauth-schema.sql`.
3. `backend/display-name-uniqueness-schema.sql` after resolving any duplicates reported by its diagnostic query.
4. `backend/fishing-schema.sql` to add fishing to leaderboard statistics.
5. `backend/farming-schema.sql` to add farming to leaderboard statistics.
6. `backend/cooking-schema.sql` to add cooking to leaderboard statistics.
7. `backend/auction-schema.sql` if the auction house has not already been created.

Use the Supabase **service role/secret key** on Render, not a browser publishable key. Never add that secret to `frontend/.env` or commit it.

### 2. Create the Render service

Push this repository to GitHub, then choose **New → Blueprint** in Render and select the repository. Render reads `render.yaml` and creates the `emberfall` Node web service.

Enter these secret environment variables when Render asks:

- `SUPABASE_URL` — Supabase project URL.
- `SUPABASE_SECRET_KEY` — Supabase service role/secret key.
- `GOOGLE_CLIENT_ID` — Google OAuth Web Client ID ending in `.apps.googleusercontent.com`.

The Blueprint uses:

- Build: `npm ci --prefix backend && npm ci --prefix frontend && npm run build --prefix frontend`
- Start: `npm start --prefix backend`
- Health check: `/api/health`
- Node: 22.16.0

If updating an existing Render service instead of creating a Blueprint, copy those settings into its dashboard and leave the root directory blank.

### 3. Configure Google

In Google Cloud Console, open the OAuth 2.0 **Web application** client and add the final Render URL to **Authorized JavaScript origins**, for example:

`https://emberfall-fu56.onrender.com`

Also keep `http://localhost:5173` for local development. Do not add paths or a trailing slash. This Google Identity Services flow does not need an authorized redirect URI or client secret.

### 4. Verify production

After deployment:

- `https://YOUR-SERVICE.onrender.com/api/health` returns `{ "ok": true, ... }`.
- `https://YOUR-SERVICE.onrender.com/api/config` contains a non-empty `googleClientId`.
- `https://YOUR-SERVICE.onrender.com` displays the Google login button.

The backend verifies each Google ID token for the configured client ID, requires a verified email, and identifies returning players by Google's stable account ID.

Players can also register and log in with a username and password. The browser stores only the issued game session token and game ID in `localStorage`, so refreshing the page restores the session without retaining the player's password.

## Area progression and navigation

New heroes begin with Battle, Fishing, Farming, Cooking, Workers, Inventory, Achievements, Auction House, High Scores, and Shop. The first Tier 5 normal-enemy victory unlocks Woodcutting, Mining, and Crafting together.

The Battle page also has ten sequential Area Bosses at normal-enemy-equivalent Power Tiers 10, 20, 30, and onward through 100. The Buried Colossus unlocks Metal Detector and the Bannerless King unlocks Factions. The remaining bosses currently award XP and gold, leaving room for more boss-gated areas later. Existing saves preserve previously earned access.

Desktop navigation groups destinations by Adventure, Professions, Realm, and Character. Mobile uses a persistent Battle, Explore, Inventory, and Menu bar; the Explore sheet also shows the next boss and any associated area unlock.

## Local development

Create `backend/.env` with `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and `GOOGLE_CLIENT_ID`. Run `npm run dev` in both `backend` and `frontend`. The frontend defaults to `http://localhost:3000` while running in Vite development mode.
