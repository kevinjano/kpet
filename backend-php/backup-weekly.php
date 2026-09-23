<?php
// Weekly backup, run by a cPanel Cron Job (not web-reachable — this file
// lives outside public/ on purpose). No shell_exec/mysqldump: shared
// hosting commonly disables exec(), so this reimplements a minimal dump
// (CREATE TABLE + INSERT rows) in pure PHP/PDO, then zips it together with
// public/uploads into backups/kiarapet-backup-<date>.zip. Keeps the last 8
// backups (~2 months at a weekly cadence) and deletes older ones so the
// disk doesn't fill up on this shared plan.

$root = __DIR__;
$backupDir = $root . '/backups';
$logFile = $backupDir . '/backup.log';

function logLine(string $file, string $message): void
{
    @file_put_contents($file, '[' . date('Y-m-d H:i:s') . "] {$message}\n", FILE_APPEND);
}

try {
    if (!is_dir($backupDir)) {
        mkdir($backupDir, 0750, true);
    }

    // Minimal .env parser — just KEY=VALUE lines, optionally quoted.
    $env = [];
    foreach (file($root . '/.env') as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
            continue;
        }
        [$key, $value] = explode('=', $line, 2);
        $value = trim($value);
        if (strlen($value) >= 2 && $value[0] === '"' && $value[-1] === '"') {
            $value = substr($value, 1, -1);
        }
        $env[trim($key)] = $value;
    }

    $pdo = new PDO(
        "mysql:host={$env['DB_HOST']};port={$env['DB_PORT']};dbname={$env['DB_DATABASE']};charset=utf8mb4",
        $env['DB_USERNAME'],
        $env['DB_PASSWORD'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    $date = date('Y-m-d');
    $sqlPath = $backupDir . "/db-{$date}.sql";
    $sql = fopen($sqlPath, 'w');
    fwrite($sql, "-- Kiara pet nutri backup — {$date}\nSET FOREIGN_KEY_CHECKS=0;\n\n");

    $tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
    foreach ($tables as $table) {
        $createRow = $pdo->query("SHOW CREATE TABLE `{$table}`")->fetch(PDO::FETCH_ASSOC);
        fwrite($sql, "DROP TABLE IF EXISTS `{$table}`;\n" . $createRow['Create Table'] . ";\n\n");

        $stmt = $pdo->query("SELECT * FROM `{$table}`");
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $columns = array_map(fn($c) => "`{$c}`", array_keys($row));
            $values = array_map(function ($v) use ($pdo) {
                return $v === null ? 'NULL' : $pdo->quote((string) $v);
            }, array_values($row));
            fwrite($sql, "INSERT INTO `{$table}` (" . implode(',', $columns) . ") VALUES (" . implode(',', $values) . ");\n");
        }
        fwrite($sql, "\n");
    }
    fwrite($sql, "SET FOREIGN_KEY_CHECKS=1;\n");
    fclose($sql);

    $zipPath = $backupDir . "/kiarapet-backup-{$date}.zip";
    $zip = new ZipArchive();
    $zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE);
    $zip->addFile($sqlPath, "db-{$date}.sql");

    $uploadsDir = $root . '/public/uploads';
    if (is_dir($uploadsDir)) {
        $files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($uploadsDir, FilesystemIterator::SKIP_DOTS));
        foreach ($files as $file) {
            $zip->addFile($file->getPathname(), 'uploads/' . substr($file->getPathname(), strlen($uploadsDir) + 1));
        }
    }
    $zip->close();
    unlink($sqlPath);

    // Keep only the 8 most recent backups.
    $existing = glob($backupDir . '/kiarapet-backup-*.zip');
    rsort($existing);
    foreach (array_slice($existing, 8) as $old) {
        unlink($old);
    }

    logLine($logFile, 'OK — ' . basename($zipPath) . ' (' . round(filesize($zipPath) / 1024 / 1024, 2) . ' MB)');
} catch (\Throwable $e) {
    logLine($logFile, 'ERROR — ' . $e->getMessage());
}
