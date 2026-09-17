package org.kpet.petshop.Util;

import java.util.ArrayList;
import java.util.List;

// Shared by every admin CSV export (products, orders, ...) — quotes/escapes a
// field only when it actually needs it (contains the delimiter, a quote or a
// newline), matching what Excel/Sheets themselves produce and expect on import.
public final class CsvWriter {

    private CsvWriter() {
    }

    // Comma-delimited — used where the file is also re-imported (products),
    // so the delimiter can't change without breaking that round trip.
    public static String row(String... fields) {
        return row(',', fields);
    }

    // Semicolon-delimited — Excel set to a Spanish locale (comma as the
    // decimal separator) treats ';' as its CSV list separator, not ',';
    // opening a comma-delimited file there dumps every value into column A
    // instead of splitting it into cells. Export-only files (no re-import)
    // use this instead.
    public static String row(char delimiter, String... fields) {
        List<String> escaped = new ArrayList<>();
        for (String field : fields) {
            String value = field == null ? "" : field;
            if (value.indexOf(delimiter) >= 0 || value.contains("\"") || value.contains("\n")) {
                value = "\"" + value.replace("\"", "\"\"") + "\"";
            }
            escaped.add(value);
        }
        return String.join(String.valueOf(delimiter), escaped);
    }
}
