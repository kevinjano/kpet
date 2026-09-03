package org.kpet.petshop.Services;

import org.kpet.petshop.Models.Product;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/** CRUD for the product catalog. See ProductController for the REST surface. */
@Service
public interface ProductService {

    List<Product> getAllProducts();

    Optional<Product> getProductById(Long id);

    Product saveProduct(Product product);

    Product updateProduct(Product product);

    void deleteProduct(Long id);
}
