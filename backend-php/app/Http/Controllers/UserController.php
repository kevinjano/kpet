<?php

namespace App\Http\Controllers;

use App\Mail\PasswordResetMail;
use App\Models\User;
use App\Services\GoogleAuthService;
use App\Services\JwtService;
use App\Services\LoginAttemptService;
use App\Services\PasswordResetService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;

class UserController extends Controller
{
    public function __construct(
        private JwtService $jwtService,
        private LoginAttemptService $loginAttemptService,
        private GoogleAuthService $googleAuthService,
        private PasswordResetService $passwordResetService,
    ) {}

    private function isSelfOrAdmin(Request $request, $id): bool
    {
        $role = $request->attributes->get('authRole');
        $authUserId = $request->attributes->get('authUserId');
        return strtolower((string) $role) === 'admin' || (string) $authUserId === (string) $id;
    }

    public function create(Request $request)
    {
        $data = $request->all();
        $password = $data['password'] ?? null;
        if (!$password || strlen($password) < 6) {
            return response()->json(['error' => 'La contraseña debe tener al menos 6 caracteres.'], 400);
        }

        // Never trust a client-supplied role — every self-registration is a
        // Client account, matching UserServiceImpl.createUser.
        $user = User::create([
            'firstName' => $data['firstName'] ?? null,
            'lastName' => $data['lastName'] ?? null,
            'email' => $data['email'] ?? null,
            'noTel' => $data['noTel'] ?? null,
            'password' => Hash::make($password),
            'role' => User::ROLE_CLIENT,
        ]);

        return response()->json($user);
    }

    public function login(Request $request)
    {
        $email = (string) $request->input('email', '');
        $password = (string) $request->input('password', '');

        if ($this->loginAttemptService->isLocked($email)) {
            return response('Demasiados intentos fallidos. Intenta de nuevo en unos minutos.', 429);
        }

        $user = User::whereRaw('LOWER(email) = ?', [strtolower(trim($email))])->first();
        if (!$user || $user->password === null || !Hash::check($password, $user->password)) {
            $this->loginAttemptService->recordFailure($email);
            if ($user && $user->password === null) {
                return response('Esta cuenta fue creada con Google. Iniciá sesión con el botón "Continuar con Google".', 401);
            }
            return response('Email o contraseña incorrectos', 401);
        }

        $this->loginAttemptService->recordSuccess($email);
        $token = $this->jwtService->generateToken($user->id, $user->role);

        return response()->json([
            'id' => $user->id,
            'email' => $user->email,
            'firstName' => $user->firstName,
            'role' => $user->role,
            'token' => $token,
        ]);
    }

    // Single entry point for both "Continuar con Google" sign-up and sign-in
    // — whichever one applies is decided here, not by the frontend. Finds by
    // googleId first, then falls back to matching an existing email/password
    // account so someone who registered normally can still use the same
    // email with Google afterward.
    public function google(Request $request)
    {
        $credential = (string) $request->input('credential', '');
        try {
            $profile = $this->googleAuthService->verify($credential);
        } catch (\Throwable $e) {
            return response()->json(['error' => 'No se pudo verificar la cuenta de Google.'], 401);
        }

        $user = User::where('googleId', $profile['sub'])->first();

        if (!$user) {
            $user = User::whereRaw('LOWER(email) = ?', [strtolower($profile['email'])])->first();
            if ($user) {
                $user->googleId = $profile['sub'];
                $user->save();
            }
        }

        if (!$user) {
            $user = User::create([
                'firstName' => $profile['given_name'] ?: $profile['email'],
                'lastName' => $profile['family_name'] ?: '',
                'email' => $profile['email'],
                'noTel' => '',
                'password' => null,
                'role' => User::ROLE_CLIENT,
                'googleId' => $profile['sub'],
            ]);
        }

        $token = $this->jwtService->generateToken($user->id, $user->role);

        return response()->json([
            'id' => $user->id,
            'email' => $user->email,
            'firstName' => $user->firstName,
            'role' => $user->role,
            'token' => $token,
        ]);
    }

    // Always responds the same way whether or not the email exists — avoids
    // leaking which addresses are registered. Google-only accounts (no
    // password) are silently skipped: nothing useful to reset, and pointing
    // them at the Google button is the responsibility of the login error
    // message, not this endpoint.
    public function forgotPassword(Request $request)
    {
        $email = strtolower(trim((string) $request->input('email', '')));
        $user = User::whereRaw('LOWER(email) = ?', [$email])->first();

        if ($user && $user->password !== null) {
            $token = $this->passwordResetService->createToken($email);
            $frontendOrigin = rtrim((string) (config('cors.allowed_origins')[0] ?? ''), '/');
            $resetUrl = "{$frontendOrigin}/restablecer-contrasena?token={$token}";

            Mail::to($email)->send(new PasswordResetMail($resetUrl, config('app.name')));
        }

        return response()->json(['message' => 'Si el correo existe, te enviamos un enlace para restablecer tu contraseña.']);
    }

    public function resetPassword(Request $request)
    {
        $token = (string) $request->input('token', '');
        $newPassword = (string) $request->input('newPassword', '');

        if (strlen($newPassword) < 6) {
            return response()->json(['error' => 'La contraseña debe tener al menos 6 caracteres.'], 400);
        }

        $email = $this->passwordResetService->resolveEmail($token);
        if (!$email) {
            return response()->json(['error' => 'El enlace no es válido o ya venció. Solicitá uno nuevo.'], 400);
        }

        $user = User::whereRaw('LOWER(email) = ?', [$email])->first();
        if (!$user) {
            return response()->json(['error' => 'El enlace no es válido o ya venció. Solicitá uno nuevo.'], 400);
        }

        $user->password = Hash::make($newPassword);
        $user->save();
        $this->passwordResetService->consume($token);

        return response()->noContent();
    }

    public function findAll()
    {
        return response()->json(User::all());
    }

    public function show(Request $request, $id)
    {
        if (!$this->isSelfOrAdmin($request, $id)) {
            return response()->json(['error' => 'Acceso denegado'], 403);
        }
        $user = User::find($id);
        if (!$user) {
            return response()->json(['error' => 'No encontrado'], 404);
        }
        return response()->json($user);
    }

    public function update(Request $request, $id)
    {
        if (!$this->isSelfOrAdmin($request, $id)) {
            return response()->json(['error' => 'Acceso denegado'], 403);
        }
        $user = User::find($id);
        if (!$user) {
            return response()->json(['error' => 'No encontrado'], 404);
        }

        // role and password are deliberately never touched here — matches
        // UserServiceImpl.updateUser (role change / password change are
        // separate, more sensitive flows).
        $user->fill($request->only(['firstName', 'lastName', 'email', 'noTel']));
        $user->save();

        return response()->json($user);
    }

    public function updatePassword(Request $request, $id)
    {
        if (!$this->isSelfOrAdmin($request, $id)) {
            return response()->json(['error' => 'Acceso denegado'], 403);
        }
        $user = User::find($id);
        if (!$user) {
            return response()->json(['error' => 'No encontrado'], 404);
        }

        $currentPassword = (string) $request->input('currentPassword', '');
        $newPassword = (string) $request->input('newPassword', '');

        if (!Hash::check($currentPassword, $user->password)) {
            return response('Current password is incorrect', 401);
        }

        $user->password = Hash::make($newPassword);
        $user->save();

        return response()->noContent();
    }

    public function destroy(Request $request, $id)
    {
        if (!$this->isSelfOrAdmin($request, $id)) {
            return response()->json(['error' => 'Acceso denegado'], 403);
        }
        $user = User::find($id);
        if (!$user) {
            return response()->json(['error' => 'No encontrado'], 404);
        }
        $user->delete();
        return response()->noContent();
    }
}
