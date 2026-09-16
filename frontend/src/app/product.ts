// Mirrors the backend Product entity 1:1. Central stock (see admin Productos) is
// distinct from a distributor's own quantity (DistributorProductEntry.quantity).
export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  salePrice: number | null;
  onSale: boolean;
  category: string;
  stock: number;
  imageUrl: string | null;
  imageUrls: string[];
  active: boolean;
}
