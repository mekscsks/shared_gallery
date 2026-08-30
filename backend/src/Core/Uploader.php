<?php

namespace App\Core;

class Uploader
{
    private const ALLOWED_PHOTO_MIME = [
        'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
    ];

    private const ALLOWED_VIDEO_MIME = [
        'video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo',
    ];

    /**
     * Validate and store one uploaded file.
     *
     * @param  array<string,mixed> $fileEntry  One entry from $_FILES (already isolated, not the raw multi-file array)
     * @param  string              $type       'photo' | 'video'
     * @param  int                 $eventId
     * @param  int                 $maxBytes
     * @return array{ path: string, url: string, filename: string, mime: string, size: int }
     */
    public static function store(array $fileEntry, string $type, int $eventId, int $maxBytes): array
    {
        if (($fileEntry['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            Response::error('File upload error: ' . self::uploadErrorMessage($fileEntry['error']), 422);
        }

        $size = (int) $fileEntry['size'];
        if ($size > $maxBytes) {
            $mb = round($maxBytes / 1024 / 1024);
            Response::error("File exceeds the {$mb} MB limit", 422, 'FILE_TOO_LARGE');
        }

        // Validate MIME from the actual file bytes, not the browser-supplied type
        $finfo    = new \finfo(FILEINFO_MIME_TYPE);
        $realMime = $finfo->file($fileEntry['tmp_name']);
        $allowed  = $type === 'video' ? self::ALLOWED_VIDEO_MIME : self::ALLOWED_PHOTO_MIME;

        if (!in_array($realMime, $allowed, true)) {
            Response::error("File type '{$realMime}' is not allowed", 422, 'INVALID_FILE_TYPE');
        }

        // Build a safe, unique filename
        $ext      = self::extForMime($realMime);
        $filename = bin2hex(random_bytes(12)) . '.' . $ext;
        $dir      = self::storageDir($eventId);

        if (!is_dir($dir) && !mkdir($dir, 0755, true)) {
            error_log("Uploader: could not create directory $dir");
            Response::error('Storage error', 500);
        }

        $dest = $dir . DIRECTORY_SEPARATOR . $filename;
        if (!move_uploaded_file($fileEntry['tmp_name'], $dest)) {
            Response::error('Could not save file', 500);
        }

        $relUrl = '/storage/uploads/' . $eventId . '/' . $filename;

        return [
            'path'     => $dest,
            'url'      => $relUrl,
            'filename' => $filename,
            'mime'     => $realMime,
            'size'     => $size,
        ];
    }

    private static function storageDir(int $eventId): string
    {
        return dirname(__DIR__, 2) . '/storage/uploads/' . $eventId;
    }

    private static function extForMime(string $mime): string
    {
        return match ($mime) {
            'image/jpeg'       => 'jpg',
            'image/png'        => 'png',
            'image/webp'       => 'webp',
            'image/gif'        => 'gif',
            'image/heic',
            'image/heif'       => 'heic',
            'video/mp4'        => 'mp4',
            'video/quicktime'  => 'mov',
            'video/webm'       => 'webm',
            'video/x-msvideo'  => 'avi',
            default            => 'bin',
        };
    }

    private static function uploadErrorMessage(int $code): string
    {
        return match ($code) {
            UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'File too large',
            UPLOAD_ERR_PARTIAL   => 'File only partially uploaded',
            UPLOAD_ERR_NO_FILE   => 'No file uploaded',
            UPLOAD_ERR_NO_TMP_DIR => 'Missing temp folder',
            UPLOAD_ERR_CANT_WRITE => 'Failed to write file',
            default              => "Unknown error ($code)",
        };
    }
}
