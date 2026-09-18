<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->api(prepend: [
            \Illuminate\Http\Middleware\HandleCors::class,
            \App\Http\Middleware\JwtAuthenticate::class,
        ]);
        $middleware->alias([
            'role' => \App\Http\Middleware\EnsureRole::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        // Mirrors the Spring Boot backend's per-controller catch of
        // EntityNotFoundException/IllegalArgumentException with everything
        // else falling through to a generic 500 — see ModelNotFoundException
        // and InvalidArgumentException below.
        $exceptions->render(function (\Illuminate\Database\Eloquent\ModelNotFoundException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json(['error' => 'No encontrado'], 404);
            }
        });
        $exceptions->render(function (\InvalidArgumentException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json(['error' => $e->getMessage()], 400);
            }
        });
    })->create();
