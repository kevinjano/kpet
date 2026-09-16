package org.kpet.petshop.Repositories;

import org.kpet.petshop.Models.Favorite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface FavoriteRepository extends JpaRepository<Favorite, Long> {
    List<Favorite> findByUserId(Long userId);
    boolean existsByUserIdAndProductId(Long userId, Long productId);

    // Unlike delete(entity) (inherited from SimpleJpaRepository, which is
    // @Transactional at the class level), a derived deleteBy... query method
    // needs its own @Transactional — without it, Hibernate throws
    // TransactionRequiredException, which Spring Security's error-dispatch
    // handling was masking as an opaque 403 instead of the real 500.
    @Transactional
    void deleteByUserIdAndProductId(Long userId, Long productId);
}
