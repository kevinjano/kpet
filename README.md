# Kpet

Kpet is a pet-shop e-commerce site: a public storefront where customers browse and order pet products, plus an admin panel to manage the catalog, orders, distributors, blog and site settings.

# Features

- Storefront: category/offer browsing, product detail view, cart, checkout, account management.
- Admin panel: products, orders (pending/history), distributors and low-stock tracking, blog posts, users, site settings (logo, banners, social links).
- JWT-based authentication with Admin/Client roles.

# Technologies Used

- Front-end: Angular 17 (standalone components), Bootstrap 5
- Back-end: Spring Boot 3.2.2, Spring Security, JWT
- Database: MySQL 8 (via Docker)

# Getting Started

1. Prerequisites: Docker, Java 17, Node.js/npm, Angular CLI.

2. Database:

   From the project root, start MySQL:
   ```
   docker-compose up -d
   ```

3. Backend:

   ```
   ./mvnw spring-boot:run
   ```
   Runs on `http://localhost:8090`.

4. Frontend:

   ```
   cd angularFolder
   npm install
   ng serve
   ```
   Runs on `http://localhost:4200`.

5. First run seeds a demo admin (`admin@kpet.com`) and client account — change/remove the admin password before deploying to production (see `KpetPetshopApplication.java`).
