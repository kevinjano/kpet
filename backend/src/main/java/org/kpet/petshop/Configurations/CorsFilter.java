package org.kpet.petshop.Configurations;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Sets CORS headers on every response, restricted to the single origin
 * configured via app.cors.allowed-origin (env var CORS_ALLOWED_ORIGIN in
 * production) — this is the ONLY place CORS is configured; Spring Security's
 * own CORS support is explicitly disabled in SecurityConfig
 * (`.cors(cors -> cors.disable())`) specifically to avoid two conflicting
 * configurations.
 */
@Component
public class CorsFilter implements Filter {

    @Value("${app.cors.allowed-origin}")
    private String allowedOrigin;

    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain) throws IOException, ServletException {
        HttpServletResponse response = (HttpServletResponse) res;
        response.setHeader("Access-Control-Allow-Origin", allowedOrigin);
        response.setHeader("Access-Control-Allow-Methods", "POST, PUT, GET, OPTIONS, DELETE");
        response.setHeader("Access-Control-Max-Age", "3600");
        response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Content-Length, X-Requested-With");
        chain.doFilter(req, res);
    }
}
