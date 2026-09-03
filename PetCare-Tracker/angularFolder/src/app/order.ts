import {OrderItem} from "./order-item";

// Must stay in sync with Order.PENDING_CONFIRMATION/CONFIRMED/COMPLETED/CANCELLED
// on the backend — these are compared to raw string values coming back from the
// API, there's no shared enum between frontend and backend.
export const ORDER_STATUS_PENDING = 'PENDING_CONFIRMATION';
export const ORDER_STATUS_CONFIRMED = 'CONFIRMED';
export const ORDER_STATUS_COMPLETED = 'COMPLETED';
export const ORDER_STATUS_CANCELLED = 'CANCELLED';

// A checkout placed through the central store cart. Mirrors the backend Order
// entity; distributor "quick orders" never create one of these.
export interface Order {
  id: number;
  items: OrderItem[];
  total: number;
  status: string;
  receiptSent: boolean;
  createdAt: string;
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  [ORDER_STATUS_PENDING]: 'Pendiente a confirmar',
  [ORDER_STATUS_CONFIRMED]: 'Confirmado',
  [ORDER_STATUS_COMPLETED]: 'Finalizado',
  [ORDER_STATUS_CANCELLED]: 'Cancelado',
};
