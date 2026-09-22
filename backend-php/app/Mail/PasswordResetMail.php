<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class PasswordResetMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public string $resetUrl, public string $storeName)
    {
    }

    public function build()
    {
        return $this
            ->subject("Recuperar contraseña — {$this->storeName}")
            ->view('emails.password-reset');
    }
}
