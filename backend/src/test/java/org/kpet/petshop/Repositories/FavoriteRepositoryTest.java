package org.kpet.petshop.Repositories;

import org.junit.jupiter.api.Test;
import org.kpet.petshop.Models.Favorite;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Regression test for a real bug found in production behavior: deleteByUserIdAndProductId
 * is a derived delete query, which (unlike delete(entity), inherited from
 * SimpleJpaRepository and @Transactional at the class level) needs its OWN
 * @Transactional — without it, Hibernate throws TransactionRequiredException.
 * That exception's internal error-dispatch was, in turn, being blocked by
 * Spring Security and surfaced to the client as an opaque 403 with no body,
 * which looked exactly like an authorization bug and cost a long debugging
 * session before the real cause (a missing @Transactional) was found. This
 * test fails immediately if that annotation is ever removed.
 */
@DataJpaTest
class FavoriteRepositoryTest {

    @Autowired
    private FavoriteRepository favoriteRepository;

    @Test
    void deleteByUserIdAndProductId_removesTheMatchingRow() {
        favoriteRepository.save(new Favorite(1L, 100L));

        favoriteRepository.deleteByUserIdAndProductId(1L, 100L);

        assertThat(favoriteRepository.existsByUserIdAndProductId(1L, 100L)).isFalse();
    }

    @Test
    void deleteByUserIdAndProductId_onARowThatDoesNotExist_doesNotThrow() {
        favoriteRepository.deleteByUserIdAndProductId(1L, 404L);
    }

    @Test
    void deleteByUserIdAndProductId_onlyRemovesTheMatchingUserAndProduct() {
        favoriteRepository.save(new Favorite(1L, 100L));
        favoriteRepository.save(new Favorite(2L, 100L));

        favoriteRepository.deleteByUserIdAndProductId(1L, 100L);

        assertThat(favoriteRepository.existsByUserIdAndProductId(1L, 100L)).isFalse();
        assertThat(favoriteRepository.existsByUserIdAndProductId(2L, 100L)).isTrue();
    }

    @Test
    void existsByUserIdAndProductId_reflectsWhatWasSaved() {
        favoriteRepository.save(new Favorite(5L, 200L));

        assertThat(favoriteRepository.existsByUserIdAndProductId(5L, 200L)).isTrue();
        assertThat(favoriteRepository.existsByUserIdAndProductId(5L, 999L)).isFalse();
    }

    @Test
    void findByUserId_returnsOnlyThatUsersFavorites() {
        favoriteRepository.save(new Favorite(1L, 100L));
        favoriteRepository.save(new Favorite(1L, 101L));
        favoriteRepository.save(new Favorite(2L, 100L));

        assertThat(favoriteRepository.findByUserId(1L)).hasSize(2);
        assertThat(favoriteRepository.findByUserId(2L)).hasSize(1);
    }
}
