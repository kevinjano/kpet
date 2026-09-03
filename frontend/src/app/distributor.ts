import {Product} from "./product";

// A row of the "how many of this product does this distributor have" join
// table (backend DistributorProduct). Read-only shape — comes back from the
// API embedded in Distributor.distributorProducts.
export interface DistributorProductEntry {
  id: number;
  product: Product;
  quantity: number;
}

// Write-only shape sent when creating/editing a distributor (see
// admin-distributors.component's productQuantities Map -> this array). The
// backend resolves each productId into a managed DistributorProduct row.
export interface ProductQuantityInput {
  productId: number;
  quantity: number;
}

// Mirrors the backend Distributor entity. whatsappNumber is this distributor's
// OWN number — orders placed on its detail page go straight there, bypassing
// the central store's cart/WhatsApp/QR flow entirely.
export interface Distributor {
  id: number;
  name: string;
  city: string;
  address: string | null;
  description: string | null;
  phone: string | null;
  whatsappNumber: string | null;
  imageUrl: string | null;
  mapUrl: string | null;
  active: boolean;
  distributorProducts: DistributorProductEntry[];
  productQuantities?: ProductQuantityInput[];
}
