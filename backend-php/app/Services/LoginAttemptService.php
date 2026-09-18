<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;

// Same algorithm as the old LoginAttemptService: 5 failures locks that email
// (not IP) for 15 minutes; hitting the limit also resets the counter to 0,
// so the next window needs 5 fresh failures again after the lock expires.
// Cache-backed instead of an in-process map so it survives PHP-FPM worker
// recycling, but still per-server (not shared across instances) unless the
// cache driver is.
class LoginAttemptService
{
    const MAX_ATTEMPTS = 5;
    const LOCKOUT_MINUTES = 15;

    private function normalize(string $email): string
    {
        return strtolower(trim($email));
    }

    private function attemptsKey(string $email): string
    {
        return 'login_attempts:' . $this->normalize($email);
    }

    private function lockKey(string $email): string
    {
        return 'login_lockout:' . $this->normalize($email);
    }

    public function isLocked(string $email): bool
    {
        return Cache::has($this->lockKey($email));
    }

    public function recordFailure(string $email): void
    {
        $key = $this->attemptsKey($email);
        $count = (int) Cache::get($key, 0) + 1;
        if ($count >= self::MAX_ATTEMPTS) {
            Cache::put($this->lockKey($email), true, now()->addMinutes(self::LOCKOUT_MINUTES));
            Cache::forget($key);
        } else {
            Cache::put($key, $count, now()->addDay());
        }
    }

    public function recordSuccess(string $email): void
    {
        Cache::forget($this->attemptsKey($email));
    }
}
