package org.kpet.petshop.Implementations;

import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import org.kpet.petshop.Models.Product;
import org.kpet.petshop.Repositories.ProductRepository;
import org.kpet.petshop.Services.ProductService;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/** Straightforward CRUD — no business rules beyond what JPA/the repository already provides. */
@Service
public class ProductServiceImpl implements ProductService {

    private final ProductRepository productRepository;

    public ProductServiceImpl(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Override
    public List<Product> getAllProducts() {
        return productRepository.findAll();
    }

    @Override
    public Optional<Product> getProductById(Long id) {
        return productRepository.findById(id);
    }

    @Override
    public Product saveProduct(Product product) {
        return productRepository.save(product);
    }

    @Override
    @Transactional
    public Product updateProduct(Product updatedProduct) {
        Product existing = productRepository.findById(updatedProduct.getId())
                .orElseThrow(() -> new EntityNotFoundException("Product not found with ID: " + updatedProduct.getId()));

        existing.setName(updatedProduct.getName());
        existing.setDescription(updatedProduct.getDescription());
        existing.setPrice(updatedProduct.getPrice());
        existing.setSalePrice(updatedProduct.getSalePrice());
        existing.setOnSale(updatedProduct.isOnSale());
        existing.setCategory(updatedProduct.getCategory());
        existing.setStock(updatedProduct.getStock());
        existing.setImageUrl(updatedProduct.getImageUrl());
        existing.setImageUrls(updatedProduct.getImageUrls());
        existing.setActive(updatedProduct.isActive());

        return productRepository.save(existing);
    }

    @Override
    @Transactional
    public void deleteProduct(Long id) {
        if (!productRepository.existsById(id)) {
            throw new EntityNotFoundException("Product not found with id: " + id);
        }
        productRepository.deleteById(id);
    }
}
