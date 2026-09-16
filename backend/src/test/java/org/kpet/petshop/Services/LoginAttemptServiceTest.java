package org.kpet.petshop.Services;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class LoginAttemptServiceTest {

    @Test
    void freshEmail_isNotLocked() {
        LoginAttemptService service = new LoginAttemptService();

        assertThat(service.isLocked("someone@kpet.com")).isFalse();
    }

    @Test
    void fewerThanFiveFailures_doesNotLock() {
        LoginAttemptService service = new LoginAttemptService();

        for (int i = 0; i < 4; i++) {
            service.recordFailure("someone@kpet.com");
        }

        assertThat(service.isLocked("someone@kpet.com")).isFalse();
    }

    @Test
    void fiveConsecutiveFailures_locksTheEmail() {
        LoginAttemptService service = new LoginAttemptService();

        for (int i = 0; i < 5; i++) {
            service.recordFailure("someone@kpet.com");
        }

        assertThat(service.isLocked("someone@kpet.com")).isTrue();
    }

    @Test
    void aSuccessfulLogin_resetsTheFailureCount() {
        LoginAttemptService service = new LoginAttemptService();

        for (int i = 0; i < 4; i++) {
            service.recordFailure("someone@kpet.com");
        }
        service.recordSuccess("someone@kpet.com");

        // Another 4 failures right after should still be under the
        // threshold, proving the earlier ones were actually cleared rather
        // than just paused.
        for (int i = 0; i < 4; i++) {
            service.recordFailure("someone@kpet.com");
        }
        assertThat(service.isLocked("someone@kpet.com")).isFalse();
    }

    @Test
    void lockoutIsKeyedByEmail_otherEmailsAreUnaffected() {
        LoginAttemptService service = new LoginAttemptService();

        for (int i = 0; i < 5; i++) {
            service.recordFailure("locked-out@kpet.com");
        }

        assertThat(service.isLocked("locked-out@kpet.com")).isTrue();
        assertThat(service.isLocked("someone-else@kpet.com")).isFalse();
    }

    @Test
    void emailMatchingIsCaseAndWhitespaceInsensitive() {
        LoginAttemptService service = new LoginAttemptService();

        for (int i = 0; i < 5; i++) {
            service.recordFailure("  Someone@Kpet.com  ");
        }

        assertThat(service.isLocked("someone@kpet.com")).isTrue();
    }
}
