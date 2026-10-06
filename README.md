# B-Town Gaming — Booking Site

Customer booking site + staff panel for a gaming lounge in Butwal:
2 PS5 stations, 2 PC rigs, and a Netflix & Chill room for couples,
each bookable independently, 12:00 PM – 8:00 PM daily. Walk-ins and
online bookings share the same live availability, and you get an
email the moment someone books online.

## Run it locally

```
npm install
npm start
```

Then open:
- `http://localhost:3000` — customer booking page
- `http://localhost:3000/admin.html` — staff panel (default password: `changeme123`)

Bookings are stored in `data/bookings.json`. Use the **Backup all bookings**
button in the staff panel regularly — it downloads everything as JSON.

## Customize before you launch

Edit `config.js`:

- `VENUE_NAME`, `CITY`, `CONTACT_PHONE` — shown on the site
- `RESOURCES` — add/remove/rename stations, set `pricePerHour` and the fun `vibe` tagline for each
- `OPEN_HOUR` / `CLOSE_HOUR` — business hours (24h, e.g. `12` and `20`)
- `MAX_SLOTS_PER_BOOKING` — longest single booking a customer can make online
- `BOOKING_WINDOW_DAYS` — how far ahead customers can book
- `ADMIN_PASSWORD` — **change this before going live.** Either edit the
  default directly, or set it via environment variable:
  `ADMIN_PASSWORD=yourpassword npm start`

## Email notifications

Every online booking emails you a summary. To turn it on, set three
environment variables (locally in a `.env`-style export, or in your host's
dashboard — see Render steps below):

- `EMAIL_USER` — a Gmail address to send *from* (can be `karunapandey4845@gmail.com` itself, or a separate account you create just for sending)
- `EMAIL_APP_PASSWORD` — a 16-character **App Password** for that Gmail account (not your normal password)
- `NOTIFY_EMAIL` — where booking alerts go (defaults to `karunapandey4845@gmail.com` if you don't set it)

**To get a Gmail App Password:**
1. Go to your Google Account → Security → turn on **2-Step Verification** (required for app passwords)
2. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Create one (name it "B-Town Gaming"), copy the 16-character code
4. That code is your `EMAIL_APP_PASSWORD`

Without these three variables set, the site works exactly the same — it just
skips sending email.

## Staff panel

- Log in with the admin password (one shared password for all staff, by design —
  keep it to people you trust at the counter).
- Pick a date, click any empty slot to log a walk-in instantly.
- Click an occupied slot to see the customer's name/phone, mark it done, or cancel it.
- The stat tiles at the top show slots filled, online vs. walk-in count, and
  estimated revenue for the selected day.
- **Backup all bookings** downloads every booking ever made as a JSON file —
  do this before any redeploy (see note below).

## Deploying it live on Render (free)

1. **Push this folder to GitHub.** If you don't have a GitHub account yet,
   make one at [github.com](https://github.com) (free), then create a new
   empty repository and push this project to it:
   ```
   git init
   git add .
   git commit -m "B-Town Gaming booking site"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```
2. **Create a Render account** at [render.com](https://render.com) (free, no
   card required for the free tier).
3. **New → Blueprint**, connect your GitHub repo. Render will read the
   `render.yaml` file already in this project and set up the service
   automatically.
4. When prompted, fill in the environment variables it asks for:
   `ADMIN_PASSWORD` (pick a real one), and optionally `EMAIL_USER` /
   `EMAIL_APP_PASSWORD` / `NOTIFY_EMAIL` for email alerts.
5. Deploy. Render gives you a live URL like `https://b-town-gaming.onrender.com`.

**Two things to know about the free tier:**
- **It sleeps.** A free Render service spins down after ~15 minutes with no
  visitors, and the next visitor's page takes ~30–50 seconds to wake it back
  up. Fine for a small lounge; worth knowing so it doesn't look broken.
- **Storage isn't permanent.** The free tier has no persistent disk, so
  `data/bookings.json` gets wiped every time you redeploy (push new code).
  **Click "Backup all bookings" before redeploying**, and keep that file safe.
  When you're ready to stop worrying about this entirely, Render's paid
  Starter plan (~$7/month) adds a persistent disk and the data survives
  redeploys automatically — worth it once the lounge is generating revenue.

A custom domain (e.g. `btowngaming.com.np`) can be pointed at the Render URL
later from Render's dashboard once you own one.

## What's intentionally left out (for a v1)

- **Online payment** — customers currently pay at the counter. If you want to
  stop no-shows, the natural next step is an eSewa/Khalti prepay step before
  confirmation.
- **SMS/WhatsApp confirmation** — booking reference is shown on-screen and
  emailed to you, but not texted to the customer yet. Easy to add later via
  an SMS gateway once you pick one.
- **Multi-location / multi-staff accounts** — fine for one counter; would need
  real per-staff logins if you open a second branch.
