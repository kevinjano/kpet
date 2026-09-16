package org.kpet.petshop.Controllers;

import org.kpet.petshop.Models.Review;
import org.kpet.petshop.Models.User;
import org.kpet.petshop.Repositories.ReviewRepository;
import org.kpet.petshop.Repositories.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Product ratings/reviews. Reading is public (see SecurityConfig, same as
 * products); posting requires a logged-in account (any Client — no purchase
 * verification, this is a simple public review system, not a "verified
 * buyer" one). A user can leave at most one review per product; deleting is
 * self-or-admin, mirroring UserController's isSelfOrAdmin pattern.
 */
@RestController
@RequestMapping("/api/reviews")
public class ReviewController {

    private final ReviewRepository reviewRepository;
    private final UserRepository userRepository;

    public ReviewController(ReviewRepository reviewRepository, UserRepository userRepository) {
        this.reviewRepository = reviewRepository;
        this.userRepository = userRepository;
    }

    public record ReviewRequest(Long productId, int rating, String comment) {
    }

    public record RatingSummary(Long productId, double average, long count) {
    }

    @GetMapping(value = "/product/{productId}", produces = "application/json")
    public List<Review> getReviewsForProduct(@PathVariable Long productId) {
        return reviewRepository.findByProductIdOrderByCreatedAtDesc(productId);
    }

    // One aggregate (average + count) per product with at least one review —
    // lets the storefront grid show star ratings on every card without an API
    // call per product.
    @GetMapping(value = "/summary", produces = "application/json")
    public List<RatingSummary> getRatingSummary() {
        Map<Long, List<Review>> byProduct = reviewRepository.findAll().stream()
                .collect(Collectors.groupingBy(Review::getProductId));

        return byProduct.entrySet().stream()
                .map(entry -> {
                    List<Review> reviews = entry.getValue();
                    double average = reviews.stream().mapToInt(Review::getRating).average().orElse(0);
                    return new RatingSummary(entry.getKey(), average, reviews.size());
                })
                .toList();
    }

    @PostMapping(produces = "application/json")
    public ResponseEntity<?> createReview(@RequestBody ReviewRequest request, Authentication authentication) {
        if (request.rating() < 1 || request.rating() > 5) {
            return ResponseEntity.badRequest().body(Map.of("error", "La calificación debe ser entre 1 y 5."));
        }

        Long userId = Long.valueOf(authentication.getName());
        if (reviewRepository.existsByProductIdAndUserId(request.productId(), userId)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Ya dejaste una reseña para este producto."));
        }

        User user = userRepository.findById(userId).orElse(null);
        String userName = user != null ? (user.getFirstName() + " " + user.getLastName()).trim() : "Cliente Kpet";

        Review review = new Review();
        review.setProductId(request.productId());
        review.setUserId(userId);
        review.setUserName(userName);
        review.setRating(request.rating());
        review.setComment(request.comment());

        return ResponseEntity.ok(reviewRepository.save(review));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteReview(@PathVariable Long id, Authentication authentication) {
        return reviewRepository.findById(id)
                .map(review -> {
                    boolean isAdmin = authentication.getAuthorities().stream()
                            .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
                    boolean isOwner = authentication.getName().equals(String.valueOf(review.getUserId()));
                    if (!isAdmin && !isOwner) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
                    }
                    reviewRepository.delete(review);
                    return ResponseEntity.ok().build();
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
