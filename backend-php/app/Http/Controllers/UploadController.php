<?php

namespace App\Http\Controllers;

use App\Services\FileStorageService;
use Illuminate\Http\Request;

class UploadController extends Controller
{
    private const MAX_KB = 15360; // 15MB, matches spring.servlet.multipart.max-file-size

    public function upload(Request $request, FileStorageService $storage)
    {
        if (!$request->hasFile('file')) {
            return response()->json(['error' => 'No se envió ningún archivo.'], 400);
        }

        $file = $request->file('file');
        if ($file->getSize() > self::MAX_KB * 1024) {
            return response()->json(['error' => 'La imagen es demasiado grande. El tamaño máximo permitido es 15MB.'], 413);
        }

        try {
            $url = $storage->store($file);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }

        return response()->json(['url' => $url]);
    }
}
