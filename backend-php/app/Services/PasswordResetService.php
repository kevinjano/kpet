<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

// Cache-backed like LoginAttemptService — no dedicated table. The token
// itself (not a hash of it) is the cache key, so a lookup is a single
// Cache::get; that's fine here since it's single-use and short-lived (an
// attacker would need to guess a 40-character random string within 30 min).
class PasswordResetService
{
    const TTL_MINUTES = 30;

    private function key(string $token): string
    {
        return 'password_reset:' . $token;
    }

    public function createToken(string $email): string
    {
        $token = Str::random(40);
        Cache::put($this->key($token), strtolower(trim($email)), now()->addMinutes(self::TTL_MINUTES));
        return $token;
    }

    public function resolveEmail(string $token): ?string
    {
        return Cache::get($this->key($token));
    }

    public function consume(string $token): void
    {
        Cache::forget($this->key($token));
    }
}
