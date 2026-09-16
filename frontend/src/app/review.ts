export interface Review {
  id: number;
  productId: number;
  userId: number;
  userName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface RatingSummary {
  productId: number;
  average: number;
  count: number;
}
