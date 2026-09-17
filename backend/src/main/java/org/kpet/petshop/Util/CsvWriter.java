package org.kpet.petshop.Util;

import java.util.ArrayList;
import java.util.List;

// Shared by every admin CSV export (products, orders, ...) — quotes/escapes a
// field only when it actually needs it (contains a comma, quote or newline),
// matching what Excel/Sheets themselves produce and expect on import.
public final class CsvWriter {

    private CsvWriter() {
    }

    public static String row(String... fields) {
        List<String> escaped = new ArrayList<>();
        for (String field : fields) {
            String value = field == null ? "" : field;
            if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
                value = "\"" + value.replace("\"", "\"\"") + "\"";
            }
            escaped.add(value);
        }
        return String.join(",", escaped);
    }
}
