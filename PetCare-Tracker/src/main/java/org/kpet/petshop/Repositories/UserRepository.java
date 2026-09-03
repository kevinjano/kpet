package org.kpet.petshop.Repositories;

import org.kpet.petshop.Models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Extends both CrudRepository and JpaRepository for the same entity — redundant
 * (JpaRepository already extends CrudRepository transitively) but harmless; kept
 * as-is to avoid an unrelated signature change.
 */
@Repository
public interface UserRepository extends CrudRepository<User, Long>, JpaRepository<User, Long> {

    // Backs both login (email/password lookup) and the "email already registered" check.
    Optional<User> findByEmail(String email);

}
