# SEO Setup — VC Typing

## What's implemented
- `client/src/components/Seo.tsx` — per-page `<title>`, meta description, canonical URL, OG/Twitter tags, optional JSON-LD, and `noindex` support. Used on every route.
- Public/indexable pages: `/`, `/home`, `/home/tests`, `/home/tests/:sheetId`, `/home/typing-games`, `/home/games/*`, `/home/tutor`, `/home/tutor/:lessonId`, `/download`, `/privacy`, `/terms`, `/refund`.
- Private pages set `noindex`: `/auth`, `/admin`, `/settings`, `/results`, `/donations`, `/home/test-result`, 404, and the maintenance screen.
- `client/public/robots.txt` — disallows the private routes above, points to the sitemap.
- `client/public/sitemap.xml` — lists only the static/stable pages. Per-ID pages (`/home/tests/:sheetId`, `/home/tutor/:lessonId`) are intentionally left out since they're numerous/dynamic — their parent hub pages (`/home/tests`, `/home/tutor`) carry the sitemap weight instead.
- `vercel.json` has explicit rewrite rules so `/robots.txt` and `/sitemap.xml` are served as static files, never swallowed by the SPA catch-all.

## Known limitation
This is a client-rendered SPA — every route (including 404s) returns HTTP 200 from Vercel's rewrite, since routing happens in the browser. The 404 page sets a `noindex` meta tag, but a true `404` **status code** isn't achievable without a server-side check. This is a standard SPA tradeoff; the noindex tag is the mitigation.

## To finish setup (manual steps)
1. **Google Search Console** — verify the domain at https://search.google.com/search-console, add `https://vctyping.dpdns.org`, verify via the DNS TXT record or the HTML tag method.
2. Submit the sitemap: Search Console → Sitemaps → enter `sitemap.xml` → Submit.
3. **Bing Webmaster Tools** (optional but easy win) — https://www.bing.com/webmasters, same sitemap URL.
4. If the domain ever changes (e.g. off `dpdns.org` to a custom domain), update `SITE_ORIGIN` in `client/src/components/Seo.tsx` and the URLs in `robots.txt`/`sitemap.xml`.
