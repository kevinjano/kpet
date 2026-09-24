<?php

namespace App\Http\Controllers;

use App\Models\DiscountLead;
use App\Support\CsvWriter;
use Illuminate\Http\Request;

class DiscountLeadController extends Controller
{
    public function create(Request $request)
    {
        $email = trim((string) $request->input('email', ''));
        $name = trim((string) $request->input('name', ''));
        if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return response()->json(['error' => 'Nombre y correo válidos son obligatorios.'], 400);
        }

        DiscountLead::create([
            'name' => $name,
            'email' => $email,
            'petName' => $request->input('petName') ?: null,
            'petBirthday' => $request->input('petBirthday') ?: null,
            'createdAt' => now(),
        ]);

        return response()->noContent();
    }

    public function findAll()
    {
        return response()->json(DiscountLead::orderByDesc('createdAt')->get());
    }

    private const EXPORT_HEADERS = ['Fecha', 'Nombre', 'Correo', 'Nombre de mascota', 'Cumpleaños de mascota'];

    public function export()
    {
        $csv = "\u{FEFF}" . CsvWriter::row(self::EXPORT_HEADERS, ';') . "\n";
        foreach (DiscountLead::orderBy('createdAt')->cursor() as $lead) {
            $csv .= CsvWriter::row([
                $lead->createdAt?->format('d/m/Y H:i'),
                $lead->name,
                $lead->email,
                $lead->petName,
                $lead->petBirthday?->format('d/m/Y'),
            ], ';') . "\n";
        }

        return response($csv, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="descuentos-kiara-petnutri.csv"',
        ]);
    }
}
