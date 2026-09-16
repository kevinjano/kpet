package org.kpet.petshop.Repositories;

import org.kpet.petshop.Models.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

// Plain CRUD; admin-side sorting/filtering (by status, search term) happens
// client-side in AdminOrdersComponent, not via query methods here.
@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByUserIdOrderByCreatedAtDesc(Long userId);
}
