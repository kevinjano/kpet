<?php

namespace App\Services;

use Firebase\JWT\JWK;
use Firebase\JWT\JWT;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

// Verifies the ID token Google Identity Services hands the frontend after
// "Continuar con Google" — signature against Google's public keys, plus the
// audience/issuer checks Google's own docs require. No google/apiclient
// dependency: firebase/php-jwt (already used for our own tokens) can verify
// any RS256 JWT once given the matching JWK set.
class GoogleAuthService
{
    private const CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';

    private string $clientId;

    public function __construct()
    {
        $this->clientId = (string) config('services.google.client_id');
    }

    /**
     * @return array{sub: string, email: string, given_name: ?string, family_name: ?string, picture: ?string}
     * @throws \RuntimeException on any invalid/expired/mismatched token
     */
    public function verify(string $idToken): array
    {
        $keys = JWK::parseKeySet($this->fetchCerts());
        $claims = (array) JWT::decode($idToken, $keys);

        $issuer = $claims['iss'] ?? '';
        if (!in_array($issuer, ['accounts.google.com', 'https://accounts.google.com'], true)) {
            throw new \RuntimeException('Emisor de token inválido.');
        }
        if (($claims['aud'] ?? null) !== $this->clientId) {
            throw new \RuntimeException('El token no corresponde a esta aplicación.');
        }
        if (empty($claims['email']) || ($claims['email_verified'] ?? false) !== true) {
            throw new \RuntimeException('El correo de Google no está verificado.');
        }

        return [
            'sub' => (string) $claims['sub'],
            'email' => (string) $claims['email'],
            'given_name' => $claims['given_name'] ?? null,
            'family_name' => $claims['family_name'] ?? null,
            'picture' => $claims['picture'] ?? null,
        ];
    }

    private function fetchCerts(): array
    {
        return Cache::remember('google_oauth_certs', now()->addHours(6), function () {
            return Http::timeout(5)->get(self::CERTS_URL)->throw()->json();
        });
    }
}
