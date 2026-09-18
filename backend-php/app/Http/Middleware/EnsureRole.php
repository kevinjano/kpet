<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

// Route middleware parameter is a comma-separated allow-list, e.g.
// role:Admin or role:Admin,Client — pass both roles to mean "any logged-in
// user", matching SecurityConfig's .authenticated()/.hasAnyRole(...) rules.
// 403 (not 401) for both "no token" and "wrong role", matching the observed
// behavior of the old Spring Security stateless setup (no login-page
// AuthenticationEntryPoint configured, so ExceptionTranslationFilter always
// answers 403).
class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles)
    {
        $role = $request->attributes->get('authRole');
        $allowed = array_map('strtolower', $roles);
        if (!$role || !in_array(strtolower($role), $allowed, true)) {
            return response()->json(['error' => 'Acceso denegado'], 403);
        }
        return $next($request);
    }
}
