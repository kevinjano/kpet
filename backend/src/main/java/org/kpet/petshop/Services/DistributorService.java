package org.kpet.petshop.Services;

import org.kpet.petshop.Models.Distributor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * CRUD for distributors and, transitively, the product+quantity catalog each
 * one carries (see Distributor.productQuantities / DistributorServiceImpl for
 * how the write-only {productId, quantity} input list is resolved into managed
 * DistributorProduct entities).
 */
@Service
public interface DistributorService {

    List<Distributor> getAllDistributors();

    Optional<Distributor> getDistributorById(Long id);

    Distributor saveDistributor(Distributor distributor);

    Distributor updateDistributor(Distributor distributor);

    void deleteDistributor(Long id);
}
