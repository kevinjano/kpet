<?php

namespace App\Http\Middleware;

use App\Services\JwtService;
use Closure;
use Illuminate\Http\Request;

// Mirrors JwtAuthenticationFilter: reads Authorization: Bearer, and on a
// missing/expired/tampered token it just proceeds unauthenticated instead of
// aborting — whether that's allowed is entirely up to the route's own
// middleware (EnsureAuthenticated / EnsureRole), same as the Spring Security
// filter chain deciding downstream of this filter.
class JwtAuthenticate
{
    public function handle(Request $request, Closure $next)
    {
        $header = $request->header('Authorization', '');
        if (str_starts_with($header, 'Bearer ')) {
            $token = substr($header, 7);
            try {
                $claims = app(JwtService::class)->parseClaims($token);
                $request->attributes->set('authUserId', $claims['sub']);
                $request->attributes->set('authRole', $claims['role']);
            } catch (\Throwable $e) {
                // Expired/malformed/tampered — proceed unauthenticated.
            }
        }
        return $next($request);
    }
}
