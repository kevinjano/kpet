import { Routes } from '@angular/router';
import { HomeComponent } from "./home/home.component";
import { AuthGuard } from "./auth.guard";

// Only the storefront landing page loads eagerly with the main bundle; every
// other route (including the whole admin panel) is code-split into its own
// chunk and fetched on navigation, keeping the initial download small as the
// app grows. withPreloading(PreloadAllModules) in app.config.ts then quietly
// fetches those chunks in the background right after first paint, so this
// costs nothing in perceived navigation speed.
export const routes: Routes = [
    {path: '', component: HomeComponent},
    {path: 'login', loadComponent: () => import('./login/login.component').then(m => m.LoginComponent), data: {title: 'Iniciar sesión'}},
    {path: 'register', loadComponent: () => import('./register/register.component').then(m => m.RegisterComponent), data: {title: 'Crear cuenta'}},
    {path: 'carrito', loadComponent: () => import('./cart/cart.component').then(m => m.CartComponent), data: {title: 'Carrito de compras'}},
    {path: 'favoritos', loadComponent: () => import('./favorites/favorites.component').then(m => m.FavoritesComponent), data: {title: 'Mis favoritos'}},
    {path: 'blog', loadComponent: () => import('./blog/blog.component').then(m => m.BlogComponent), data: {title: 'Blog', description: 'Consejos, novedades y cuidados para tu mascota, directo del equipo de Kpet.'}},
    {path: 'distribuidores', loadComponent: () => import('./distributors/distributors.component').then(m => m.DistributorsComponent), data: {title: 'Distribuidores', description: 'Encontrá el distribuidor Kpet más cercano para comprar en persona.'}},
    {path: 'distribuidores/:id', loadComponent: () => import('./distributor-detail/distributor-detail.component').then(m => m.DistributorDetailComponent), data: {title: 'Distribuidor'}},
    {path: 'terminos', loadComponent: () => import('./terminos/terminos.component').then(m => m.TerminosComponent), data: {title: 'Términos y condiciones', description: 'Términos y condiciones de uso de la tienda online Kpet.'}},
    {path: 'privacidad', loadComponent: () => import('./privacidad/privacidad.component').then(m => m.PrivacidadComponent), data: {title: 'Política de privacidad', description: 'Cómo Kpet recopila, usa y protege tus datos personales.'}},
    {
        path: 'mon-compte',
        loadComponent: () => import('./mon-compte/mon-compte.component').then(m => m.MonCompteComponent),
        canActivate: [AuthGuard],
        data: {role: 'Client', title: 'Mi cuenta'},
    },
    {
        path: 'admin',
        loadComponent: () => import('./admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
        children: [
            {path: '', loadComponent: () => import('./admin/dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent), canActivate: [AuthGuard], data: {role: 'Admin', title: 'Panel de administración'}},
            {path: 'usuarios', loadComponent: () => import('./admin/admin.component').then(m => m.AdminComponent), canActivate: [AuthGuard], data: {role: 'Admin', title: 'Usuarios'}},
            {path: 'productos', loadComponent: () => import('./admin/products/admin-products.component').then(m => m.AdminProductsComponent), canActivate: [AuthGuard], data: {role: 'Admin', title: 'Productos'}},
            {path: 'configuracion', loadComponent: () => import('./admin/site-settings/admin-site-settings.component').then(m => m.AdminSiteSettingsComponent), canActivate: [AuthGuard], data: {role: 'Admin', title: 'Configuración'}},
            {path: 'blog', loadComponent: () => import('./admin/blog/admin-blog.component').then(m => m.AdminBlogComponent), canActivate: [AuthGuard], data: {role: 'Admin', title: 'Blog'}},
            {path: 'pedidos', loadComponent: () => import('./admin/orders/admin-orders.component').then(m => m.AdminOrdersComponent), canActivate: [AuthGuard], data: {role: 'Admin', title: 'Pedidos'}},
            {path: 'distribuidores', loadComponent: () => import('./admin/distributors/admin-distributors.component').then(m => m.AdminDistributorsComponent), canActivate: [AuthGuard], data: {role: 'Admin', title: 'Distribuidores'}},
        ],
    },
];
