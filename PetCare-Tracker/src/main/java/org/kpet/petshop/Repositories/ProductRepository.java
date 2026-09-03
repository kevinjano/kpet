package org.kpet.petshop.Repositories;

import org.kpet.petshop.Models.Product;
import org.springframework.data.jpa.repository.JpaRepository;
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
}
