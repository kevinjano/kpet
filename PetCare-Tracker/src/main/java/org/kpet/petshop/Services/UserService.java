package org.kpet.petshop.Services;

import org.kpet.petshop.Models.User;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/** Business logic for user accounts: registration, auth-adjacent lookups, profile edits, password changes. */
@Service
public interface UserService {

    Optional<User> getUserById(Long id);

    Optional<User> getUserByEmail(String email);

    // Saves a new user, hashing the plaintext password before persisting
    User saveUser(User user);

    // Updates profile fields (does not touch/re-hash the password)
    User updateUser(User user);

    // Verifies the current password and hashes+persists the new one
    User changePassword(Long userId, String currentPassword, String newPassword);

    void deleteUser(Long id);

    List<User> getAllUsers();
}
