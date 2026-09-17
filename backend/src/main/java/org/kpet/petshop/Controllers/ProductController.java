package org.kpet.petshop.Controllers;

import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import org.kpet.petshop.Models.Product;
import org.kpet.petshop.Repositories.ProductRepository;
import org.kpet.petshop.Services.ProductService;
import org.kpet.petshop.Util.CsvWriter;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * REST surface for the product catalog. Note getAllProducts() reads straight
 * from ProductRepository rather than through ProductService — a pass-through
 * with identical behavior today, kept this way for consistency with the other
 * findAll endpoints in this codebase (see UserController, OrderController, etc.).
 */
@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService productService;
    private final ProductRepository productRepository;

    public ProductController(ProductService productService, ProductRepository productRepository) {
        this.productService = productService;
        this.productRepository = productRepository;
    }

    @RequestMapping(value = "/findAll", produces = "application/json")
    public List<Product> getAllProducts() {
        return productRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Product> getProductById(@PathVariable Long id) {
        return productService.getProductById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @Transactional
    @RequestMapping(value = "/create", produces = "application/json", method = RequestMethod.POST)
    public ResponseEntity<Product> createProduct(@RequestBody Product product) {
        Product saved = productService.saveProduct(product);
        return ResponseEntity.created(URI.create("/api/products/" + saved.getId())).body(saved);
    }

    @RequestMapping(value = "/update/{id}", produces = "application/json", method = RequestMethod.PUT)
    public ResponseEntity<Product> updateProduct(@PathVariable Long id, @RequestBody Product product) {
        product.setId(id);
        try {
            return ResponseEntity.ok(productService.updateProduct(product));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @RequestMapping(value = "/delete/{id}", produces = "application/json", method = RequestMethod.DELETE)
    public ResponseEntity<Void> deleteProduct(@PathVariable Long id) {
        try {
            productService.deleteProduct(id);
            return ResponseEntity.ok().build();
        } catch (EntityNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }

    private static final List<String> CSV_HEADERS = List.of(
            "id", "name", "description", "price", "salePrice", "onSale", "category", "stock", "active");

    // Admin-only bulk catalog editing: export the whole catalog as a CSV,
    // edit it in Excel/Sheets, re-import. A row whose "id" matches an
    // existing product updates it in place; a blank/unknown id creates a new
    // product instead — same rule for both, so one file can add and edit at
    // the same time.
    @GetMapping("/export")
    public ResponseEntity<String> exportProducts() {
        List<Product> products = productRepository.findAll();
        StringBuilder csv = new StringBuilder();
        csv.append(String.join(",", CSV_HEADERS)).append("\n");
        for (Product p : products) {
            csv.append(CsvWriter.row(
                    String.valueOf(p.getId()),
                    p.getName(),
                    p.getDescription(),
                    String.valueOf(p.getPrice()),
                    p.getSalePrice() != null ? String.valueOf(p.getSalePrice()) : "",
                    String.valueOf(p.isOnSale()),
                    p.getCategory(),
                    String.valueOf(p.getStock()),
                    String.valueOf(p.isActive())
            )).append("\n");
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentDisposition(ContentDisposition.attachment().filename("productos-kpet.csv").build());
        return ResponseEntity.ok()
                .headers(headers)
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(csv.toString());
    }

    public record ImportResult(int created, int updated, List<String> errors) {
    }

    @PostMapping("/import")
    public ResponseEntity<?> importProducts(@RequestParam("file") MultipartFile file) {
        int created = 0;
        int updated = 0;
        List<String> errors = new ArrayList<>();

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            String headerLine = reader.readLine();
            if (headerLine == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "El archivo está vacío."));
            }
            List<String> headers = parseCsvLine(headerLine);

            String line;
            int rowNumber = 1;
            while ((line = reader.readLine()) != null) {
                rowNumber++;
                if (line.isBlank()) {
                    continue;
                }
                List<String> values = parseCsvLine(line);
                Map<String, String> row = new java.util.HashMap<>();
                for (int i = 0; i < headers.size() && i < values.size(); i++) {
                    row.put(headers.get(i).trim(), values.get(i));
                }

                try {
                    String idStr = row.getOrDefault("id", "").trim();
                    Product product = null;
                    if (!idStr.isEmpty()) {
                        product = productRepository.findById(Long.valueOf(idStr)).orElse(null);
                    }
                    boolean isNew = product == null;
                    if (isNew) {
                        product = new Product();
                        product.setActive(true);
                    }

                    applyIfPresent(row, "name", product::setName);
                    applyIfPresent(row, "description", product::setDescription);
                    applyIfPresent(row, "category", product::setCategory);
                    if (row.containsKey("price") && !row.get("price").isBlank()) {
                        product.setPrice(Double.valueOf(row.get("price").trim()));
                    }
                    if (row.containsKey("salePrice")) {
                        String sp = row.get("salePrice").trim();
                        product.setSalePrice(sp.isEmpty() ? null : Double.valueOf(sp));
                    }
                    if (row.containsKey("onSale")) {
                        product.setOnSale(Boolean.parseBoolean(row.get("onSale").trim()));
                    }
                    if (row.containsKey("stock") && !row.get("stock").isBlank()) {
                        product.setStock(Integer.parseInt(row.get("stock").trim()));
                    }
                    if (row.containsKey("active")) {
                        product.setActive(Boolean.parseBoolean(row.get("active").trim()));
                    }

                    if (isNew) {
                        productService.saveProduct(product);
                        created++;
                    } else {
                        productService.updateProduct(product);
                        updated++;
                    }
                } catch (Exception e) {
                    errors.add("Fila " + rowNumber + ": " + e.getMessage());
                }
            }
        } catch (IOException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "No se pudo leer el archivo."));
        }

        return ResponseEntity.ok(new ImportResult(created, updated, errors));
    }

    private void applyIfPresent(Map<String, String> row, String key, java.util.function.Consumer<String> setter) {
        if (row.containsKey(key)) {
            setter.accept(row.get(key));
        }
    }

    // Minimal CSV line parser: handles quoted fields (with embedded commas
    // and escaped "" quotes) — matches what exportProducts() writes and what
    // Excel/Sheets produce, without pulling in an external CSV library for
    // one admin-only import screen.
    private List<String> parseCsvLine(String line) {
        List<String> result = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inQuotes = false;
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (inQuotes) {
                if (c == '"') {
                    if (i + 1 < line.length() && line.charAt(i + 1) == '"') {
                        current.append('"');
                        i++;
                    } else {
                        inQuotes = false;
                    }
                } else {
                    current.append(c);
                }
            } else {
                if (c == '"') {
                    inQuotes = true;
                } else if (c == ',') {
                    result.add(current.toString());
                    current.setLength(0);
                } else {
                    current.append(c);
                }
            }
        }
        result.add(current.toString());
        return result;
    }
}
