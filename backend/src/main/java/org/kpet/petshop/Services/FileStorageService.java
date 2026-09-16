package org.kpet.petshop.Services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * Persists uploaded images (products, blog posts, distributors, site logo/QR)
 * to a local directory on disk with a randomized filename, returning the
 * public {@code /uploads/...} URL served by WebConfig. There is no interface
 * for this service (unlike the other Service* pairs) since it has a single
 * trivial implementation with no reason to be swapped/mocked yet.
 *
 * Oversized images (phone camera photos routinely come in at 4000px+/several
 * MB) are downscaled before being written to disk — nothing on the storefront
 * or admin panel ever displays a product image anywhere near full resolution,
 * so storing it that large only costs disk space and load time for no benefit.
 * Format is preserved (no JPEG re-encoding of PNGs) so transparent logos/QRs
 * aren't affected.
 */
@Service
public class FileStorageService {

    private static final List<String> ALLOWED_EXTENSIONS = List.of("jpg", "jpeg", "png", "webp", "gif");

    // Longest side an uploaded image is allowed to keep. Product cards, the
    // detail modal, and banners never render anywhere near this large — this
    // comfortably covers a full-bleed desktop banner on a high-DPI screen.
    private static final int MAX_DIMENSION = 1600;

    @Value("${app.upload.dir}")
    private String uploadDir;

    public String store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("No file was provided");
        }

        String originalName = file.getOriginalFilename();
        String extension = originalName != null && originalName.contains(".")
                ? originalName.substring(originalName.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT)
                : "";

        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("Unsupported file type: " + extension);
        }

        try {
            Path uploadPath = Paths.get(uploadDir).toAbsolutePath();
            Files.createDirectories(uploadPath);

            String storedFilename = UUID.randomUUID() + "." + extension;
            Path targetPath = uploadPath.resolve(storedFilename);
            writeResized(file, extension, targetPath);

            return "/uploads/" + storedFilename;
        } catch (IOException e) {
            throw new RuntimeException("Failed to store file", e);
        }
    }

    private void writeResized(MultipartFile file, String extension, Path targetPath) throws IOException {
        BufferedImage original = ImageIO.read(file.getInputStream());
        if (original == null) {
            // Not a format ImageIO can decode (e.g. some GIFs/animated files) —
            // fall back to storing the original bytes untouched rather than
            // failing the whole upload over an optimization.
            Files.write(targetPath, file.getBytes());
            return;
        }

        int width = original.getWidth();
        int height = original.getHeight();
        double scale = Math.min(1.0, (double) MAX_DIMENSION / Math.max(width, height));

        if (scale >= 1.0) {
            Files.write(targetPath, file.getBytes());
            return;
        }

        int scaledWidth = (int) Math.round(width * scale);
        int scaledHeight = (int) Math.round(height * scale);
        int imageType = original.getColorModel().hasAlpha() ? BufferedImage.TYPE_INT_ARGB : BufferedImage.TYPE_INT_RGB;
        BufferedImage scaled = new BufferedImage(scaledWidth, scaledHeight, imageType);

        Graphics2D g = scaled.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.drawImage(original, 0, 0, scaledWidth, scaledHeight, null);
        g.dispose();

        String formatName = extension.equals("jpg") ? "jpeg" : extension;
        if (!ImageIO.write(scaled, formatName, targetPath.toFile())) {
            // No writer for this format (e.g. webp on some JVMs) — store the original instead.
            Files.write(targetPath, file.getBytes());
        }
    }
}
