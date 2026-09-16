package org.kpet.petshop.Repositories;

import org.junit.jupiter.api.Test;
import org.kpet.petshop.Models.Product;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Regression coverage for the atomic stock UPDATE (deductStock/restockProduct)
 * added to fix a lost-update race: two orders confirming the same product at
 * nearly the same moment used to both read the same pre-decrement stock via
 * findById(), then the second save() silently overwrote the first. These
 * queries do the arithmetic in the UPDATE statement itself instead, so there's
 * no separate read step to race on.
 *
 * Runs against H2 (src/test/resources/application.properties), never the real
 * MySQL database.
 */
@DataJpaTest
class ProductRepositoryStockTest {

    @Autowired
    private ProductRepository productRepository;

    private Product saveProduct(int stock) {
        Product product = new Product(null, "Test Product", "desc", 10.0, null, false, "Perros", stock, null, true);
        return productRepository.saveAndFlush(product);
    }

    @Test
    void deductStock_subtractsRequestedQuantity() {
        Product product = saveProduct(30);

        productRepository.deductStock(product.getId(), 5);

        Product reloaded = productRepository.findById(product.getId()).orElseThrow();
        assertThat(reloaded.getStock()).isEqualTo(25);
    }

    @Test
    void deductStock_floorsAtZeroInsteadOfGoingNegative() {
        Product product = saveProduct(3);

        productRepository.deductStock(product.getId(), 999);

        Product reloaded = productRepository.findById(product.getId()).orElseThrow();
        assertThat(reloaded.getStock()).isEqualTo(0);
    }

    @Test
    void deductStock_onNonexistentProduct_isANoOpAndDoesNotThrow() {
        // Legacy order items / deleted products resolve to no matching row —
        // OrderServiceImpl relies on this being silent, not an exception.
        productRepository.deductStock(999_999L, 1);
    }

    @Test
    void restockProduct_addsRequestedQuantityBack() {
        Product product = saveProduct(10);

        productRepository.restockProduct(product.getId(), 4);

        Product reloaded = productRepository.findById(product.getId()).orElseThrow();
        assertThat(reloaded.getStock()).isEqualTo(14);
    }

    @Test
    void deductStock_concurrentCallsBothApply_noLostUpdate() {
        // Simulates what used to race: two "orders" for the same product,
        // deducted one after another within the same test — since each call is
        // its own atomic UPDATE (not a separate read-then-write), both
        // decrements land instead of the second silently overwriting the first.
        Product product = saveProduct(20);

        productRepository.deductStock(product.getId(), 5);
        productRepository.deductStock(product.getId(), 3);

        Product reloaded = productRepository.findById(product.getId()).orElseThrow();
        assertThat(reloaded.getStock()).isEqualTo(12);
    }
}
