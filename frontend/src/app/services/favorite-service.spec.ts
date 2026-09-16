import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { FavoriteService } from './favorite-service';
import { AuthService } from './auth-service';
import { ModalService } from './modal-service';
import { API_ORIGIN } from '../constants';
import { Product } from '../product';

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 7,
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

describe('FavoriteService', () => {
  let service: FavoriteService;
  let httpMock: HttpTestingController;
  let modalServiceStub: { confirm: jasmine.Spy; error: jasmine.Spy };

  beforeEach(() => {
    modalServiceStub = {
      confirm: jasmine.createSpy('confirm').and.returnValue(Promise.resolve(false)),
      error: jasmine.createSpy('error').and.returnValue(Promise.resolve()),
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        FavoriteService,
        { provide: AuthService, useValue: { isLoggedIn: () => true } },
        { provide: ModalService, useValue: modalServiceStub },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
      ],
    });
    service = TestBed.inject(FavoriteService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('isFavorite is false for a product that was never loaded/added', () => {
    expect(service.isFavorite(7)).toBeFalse();
  });

  it('toggleFavorite optimistically adds the product before the request resolves', async () => {
    const product = makeProduct();
    const togglePromise = service.toggleFavorite(product);

    // Flipped immediately, synchronously — before the HTTP call even settles.
    expect(service.isFavorite(7)).toBeTrue();

    const req = httpMock.expectOne(`${API_ORIGIN}/api/favorites/add/7`);
    expect(req.request.method).toBe('POST');
    req.flush(null);
    await togglePromise;

    expect(service.isFavorite(7)).toBeTrue();
  });

  it('toggleFavorite rolls back and shows an error if the add request fails', async () => {
    const product = makeProduct();
    const togglePromise = service.toggleFavorite(product);
    expect(service.isFavorite(7)).toBeTrue();

    const req = httpMock.expectOne(`${API_ORIGIN}/api/favorites/add/7`);
    req.flush('boom', { status: 500, statusText: 'Server Error' });
    await togglePromise;

    expect(service.isFavorite(7)).toBeFalse();
    expect(modalServiceStub.error).toHaveBeenCalled();
  });

  it('toggleFavorite on an already-favorited product sends a remove and optimistically un-favorites it', async () => {
    const product = makeProduct();
    // First add it for real, so the service's internal state has it favorited.
    const addPromise = service.toggleFavorite(product);
    httpMock.expectOne(`${API_ORIGIN}/api/favorites/add/7`).flush(null);
    await addPromise;
    expect(service.isFavorite(7)).toBeTrue();

    const removePromise = service.toggleFavorite(product);
    expect(service.isFavorite(7)).toBeFalse();

    const req = httpMock.expectOne(`${API_ORIGIN}/api/favorites/remove/7`);
    expect(req.request.method).toBe('POST');
    req.flush(null);
    await removePromise;

    expect(service.isFavorite(7)).toBeFalse();
  });

  it('toggleFavorite rolls back to favorited if the remove request fails', async () => {
    const product = makeProduct();
    const addPromise = service.toggleFavorite(product);
    httpMock.expectOne(`${API_ORIGIN}/api/favorites/add/7`).flush(null);
    await addPromise;

    const removePromise = service.toggleFavorite(product);
    const req = httpMock.expectOne(`${API_ORIGIN}/api/favorites/remove/7`);
    req.flush('boom', { status: 500, statusText: 'Server Error' });
    await removePromise;

    expect(service.isFavorite(7)).toBeTrue();
  });

  it('loadFavorites populates favorites$ from the backend', () => {
    const product = makeProduct();
    let latest: Product[] = [];
    service.favorites$.subscribe(favs => (latest = favs));

    service.loadFavorites();
    const req = httpMock.expectOne(`${API_ORIGIN}/api/favorites/mine`);
    req.flush([product]);

    expect(latest.length).toBe(1);
    expect(latest[0].id).toBe(7);
  });

  it('a guest (not logged in) gets prompted to log in instead of a request being sent', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        FavoriteService,
        { provide: AuthService, useValue: { isLoggedIn: () => false } },
        { provide: ModalService, useValue: modalServiceStub },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
      ],
    });
    const guestService = TestBed.inject(FavoriteService);
    const guestHttpMock = TestBed.inject(HttpTestingController);

    await guestService.toggleFavorite(makeProduct());

    expect(modalServiceStub.confirm).toHaveBeenCalled();
    guestHttpMock.expectNone(`${API_ORIGIN}/api/favorites/add/7`);
    guestHttpMock.verify();
  });
});
