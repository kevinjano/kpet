package org.kpet.petshop.Repositories;

import org.kpet.petshop.Models.Distributor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

// Plain CRUD; city filtering (public distributors page) and search (admin) both
// happen client-side against the full list from /findAll.
@Repository
public interface DistributorRepository extends JpaRepository<Distributor, Long> {
}
