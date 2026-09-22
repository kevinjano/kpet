// Hardcoded rather than environment.ts because this project doesn't use Angular's
// environment file setup — update this (and the backend's server.port) together
// whenever the API's port changes.
export const API_ORIGIN = 'http://localhost:8091';

// Public identifier for the "Continuar con Google" button (Google Identity
// Services) — safe to expose client-side, it's not a secret. Registered
// under the Kiara Pet Nutri project in Google Cloud Console.
export const GOOGLE_CLIENT_ID = '917667214262-r7n1eq96tlnvav0p5gevn337u7m95o5d.apps.googleusercontent.com';

// Fixed category list shared by every category <select>/filter across the app
// (storefront nav, admin product form + filter). Not a string enum since it's
// also directly rendered as the visible label — adding a category means adding
// it here only, no backend migration needed since Product.category is a plain string.
export const PRODUCT_CATEGORIES = ['Perros', 'Gatos', 'Novedades', 'Accesorios'];

// Below this stock count, a product counts as "low stock" — shared by the
// admin dashboard's KPI/alert panel, the low-stock warning on order creation,
// and the admin products page's stock filter, so all three agree on the cutoff.
export const LOW_STOCK_THRESHOLD = 15;

// Shown immediately (no flash of placeholder text/broken image) while each
// page's site-settings request is still in flight — matches the logo already
// seeded into site_settings.logoUrl, so in the common case (admin hasn't
// uploaded a different one) the image never actually changes once the real
// settings arrive, just the placeholder-vs-real distinction disappears.
export const DEFAULT_LOGO_URL = '/assets/images/kpet-logo.png';

export function resolveImageUrl(path: string | null | undefined): string | null {
  if (!path) {
    return null;
  }
  // Backend-uploaded files live under /uploads on the API origin; everything
  // else (e.g. /assets/... bundled with the frontend, or a full http(s) URL)
  // is already resolvable as-is.
  return path.startsWith('/uploads/') ? `${API_ORIGIN}${path}` : path;
}

// Turns a YouTube/Vimeo/Google Drive link (whatever shape someone pastes —
// youtu.be, /watch?v=, with other query params before/after v=, /shorts/,
// /live/, youtube-nocookie.com, vimeo.com/id, or a Drive "view" share link)
// into its embeddable iframe URL. Uses the URL API instead of one big regex
// so query-param order doesn't matter (e.g. ?app=desktop&v=ID). Anything
// unrecognized passes through unchanged — isVideoEmbeddable() below decides
// whether it's actually safe to put in an <iframe>.
export function toEmbedVideoUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  const host = parsed.hostname.replace(/^www\./, '');

  if (host === 'youtu.be') {
    const id = parsed.pathname.slice(1).split('/')[0];
    if (id) {
      return `https://www.youtube.com/embed/${id}`;
    }
  }

  if (host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'm.youtube.com') {
    const id = parsed.searchParams.get('v');
    if (id) {
      return `https://www.youtube.com/embed/${id}`;
    }
    const pathMatch = parsed.pathname.match(/\/(shorts|embed|live)\/([\w-]{6,})/);
    if (pathMatch) {
      return `https://www.youtube.com/embed/${pathMatch[2]}`;
    }
  }

  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const pathMatch = parsed.pathname.match(/(\d+)/);
    if (pathMatch) {
      return `https://player.vimeo.com/video/${pathMatch[1]}`;
    }
  }

  if (host === 'drive.google.com') {
    const pathMatch = parsed.pathname.match(/\/file\/d\/([\w-]+)/);
    if (pathMatch) {
      return `https://drive.google.com/file/d/${pathMatch[1]}/preview`;
    }
  }

  return url;
}

// Raw YouTube video ID (no domain-specific formatting), for building a static
// thumbnail URL — used to show a lightweight preview image instead of loading
// the full iframe until the visitor actually taps it (see safeAboutVideoUrl's
// comment in home.component.ts for why that tap-gated load matters on mobile).
export function extractYoutubeId(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const host = parsed.hostname.replace(/^www\./, '');

  if (host === 'youtu.be') {
    return parsed.pathname.slice(1).split('/')[0] || null;
  }
  if (host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'm.youtube.com') {
    const id = parsed.searchParams.get('v');
    if (id) {
      return id;
    }
    const pathMatch = parsed.pathname.match(/\/(shorts|embed|live)\/([\w-]{6,})/);
    if (pathMatch) {
      return pathMatch[2];
    }
  }
  return null;
}

export function isDirectVideoFile(url: string): boolean {
  return /\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(url);
}

// Most video-hosting sites (Instagram, TikTok, Facebook, random CDNs...)
// refuse to be shown in an <iframe> at all (X-Frame-Options/CSP), so forcing
// one for a link we don't recognize just renders a frozen, blank, "se traba"
// box. Only put an iframe on screen for hosts we know actually allow it —
// everything else falls back to a plain "open in a new tab" link instead.
export function isVideoEmbeddable(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return ['youtu.be', 'youtube.com', 'youtube-nocookie.com', 'm.youtube.com', 'vimeo.com', 'player.vimeo.com', 'drive.google.com'].includes(host);
  } catch {
    return false;
  }
}

// Pre-filled into wa.me links (the WhatsApp bubble and the Conócenos contact
// link) so a tap opens the chat with this already typed in, instead of a
// blank conversation the visitor has to start from scratch.
const WHATSAPP_DEFAULT_MESSAGE = 'Hola, vi su página web y quiero más información.';

export function buildWhatsappUrl(number: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(WHATSAPP_DEFAULT_MESSAGE)}`;
}

// Backend error responses are shaped {error: "message"} (see e.g.
// UploadController's exception handlers) — falls back to a generic message for
// anything else (network failure, unexpected response shape).
export function extractErrorMessage(err: any, fallback: string): string {
  return err?.error?.error || fallback;
}

// Shared *ngFor trackBy for any list of entities with a numeric id — lets Angular
// reuse existing DOM nodes instead of re-rendering the whole list on every
// refresh, which matters more and more as catalogs/tables grow.
export function trackById(_index: number, item: { id: number }): number {
  return item.id;
}
