<?php

return [
    'driver' => 'bcrypt',

    'bcrypt' => [
        'rounds' => env('BCRYPT_ROUNDS', 10),
        // The existing hashes in the users table were produced by Spring
        // Security's BCryptPasswordEncoder, which writes the $2a$ prefix.
        // PHP's password_get_info() only recognizes $2y$ as "bcrypt" by
        // name (a PHP quirk, not a real incompatibility — password_verify()
        // itself handles $2a$/$2b$/$2y$ identically), and Laravel's
        // Hash::check() refuses to even attempt verification against a hash
        // it doesn't recognize by name unless this is turned off.
        'verify' => false,
    ],

    'argon' => [
        'memory' => 65536,
        'threads' => 1,
        'time' => 4,
        'verify' => true,
    ],

    'rehash_on_login' => true,
];
