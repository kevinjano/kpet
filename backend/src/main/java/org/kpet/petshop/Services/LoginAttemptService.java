package org.kpet.petshop.Services;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Simple in-memory brute-force guard for /api/users/login, keyed by email
 * (lowercased). After MAX_ATTEMPTS failures in a row, that email is locked out
 * for LOCKOUT_MS regardless of which IP the attempts come from.
 *
 * Deliberately not backed by a database or distributed cache — this resets on
 * every server restart and doesn't share state across multiple server
 * instances. That's an acceptable tradeoff at this app's scale; if this ever
 * runs behind a load balancer with multiple instances, move this to something
 * shared (e.g. Redis) instead.
 */
@Component
public class LoginAttemptService {

    private static final int MAX_ATTEMPTS = 5;
    private static final long LOCKOUT_MS = 15 * 60 * 1000L;

    private static class Attempts {
        int count;
        long lockedUntil;
    }

    private final Map<String, Attempts> attemptsByEmail = new ConcurrentHashMap<>();

    public boolean isLocked(String email) {
        Attempts attempts = attemptsByEmail.get(key(email));
        return attempts != null && attempts.lockedUntil > System.currentTimeMillis();
    }

    public void recordFailure(String email) {
        Attempts attempts = attemptsByEmail.computeIfAbsent(key(email), k -> new Attempts());
        attempts.count++;
        if (attempts.count >= MAX_ATTEMPTS) {
            attempts.lockedUntil = System.currentTimeMillis() + LOCKOUT_MS;
            attempts.count = 0;
        }
    }

    public void recordSuccess(String email) {
        attemptsByEmail.remove(key(email));
    }

    private String key(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }
}
