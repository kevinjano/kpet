// Currently unused — admin-distributors.component works with plain Distributor
// objects/form values directly, never constructs this class.
import {Distributor, DistributorProductEntry, ProductQuantityInput} from "./distributor";

export class DistributorModel implements Distributor {
  constructor(
    public id: number,
    public name: string,
    public city: string,
    public address: string | null,
    public description: string | null,
    public phone: string | null,
    public imageUrl: string | null,
    public mapUrl: string | null,
    public active: boolean,
    public distributorProducts: DistributorProductEntry[],
    public productQuantities?: ProductQuantityInput[],
  ) {}
}
