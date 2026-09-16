import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { CartService } from './cart-service';
import { CartToastService } from './cart-toast-service';
import { AuthService } from './auth-service';
import { ModalService } from './modal-service';
import { Product } from '../product';

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 1,
    name: 'Bofe de Res',
    description: '',
    price: 100,
    salePrice: null,
    onSale: false,
    category: 'Perros',
    stock: 30,
    imageUrl: null,
    imageUrls: [],
    active: true,
    ...overrides,
  } as Product;
}

describe('CartService', () => {
  let service: CartService;
  let authServiceStub: { isLoggedIn: jasmine.Spy };
  let modalServiceStub: { confirm: jasmine.Spy; error: jasmine.Spy };

  beforeEach(() => {
    localStorage.clear();
    authServiceStub = { isLoggedIn: jasmine.createSpy('isLoggedIn').and.returnValue(true) };
    modalServiceStub = {
      confirm: jasmine.createSpy('confirm').and.returnValue(Promise.resolve(false)),
      error: jasmine.createSpy('error').and.returnValue(Promise.resolve()),
    };

    TestBed.configureTestingModule({
      providers: [
        CartService,
        { provide: AuthService, useValue: authServiceStub },
        { provide: ModalService, useValue: modalServiceStub },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
      ],
    });
    service = TestBed.inject(CartService);
  });

  afterEach(() => localStorage.clear());

  it('starts empty when localStorage has no saved cart', () => {
    expect(service.getItems()).toEqual([]);
    expect(service.getItemCount()).toBe(0);
  });

  it('addToCart adds a new product with the given quantity', async () => {
    await service.addToCart(makeProduct(), 2);

    expect(service.getItems().length).toBe(1);
    expect(service.getItems()[0].quantity).toBe(2);
  });

  it('addToCart on an already-present product increases its quantity instead of duplicating', async () => {
    const product = makeProduct();
    await service.addToCart(product, 1);
    await service.addToCart(product, 3);

    expect(service.getItems().length).toBe(1);
    expect(service.getItems()[0].quantity).toBe(4);
  });

  it('addToCart does nothing when the user is not logged in', async () => {
    authServiceStub.isLoggedIn.and.returnValue(false);

    await service.addToCart(makeProduct(), 1);

    expect(service.getItems()).toEqual([]);
  });

  it('updateQuantity changes the quantity of an existing item', async () => {
    const product = makeProduct();
    await service.addToCart(product, 1);

    service.updateQuantity(product.id, 5);

    expect(service.getItems()[0].quantity).toBe(5);
  });

  it('updateQuantity to zero or less removes the item entirely', async () => {
    const product = makeProduct();
    await service.addToCart(product, 1);

    service.updateQuantity(product.id, 0);

    expect(service.getItems()).toEqual([]);
  });

  it('removeFromCart removes only the matching product', async () => {
    const productA = makeProduct({ id: 1 });
    const productB = makeProduct({ id: 2 });
    await service.addToCart(productA, 1);
    await service.addToCart(productB, 1);

    service.removeFromCart(1);

    expect(service.getItems().length).toBe(1);
    expect(service.getItems()[0].product.id).toBe(2);
  });

  it('clearCart empties the cart', async () => {
    await service.addToCart(makeProduct(), 1);

    service.clearCart();

    expect(service.getItems()).toEqual([]);
  });

  it('getTotal sums unit price times quantity across items', async () => {
    await service.addToCart(makeProduct({ id: 1, price: 100 }), 2);
    await service.addToCart(makeProduct({ id: 2, price: 50 }), 1);

    expect(service.getTotal()).toBe(250);
  });

  it('getTotal uses salePrice instead of price for on-sale items', async () => {
    await service.addToCart(makeProduct({ price: 100, onSale: true, salePrice: 70 }), 2);

    expect(service.getTotal()).toBe(140);
  });

  it('getItemCount sums quantities, not the number of distinct products', async () => {
    await service.addToCart(makeProduct({ id: 1 }), 2);
    await service.addToCart(makeProduct({ id: 2 }), 3);

    expect(service.getItemCount()).toBe(5);
  });

  it('addToCart caps the quantity at the product\'s available stock and warns', async () => {
    await service.addToCart(makeProduct({ stock: 5 }), 8);

    expect(service.getItems()[0].quantity).toBe(5);
    expect(modalServiceStub.error).toHaveBeenCalled();
  });

  it('addToCart adding more to an already-present item still caps at stock', async () => {
    const product = makeProduct({ stock: 5 });
    await service.addToCart(product, 3);
    await service.addToCart(product, 4);

    expect(service.getItems()[0].quantity).toBe(5);
  });

  it('addToCart refuses to add a product with no stock at all', async () => {
    await service.addToCart(makeProduct({ stock: 0 }), 1);

    expect(service.getItems()).toEqual([]);
    expect(modalServiceStub.error).toHaveBeenCalled();
  });

  it('updateQuantity caps at the item\'s available stock instead of going over', async () => {
    const product = makeProduct({ stock: 5 });
    await service.addToCart(product, 1);

    service.updateQuantity(product.id, 20);

    expect(service.getItems()[0].quantity).toBe(5);
  });

  it('persists the cart to localStorage so a freshly constructed service picks it up', async () => {
    await service.addToCart(makeProduct(), 2);

    // A brand-new instance (simulating a page reload) with the same stubbed
    // collaborators — TestBed.inject() would just return the cached
    // singleton, which wouldn't actually exercise loadFromStorage().
    const freshInstance = new CartService(
      TestBed.inject(CartToastService),
      authServiceStub as any,
      { confirm: () => Promise.resolve(false) } as any,
      { navigate: jasmine.createSpy('navigate') } as any,
    );

    expect(freshInstance.getItems().length).toBe(1);
  });
});
