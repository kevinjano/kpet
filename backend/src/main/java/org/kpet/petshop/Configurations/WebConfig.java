package org.kpet.petshop.Configurations;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.io.File;
import java.time.Duration;

/**
 * Exposes the server's local upload directory (product/blog/QR images, see
 * {@link org.kpet.petshop.Services.FileStorageService}) as static
 * files under {@code /uploads/**}, so URLs returned by the upload endpoint are
 * directly usable as {@code <img src>} values by the frontend.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${app.upload.dir}")
    private String uploadDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String absolutePath = new File(uploadDir).getAbsolutePath();
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:" + absolutePath + File.separator)
                // Every upload gets a fresh random filename (see FileStorageService),
                // so a given URL's content never changes — safe to cache hard instead
                // of re-fetching the same product photo on every page view.
                .setCacheControl(org.springframework.http.CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable());
    }
}
