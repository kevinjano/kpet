<?php

namespace App\Http\Controllers;

use App\Services\FileStorageService;
use App\Services\VideoStorageService;
use Illuminate\Http\Request;

class UploadController extends Controller
{
    private const MAX_KB = 15360; // 15MB, matches spring.servlet.multipart.max-file-size
    private const MAX_VIDEO_KB = 51200; // 50MB — short blog clips only, not full episodes

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

    public function uploadVideo(Request $request, VideoStorageService $storage)
    {
        if (!$request->hasFile('file')) {
            return response()->json(['error' => 'No se envió ningún archivo.'], 400);
        }

        $file = $request->file('file');
        if ($file->getSize() > self::MAX_VIDEO_KB * 1024) {
            return response()->json(['error' => 'El video es demasiado grande. El tamaño máximo permitido es 50MB.'], 413);
        }

        try {
            $url = $storage->store($file);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }

        return response()->json(['url' => $url]);
    }
}
