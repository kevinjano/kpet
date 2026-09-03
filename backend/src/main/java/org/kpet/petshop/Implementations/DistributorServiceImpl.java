package org.kpet.petshop.Implementations;

import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import org.kpet.petshop.Models.Distributor;
import org.kpet.petshop.Models.DistributorProduct;
import org.kpet.petshop.Models.DistributorProductInput;
import org.kpet.petshop.Models.Product;
import org.kpet.petshop.Repositories.DistributorRepository;
import org.kpet.petshop.Repositories.ProductRepository;
import org.kpet.petshop.Services.DistributorService;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * CRUD for distributors, plus resolving the frontend's write-only
 * {@code {productId, quantity}} pairs (see {@link #buildDistributorProducts})
 * into managed {@link DistributorProduct} rows.
 */
@Service
public class DistributorServiceImpl implements DistributorService {

    private final DistributorRepository distributorRepository;
    private final ProductRepository productRepository;

    public DistributorServiceImpl(DistributorRepository distributorRepository, ProductRepository productRepository) {
        this.distributorRepository = distributorRepository;
        this.productRepository = productRepository;
    }

    // Re-resolves each productId against the DB every save — throws if a product
    // was deleted after being assigned to this distributor, rather than silently
    // dropping it, so the admin notices instead of losing data unexpectedly.
    private List<DistributorProduct> buildDistributorProducts(List<DistributorProductInput> inputs) {
        List<DistributorProduct> items = new ArrayList<>();
        for (DistributorProductInput input : inputs) {
            Product product = productRepository.findById(input.getProductId())
                    .orElseThrow(() -> new EntityNotFoundException("Product not found with ID: " + input.getProductId()));
            items.add(new DistributorProduct(product, input.getQuantity()));
        }
        return items;
    }

    @Override
    public List<Distributor> getAllDistributors() {
        return distributorRepository.findAll();
    }

    @Override
    public Optional<Distributor> getDistributorById(Long id) {
        return distributorRepository.findById(id);
    }

    @Override
    @Transactional
    public Distributor saveDistributor(Distributor distributor) {
        if (distributor.getProductQuantities() != null) {
            distributor.setDistributorProducts(buildDistributorProducts(distributor.getProductQuantities()));
        }
        return distributorRepository.save(distributor);
    }

    @Override
    @Transactional
    public Distributor updateDistributor(Distributor updated) {
        Distributor existing = distributorRepository.findById(updated.getId())
                .orElseThrow(() -> new EntityNotFoundException("Distributor not found with ID: " + updated.getId()));

        existing.setName(updated.getName());
        existing.setCity(updated.getCity());
        existing.setAddress(updated.getAddress());
        existing.setDescription(updated.getDescription());
        existing.setPhone(updated.getPhone());
        existing.setWhatsappNumber(updated.getWhatsappNumber());
        existing.setImageUrl(updated.getImageUrl());
        existing.setMapUrl(updated.getMapUrl());
        existing.setActive(updated.isActive());

        if (updated.getProductQuantities() != null) {
            // Mutate the existing managed collection in place so Hibernate's
            // orphanRemoval correctly deletes the rows that were dropped.
            existing.getDistributorProducts().clear();
            existing.getDistributorProducts().addAll(buildDistributorProducts(updated.getProductQuantities()));
        }

        return distributorRepository.save(existing);
    }

    @Override
    @Transactional
    public void deleteDistributor(Long id) {
        if (!distributorRepository.existsById(id)) {
            throw new EntityNotFoundException("Distributor not found with id: " + id);
        }
        distributorRepository.deleteById(id);
    }
}
