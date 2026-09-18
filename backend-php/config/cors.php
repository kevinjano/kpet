<?php

// Mirrors the old backend's raw CorsFilter: one configurable origin (not a
// wildcard, not a list), the same allowed methods/headers, no credentials.
return [
    'paths' => ['api/*', 'uploads/*'],

    'allowed_methods' => ['POST', 'PUT', 'GET', 'OPTIONS', 'DELETE'],

    'allowed_origins' => [env('CORS_ALLOWED_ORIGIN', 'http://localhost:4200')],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['Content-Type', 'Authorization', 'Content-Length', 'X-Requested-With'],

    'exposed_headers' => [],

    'max_age' => 3600,

    'supports_credentials' => false,
];
