<?php

return [
    // Same HS256 secret/claim shape the old Spring Boot backend used, so
    // tokens already in a browser's localStorage keep validating unchanged
    // across the cutover, and so this file matches what UserController.login()
    // issues (sub = user id, role = "Admin"/"Client" exact casing).
    'secret' => env('JWT_SECRET'),
    'expiration_minutes' => (int) env('JWT_EXPIRATION_MINUTES', 1440),
];
