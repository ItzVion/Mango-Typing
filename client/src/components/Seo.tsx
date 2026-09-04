import { useEffect } from "react";

const SITE_NAME = "VC Typing";
const SITE_ORIGIN = "https://vctyping.dpdns.org";
const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/favicon-512.png`;

interface SeoProps {
  title: string;
  description: string;
  /** Path only, e.g. "/home/typing-games" — canonical is built from SITE_ORIGIN + this. */
  path: string;
  /** Set true for private/account/admin pages so they're excluded from search results. */
  noindex?: boolean;
  ogType?: "website" | "article";
  ogImage?: string;
  jsonLd?: object | object[];
}

// Sets document head tags on mount/route change and removes them on unmount,
// so navigating between routes never leaves a stale title or a previous
// page's canonical/OG tags behind. No react-helmet dependency — this is a
// small enough surface to manage directly, and it's one less package to
// audit and keep patched.
function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
  return el;
}

function upsertLink(rel: string, href: string) {
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
  return el;
}

export function Seo({ title, description, path, noindex = false, ogType = "website", ogImage, jsonLd }: SeoProps) {
  useEffect(() => {
    const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
    const url = `${SITE_ORIGIN}${path}`;
    const image = ogImage || DEFAULT_OG_IMAGE;
    const prevTitle = document.title;

    document.title = fullTitle;
    const created: Element[] = [];
    const track = <T extends Element>(el: T) => {
      created.push(el);
      return el;
    };

    track(upsertMeta("name", "description", description));
    track(upsertMeta("name", "robots", noindex ? "noindex, nofollow" : "index, follow"));
    track(upsertLink("canonical", url));

    track(upsertMeta("property", "og:site_name", SITE_NAME));
    track(upsertMeta("property", "og:title", fullTitle));
    track(upsertMeta("property", "og:description", description));
    track(upsertMeta("property", "og:url", url));
    track(upsertMeta("property", "og:type", ogType));
    track(upsertMeta("property", "og:image", image));

    track(upsertMeta("name", "twitter:card", "summary_large_image"));
    track(upsertMeta("name", "twitter:title", fullTitle));
    track(upsertMeta("name", "twitter:description", description));
    track(upsertMeta("name", "twitter:image", image));

    let scriptEl: HTMLScriptElement | null = null;
    if (jsonLd) {
      scriptEl = document.createElement("script");
      scriptEl.type = "application/ld+json";
      scriptEl.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(scriptEl);
    }

    return () => {
      document.title = prevTitle;
      created.forEach((el) => el.remove());
      scriptEl?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, path, noindex, ogType, ogImage, JSON.stringify(jsonLd)]);

  return null;
}

export { SITE_NAME, SITE_ORIGIN };
