<?php

namespace App\Services;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

// Same claim shape/secret/algorithm as the old Spring Boot JwtService, so
// tokens already sitting in a browser's localStorage keep validating
// unchanged across the cutover to this backend.
class JwtService
{
    private string $secret;
    private int $expirationMinutes;

    public function __construct()
    {
        $this->secret = config('jwt.secret');
        $this->expirationMinutes = config('jwt.expiration_minutes');
    }

    public function generateToken(int $userId, string $role): string
    {
        $now = time();
        $payload = [
            'sub' => (string) $userId,
            'role' => $role,
            'iat' => $now,
            'exp' => $now + $this->expirationMinutes * 60,
        ];
        return JWT::encode($payload, $this->secret, 'HS256');
    }

    /** @throws \Firebase\JWT\ExpiredException|\UnexpectedValueException */
    public function parseClaims(string $token): array
    {
        $decoded = JWT::decode($token, new Key($this->secret, 'HS256'));
        return (array) $decoded;
    }
}
