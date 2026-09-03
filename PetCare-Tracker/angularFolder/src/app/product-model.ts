// Currently unused — nothing constructs a ProductModel; admin-products.component
// works with plain Product objects/form values directly. Kept for parity with
// UserModel (which IS used) in case a class-based model is needed here later.
import {Product} from "./product";

export class ProductModel implements Product {
  constructor(
    public id: number,
    public name: string,
    public description: string,
    public price: number,
    public salePrice: number | null,
    public onSale: boolean,
    public category: string,
    public stock: number,
    public imageUrl: string | null,
    public active: boolean,
  ) {}
}
