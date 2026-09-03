export interface OrderItem {
  // Optional: lets the backend resolve this line back to a real Product for
  // stock deduction on order confirmation (see OrderServiceImpl.deductStock).
  // productName/unitPrice are point-in-time snapshots, not live references.
  productId?: number;
  productName: string;
  quantity: number;
  unitPrice: number;
}
