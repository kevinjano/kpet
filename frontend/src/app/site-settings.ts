// Mirrors the backend's single SiteSettings row (store-wide config, edited from
// admin Configuración). whatsappNumber here is the CENTRAL store's number, not
// any individual Distributor's.
export interface SiteSettings {
  id: number;
  storeName: string;
  logoUrl: string | null;
  bannerUrls: string[];
  whatsappNumber: string;
  aboutText: string | null;
  aboutVideoUrl: string | null;
  address: string | null;
  mapUrl: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  tiktokUrl: string | null;
  youtubeUrl: string | null;
  contactEmail: string | null;
  qrCodeUrl: string | null;
}
