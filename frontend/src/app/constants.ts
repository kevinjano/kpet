// Hardcoded rather than environment.ts because this project doesn't use Angular's
// environment file setup — update this (and the backend's server.port) together
// whenever the API's port changes.
export const API_ORIGIN = 'http://localhost:8090';

// Fixed category list shared by every category <select>/filter across the app
// (storefront nav, admin product form + filter). Not a string enum since it's
// also directly rendered as the visible label — adding a category means adding
// it here only, no backend migration needed since Product.category is a plain string.
export const PRODUCT_CATEGORIES = ['Perros', 'Gatos', 'Novedades'];

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
