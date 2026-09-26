# tomfoolery.games

Tiny web games, neal.fun-style. One Cloudflare Worker serves static files from
`/public`; game APIs live in `/src`. Plain HTML/CSS/JS, no frameworks.

## Run locally

```bash
npm install
npm run db:migrate:local   # create local D1 tables
npm run dev                # http://localhost:8787
```

## Deploy

```bash
npx wrangler login
npx wrangler d1 create tomfoolery   # paste the id into wrangler.jsonc
npm run db:migrate                  # run migrations on the real D1
npm run deploy
```

Custom domains (one-time):

```bash
npx wrangler domains add tomfoolery.games
npx wrangler domains add www.tomfoolery.games
```

Then replace `PASTE_YOUR_TOKEN_HERE` in `public/index.html` and
`public/fruit/index.html` with your Cloudflare Web Analytics token.

## Regenerate images (OG card, favicon.ico, apple-touch-icon)

Needs Chrome installed. `public/favicon.svg` is the hand-drawn icon source.

```bash
node tools/images.mjs
```
