package org.kpet.petshop.Configurations;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Real, per-path authorization backed by the JWT set up in JwtAuthenticationFilter
 * (registered below). Public storefront reads (products/blog/distributors/settings
 * GETs, /uploads/**) and the actions a guest needs (register, login, place an
 * order, confirm receipt sent) stay open; everything that mutates the catalog,
 * site config, or another user's data now requires a valid token with the right
 * role. CORS is handled entirely by CorsFilter, not here (kept disabled below to
 * avoid two conflicting CORS configurations).
 *
 * Fine-grained "is this MY account" checks (profile edit/delete, password
 * change) can't be expressed as a simple path rule since any client can hit
 * /api/users/{id} for ANY id — those are enforced in UserController itself by
 * comparing the authenticated principal to the path id (see isSelfOrAdmin there).
 * This config only guarantees the request is authenticated at all for those paths.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // CORS is handled separately by the raw CorsFilter servlet filter.
                .cors(cors -> cors.disable())
                // Stateless token auth — no server-side session, so CSRF (which
                // protects cookie-based sessions) doesn't apply here.
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Browsers send an unauthenticated OPTIONS "preflight" request before
                        // any cross-origin POST/PUT/DELETE (or any request carrying our
                        // Authorization header) to ask permission before sending the real one.
                        // Without this, every such preflight gets rejected by the
                        // .anyRequest().authenticated() rule below, the browser never sends the
                        // real request, and everything (including login) silently fails as a
                        // CORS error — this must come before every other rule.
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // --- Public: storefront browsing ---
                        .requestMatchers(HttpMethod.GET, "/api/products/**", "/api/blog/**",
                                "/api/distributors/**", "/api/settings").permitAll()
                        .requestMatchers("/uploads/**").permitAll()

                        // --- Public: account creation + login ---
                        .requestMatchers(HttpMethod.POST, "/api/users/login", "/api/users/create").permitAll()

                        // --- Public: guest checkout (no account required to buy) ---
                        .requestMatchers(HttpMethod.POST, "/api/orders/create").permitAll()
                        .requestMatchers(HttpMethod.PUT, "/api/orders/*/receipt-sent").permitAll()

                        // --- Authenticated: a logged-in customer's own order history.
                        // Must come before the /api/orders/* ADMIN rule below, since that
                        // single-segment wildcard would otherwise also match "/mine" and
                        // wrongly require ADMIN for it. ---
                        .requestMatchers(HttpMethod.GET, "/api/orders/mine").authenticated()

                        // --- Admin only: catalog/content/settings management ---
                        .requestMatchers(HttpMethod.POST, "/api/products/**", "/api/blog/**",
                                "/api/distributors/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/products/**", "/api/blog/**",
                                "/api/distributors/**", "/api/settings/**", "/api/orders/*/status").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/products/**", "/api/blog/**",
                                "/api/distributors/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/upload").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/users/findAll", "/api/orders/findAll",
                                "/api/orders/*").hasRole("ADMIN")

                        // --- Authenticated: self-service account endpoints (self-or-admin
                        // check happens inside UserController) ---
                        .requestMatchers("/api/users/**").authenticated()

                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
