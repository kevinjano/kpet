package org.kpet.petshop.Controllers;

import org.kpet.petshop.Models.Favorite;
import org.kpet.petshop.Models.Product;
import org.kpet.petshop.Repositories.FavoriteRepository;
import org.kpet.petshop.Repositories.ProductRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * A logged-in customer's saved products ("favoritos"). Every endpoint here is
 * scoped to the authenticated principal (see SecurityConfig — falls under the
 * generic .anyRequest().authenticated() rule, no explicit path rule needed);
 * there is no way to read or modify another user's favorites through this API.
 */
@RestController
@RequestMapping("/api/favorites")
public class FavoriteController {

    private final FavoriteRepository favoriteRepository;
    private final ProductRepository productRepository;

    public FavoriteController(FavoriteRepository favoriteRepository, ProductRepository productRepository) {
        this.favoriteRepository = favoriteRepository;
        this.productRepository = productRepository;
    }

    @GetMapping(value = "/mine", produces = "application/json")
    public List<Product> getMyFavorites(Authentication authentication) {
        Long userId = Long.valueOf(authentication.getName());
        List<Long> productIds = favoriteRepository.findByUserId(userId).stream()
                .map(Favorite::getProductId)
                .toList();
        return productRepository.findAllById(productIds);
    }

    @PostMapping("/add/{productId}")
    public ResponseEntity<Void> addFavorite(@PathVariable Long productId, Authentication authentication) {
        Long userId = Long.valueOf(authentication.getName());
        if (!favoriteRepository.existsByUserIdAndProductId(userId, productId)) {
            favoriteRepository.save(new Favorite(userId, productId));
        }
        return ResponseEntity.ok().build();
    }

    @PostMapping("/remove/{productId}")
    public ResponseEntity<Void> removeFavorite(@PathVariable Long productId, Authentication authentication) {
        Long userId = Long.valueOf(authentication.getName());
        favoriteRepository.deleteByUserIdAndProductId(userId, productId);
        return ResponseEntity.ok().build();
    }
}
