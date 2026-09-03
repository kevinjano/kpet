import {Product} from "./product";

// One line in the central store cart (CartService), persisted to localStorage
// as JSON. Distributor "quick orders" (DistributorDetailComponent) don't use
// this — that flow never touches CartService.
export interface CartItem {
  product: Product;
  quantity: number;
}
