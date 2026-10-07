package io.github.marcuslai1.smartbuy;

import java.io.IOException;
import java.nio.file.Path;
import java.util.Locale;

/**
 * Prints one preset's best buys, cheapest first.
 *
 * <pre>
 * mvn -q compile exec:java                                    balanced, the site's data file
 * mvn -q compile exec:java -Dexec.args="camera"
 * mvn -q compile exec:java -Dexec.args="camera path/to/phones.json"
 * </pre>
 */
public final class Main {

    static final Path SITE_DATA = Path.of("..", "smartbuy-frontend", "public", "phones.json");

    private Main() {
    }

    public static void main(String[] args) throws IOException {
        String key = args.length > 0 ? args[0] : "balanced";
        Path file = args.length > 1 ? Path.of(args[1]) : SITE_DATA;
        PhoneData data = PhoneData.load(file);
        Ranking ranking = Ranking.of(data.phones(), data.preset(key));

        ValueCurve c = ranking.curve();
        System.out.printf(Locale.ROOT, "%s: %d phones ranked; typical score = %.2f %+.2f*x %+.3f*x^2 (x = ln price)%n",
                ranking.preset().label(), ranking.rows().size(), c.a(), c.b(), c.c());
        System.out.println("Best buys, cheapest first:");
        for (Ranking.Row r : ranking.ladder()) {
            System.out.printf(Locale.ROOT, "  S$%5.0f  %-30s score %.2f  %+.2f vs typical%n",
                    r.phone().typicalPrice(), r.phone().shortName(), r.spec(), r.value());
        }
    }
}
