# Cozy Planner ✿

A cozy, hand-drawn digital planner and journal that syncs between your phone and computer. Think paper planner + sticker book + a little room for your bookshelf.

Free and open source (MIT). You host your own copy, so your journal lives in **your** database, not someone else's.

## What it does

- **Weekly planner**: handwritten-style to-dos with priorities, subtasks, times, recurring tasks, tags and reminders. Drag to reorder or move between days.
- **Month view & month covers**: calendar with to-do dots, plus a decoratable cover page.
- **Notebooks & pages**: draw with a pressure-friendly pen, highlighter and eraser, lasso, shapes, washi, sticky notes and text. Two-page spreads on desktop.
- **Stickers**: drag-and-drop or paste images, cut sticker sheets apart, bulk import (no limit, keeps going in the background), folders, tags (color, style, use) and search. Save your own drawings as stickers. Includes 100+ Fluent Emoji stickers.
- **Reference cards**: a little card box for notes you look up often.
- **Bookshelf room**: your notebooks sit on a bookshelf in a room you can decorate. Five starter styles (coquette, witchy dark academia, plant mom, minimalist, boho), then change the wall, wallpaper, floor, trim, window shape and curtains. Add furniture in any color, plants, cats, rugs, lights, candles, and real working clocks and calendars. The window shows your actual weather.
- **Works everywhere**: installable as an app (PWA) on phone and desktop, with live sync between devices.
- **Optional**: push notifications for timed to-dos, and Todoist import.

## Run your own copy

You'll need a free [Supabase](https://supabase.com) account and [Node.js](https://nodejs.org) 20 or newer.

### 1. Set up the database

1. Create a new Supabase project.
2. Open **SQL Editor → New query**, paste everything from [`supabase/schema.sql`](supabase/schema.sql), and click **Run**. This creates the tables, the privacy rules (everyone only sees their own data), live sync, and the sticker storage.
3. Under **Authentication → URL Configuration**, set the **Site URL** to wherever you'll host the app (use `http://localhost:5173` while testing).

### 2. Run it locally

```bash
git clone https://github.com/YOUR-NAME/cozy-planner.git
cd cozy-planner
cp .env.example .env      # then fill in your Supabase URL and anon/publishable key
npm install
npm run dev
```

Open http://localhost:5173, sign up, and start planning.

### 3. Put it online

Any static host works. On [Vercel](https://vercel.com) or [Netlify](https://netlify.com): import the repo, keep the defaults (Vite, `npm run build`, output `dist`), and add the same `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` environment variables. Then update the Site URL in Supabase to your new address.

### Optional: reminder notifications

1. Install the [Supabase CLI](https://supabase.com/docs/guides/cli) and run `supabase functions deploy push --no-verify-jwt` from this folder.
2. Visit `https://YOUR-PROJECT.supabase.co/functions/v1/push` once so it creates its keys.
3. Turn on the `pg_cron` and `pg_net` extensions, edit the URL in [`supabase/reminders.sql`](supabase/reminders.sql), and run it in the SQL Editor.

Then, in the app, open **Reminders** and turn on notifications on each device.

### Optional: weather fallback

The room's window uses your device's location for weather (via [Open-Meteo](https://open-meteo.com), no key needed). If you'd like a fallback spot for when location is off, set `VITE_WEATHER_LAT` and `VITE_WEATHER_LON` in `.env`.

## Tech

React + Vite, Supabase (auth, Postgres, realtime, storage, edge functions), [perfect-freehand](https://github.com/steveruizok/perfect-freehand) for pen strokes, hand-drawn SVG art for the room.

## Credits

- Sticker art: [Fluent Emoji](https://github.com/microsoft/fluentui-emoji) by Microsoft (MIT).
- Weather: [Open-Meteo](https://open-meteo.com). Town names: [BigDataCloud](https://www.bigdatacloud.com) free reverse geocoding.
- Fonts: Google Fonts (Patrick Hand, Caveat, Dancing Script, Nunito).

## License

MIT. Do what you like with it, just keep the license notice.
