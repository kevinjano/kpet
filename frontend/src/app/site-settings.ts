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
  missionText: string | null;
  visionText: string | null;
  commitmentText: string | null;
  aboutVideoUrl: string | null;
  aboutImageUrl: string | null;
  address: string | null;
  mapUrl: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  tiktokUrl: string | null;
  youtubeUrl: string | null;
  contactEmail: string | null;
  qrCodeUrl: string | null;
  discountEnabled: boolean;
  discountPercent: number;
  discountImageUrl: string | null;
  categoryImagePerros: string | null;
  categoryImageGatos: string | null;
  categoryImageAccesorios: string | null;
  followCardImageUrl: string | null;
  contactCardImageUrl: string | null;
}
