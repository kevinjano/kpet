package org.kpet.petshop.Controllers;

import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import org.kpet.petshop.Configurations.JwtService;
import org.kpet.petshop.Models.User;
import org.kpet.petshop.KpetPetshopApplication;
import org.kpet.petshop.Repositories.UserRepository;
import org.kpet.petshop.Services.LoginAttemptService;
import org.kpet.petshop.Services.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.logging.Logger;

/**
 * REST surface for accounts, including login. login() now issues a JWT (see
 * JwtService) alongside {id, email, role}; the Angular AuthService stores it
 * and attaches it to later requests (see auth.interceptor.ts). Endpoints that
 * act on a specific account (view/update/change password/delete) require the
 * caller to either BE that account or be an Admin — see isSelfOrAdmin below —
 * since SecurityConfig can only guarantee "some valid account is logged in",
 * not "it's the right one".
 */
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final LoginAttemptService loginAttemptService;

    static Logger log = Logger.getLogger(KpetPetshopApplication.class.getName());

    public UserController(UserService userService, UserRepository userRepository, PasswordEncoder passwordEncoder,
                           JwtService jwtService, LoginAttemptService loginAttemptService) {
        this.userService = userService;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.loginAttemptService = loginAttemptService;
    }

    // True if `authentication` belongs to an Admin, or to the account identified by targetUserId itself.
    private boolean isSelfOrAdmin(Authentication authentication, Long targetUserId) {
        if (authentication == null) {
            return false;
        }
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        return isAdmin || authentication.getName().equals(String.valueOf(targetUserId));
    }

    // Get all users (Admin only — see SecurityConfig)
    @Transactional
    @RequestMapping(value = "/findAll", produces = "application/json")
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    // Create a new user (registration) — password is hashed inside UserService.saveUser
    @Transactional
    @RequestMapping(value = "/create", produces = "application/json", method = RequestMethod.POST)
    public User createUser(@RequestBody User user) {
        log.info("Received user data: " + user);
        return userService.saveUser(user);
    }

    // User login: rate-limited (LoginAttemptService) and issues a JWT on success.
    @Transactional
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials) {
        String email = credentials.get("email");
        String password = credentials.get("password");

        if (loginAttemptService.isLocked(email)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body("Demasiados intentos fallidos. Intenta de nuevo en unos minutos.");
        }

        Optional<User> userOpt = userRepository.findByEmail(email);

        if (userOpt.isPresent() && passwordEncoder.matches(password, userOpt.get().getPassword())) {
            loginAttemptService.recordSuccess(email);
            User user = userOpt.get();
            String token = jwtService.generateToken(user.getId(), user.getRole());

            Map<String, Object> response = new HashMap<>();
            response.put("id", user.getId());
            response.put("email", user.getEmail());
            response.put("firstName", user.getFirstName());
            response.put("role", user.getRole());
            response.put("token", token);
            return ResponseEntity.ok(response);
        } else {
            loginAttemptService.recordFailure(email);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Email ou mot de passe incorrect");
        }
    }

    // Get a user by id (self or Admin only)
    @GetMapping("/{id}")
    public ResponseEntity<?> getUserById(@PathVariable Long id, Authentication authentication) {
        if (!isSelfOrAdmin(authentication, id)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return userService.getUserById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    // Update a user's profile info (not password) — self or Admin only
    @RequestMapping(value = "/update/{id}", produces = "application/json", method = RequestMethod.PUT)
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody User user, Authentication authentication) {
        if (!isSelfOrAdmin(authentication, id)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        log.info("Received user data: " + user);

        user.setId(id);
        try {
            User updated = userService.updateUser(user);
            return ResponseEntity.ok(updated);
        } catch (EntityNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // Change password: verifies the current password server-side before hashing+saving the new one — self or Admin only
    @RequestMapping(value = "/{id}/password", produces = "application/json", method = RequestMethod.PUT)
    public ResponseEntity<?> changePassword(@PathVariable Long id, @RequestBody Map<String, String> body, Authentication authentication) {
        if (!isSelfOrAdmin(authentication, id)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        String currentPassword = body.get("currentPassword");
        String newPassword = body.get("newPassword");

        try {
            userService.changePassword(id, currentPassword, newPassword);
            return ResponseEntity.ok().build();
        } catch (EntityNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(e.getMessage());
        }
    }

    // Delete user by id — self or Admin only (a Client can delete their own account, see "Eliminar cuenta" in Mi Perfil)
    @RequestMapping(value = "/delete/{id}", produces = "application/json", method = RequestMethod.DELETE)
    public ResponseEntity<User> deleteUser(@PathVariable Long id, Authentication authentication) {
        if (!isSelfOrAdmin(authentication, id)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            userService.deleteUser(id);
            return ResponseEntity.ok().build();
        } catch (EntityNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
