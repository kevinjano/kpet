package org.kpet.petshop.Repositories;

import org.kpet.petshop.Models.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Note: findByCategory/findByOnSaleTrue/findByActiveTrue are currently unused —
 * the storefront fetches the full catalog via /findAll and filters client-side
 * in HomeComponent. They're left here as ready-to-use, index-backed (see
 * Product's @Table(indexes=...)) query methods for whenever server-side
 * filtering or pagination is introduced.
 */
@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    List<Product> findByCategory(String category);

    List<Product> findByOnSaleTrue();

    List<Product> findByActiveTrue();

    // Single atomic UPDATE instead of read-then-write (findById + setStock +
    // save) — two orders confirming the same product at the same moment would
    // otherwise both read the same pre-decrement stock and the second save
    // would silently overwrite the first, undercounting how much was sold
    // (classic lost-update race). Doing the subtraction in the UPDATE
    // statement itself makes it one atomic row operation at the database
    // level, so concurrent calls serialize correctly instead of racing.
    // clearAutomatically evicts the row from the persistence context so nothing
    // in the same transaction can read a stale in-memory Product afterward.
    @Modifying(clearAutomatically = true)
    @Query("UPDATE Product p SET p.stock = CASE WHEN p.stock >= :quantity THEN p.stock - :quantity ELSE 0 END WHERE p.id = :productId")
    void deductStock(@Param("productId") Long productId, @Param("quantity") int quantity);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE Product p SET p.stock = p.stock + :quantity WHERE p.id = :productId")
    void restockProduct(@Param("productId") Long productId, @Param("quantity") int quantity);
}
