# Resume platform

One link per resume. The link always shows the latest version with a Download PDF button, and you get simple
stats: opens, downloads, IPs, and clicks on links inside the PDF. Every publish is kept as a version.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill it in
```

Local MongoDB for development (optional):

```bash
docker run -d --name resume-platform-mongo -p 127.0.0.1:27017:27017 mongo:7
```

(MongoDB 8 images currently refuse to start on Docker Desktop's newer Linux kernel, see SERVER-121912.)

## Edit resumes from an AI app (MCP)

Connect Claude, ChatGPT, Codex or any MCP app to `https://cv.amankrverma.in/mcp`. The first time, the app sends you
to a page on the site where you approve it with your admin password. `/admin` lists connected apps and can
disconnect them all.

- **Claude** (web, desktop, phone): add a custom connector with that address.
- **Claude Code:** `claude mcp add --transport http resume https://cv.amankrverma.in/mcp`, then `/mcp` to sign in.
- **Codex:** `codex mcp add resume --url https://cv.amankrverma.in/mcp`, then `codex mcp login resume`.
- **ChatGPT:** turn on Developer mode (Settings → Security and login), then add the server as an app.

The tools are `list_resumes`, `get_resume`, `list_versions`, `save_resume`, `set_primary`, `set_active` and
`get_stats`. Saving generates the PDF on the server and the live page updates immediately. Every save is a new
version, so you can always go back.

Once a resume has been edited through an app, the database is ahead of `resumes/<slug>.json`, so the publish command
below refuses to publish that file unless you add `--overwrite`.

## Edit and publish a resume from a file

Each resume is a JSON file in `resumes/`. The file name is the link: `resumes/se.json` is shared as
`PUBLIC_BASE_URL/se`.

```bash
npm run publish-resume -- se --note "what changed"
```

This validates the JSON, renders the PDF with your installed Google Chrome, and stores both in MongoDB as a new
version. Nothing is published if the content hasn't changed, and it warns if the content no longer fits on one page.
After changing the template, CSS or fonts, add `--force` to publish a re-rendered PDF anyway.

Settings come from `.env.local`. To publish to the production database instead, keep its settings in
`.env.prod.local` and add `--env .env.prod.local`. Links inside the PDF (LinkedIn, GitHub, projects, website) point
to `PUBLIC_BASE_URL/go/...` so clicks are counted, then redirect, which is why production publishes need
`PUBLIC_BASE_URL=https://cv.amankrverma.in`.

## Stats

Open `/admin` and sign in with `ADMIN_PASSWORD`. Signing in on a device also stops your own visits on that device
from being counted, so sign in once on each device you use to check your link.

- **Opens**: the page was on screen for at least 3 seconds (filters out link previews and email scanners).
- **Visitors / Downloaders**: unique browsers (cookie), so one person downloading twice counts once.
- **Printed**: someone used the browser's print or Save as PDF.
- **PDF link clicks**: clicks on links inside a downloaded PDF.
- Known bots are recorded but not counted. City and country are filled in only when deployed on Vercel.

`/admin/<slug>` lists every version (with its PDF) and recent activity with IP, location and device.

In `/admin` you can also:

- **Make primary**: that resume is shown on the bare domain (`cv.amankrverma.in`). Its own path keeps working too.
- **Deactivate**: that resume's link (and its PDF link) redirects to the primary. Links inside PDFs you already sent
  keep working. **Activate** turns it back on.

Resume pages show a small cookie notice and link to `/privacy`, `/terms` and `/cookies`.

## Deploy (Vercel)

Publishing runs on your machine against the production database, so the server never needs Chrome.

1. **Push** this folder to a GitHub repo (keep it private: `resumes/*.json` has your phone number). `.env*.local`
   files are git-ignored, so passwords stay on your machine.
2. **Import** the repo in Vercel (Add New → Project). If the repo root is the parent folder rather than this one,
   set Root Directory to `platform`.
3. **Environment variables**, before clicking Deploy: `MONGODB_URI` (your MongoDB connection string),
   `MONGODB_DB=resume`, `ADMIN_PASSWORD` (a new long random one) and `PUBLIC_BASE_URL=https://cv.amankrverma.in`.
   On MongoDB Atlas, Network Access must allow `0.0.0.0/0`, because Vercel has no fixed IPs.
4. **Domain.** In the project's Settings → Domains, add `cv.amankrverma.in`, then add the CNAME record Vercel shows
   in the DNS settings for amankrverma.in.
5. **Publish** your resumes once from your machine: put `MONGODB_URI`, `MONGODB_DB=resume` and
   `PUBLIC_BASE_URL=https://cv.amankrverma.in` in `.env.prod.local`, then run
   `npm run publish-resume -- se --env .env.prod.local` (and the same for `fde`).
6. **Sign in** at `https://cv.amankrverma.in/admin` on each device you use.
