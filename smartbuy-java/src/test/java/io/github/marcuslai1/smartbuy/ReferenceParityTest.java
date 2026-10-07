package io.github.marcuslai1.smartbuy;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

/**
 * The Java ranking must reproduce the reference scores pipeline/build.py writes into
 * phones.json, for every preset: the same check smartbuy-frontend/src/lib/engine.test.js
 * runs on the browser engine. CI runs it right after the pipeline rebuilds the file.
 */
class ReferenceParityTest {

    private static JsonNode root;
    private static PhoneData data;

    @BeforeAll
    static void load() throws IOException {
        root = new ObjectMapper().readTree(Main.SITE_DATA.toFile());
        data = PhoneData.load(Main.SITE_DATA);
    }

    static Stream<String> presets() {
        return data.presets().keySet().stream();
    }

    @ParameterizedTest
    @MethodSource("presets")
    void reproducesThePipelineScoresAndBestBuys(String key) {
        Ranking ranking = Ranking.of(data.phones(), data.preset(key));
        Map<String, JsonNode> reference = new HashMap<>();
        for (JsonNode p : root.path("phones")) {
            reference.put(p.path("id").asText(), p.path("scores").path(key));
        }
        for (Ranking.Row row : ranking.rows()) {
            JsonNode ref = reference.get(row.phone().id());
            String who = key + " " + row.phone().id();
            assertEquals(ref.path("spec").asDouble(), row.spec(), 1e-4, who + " spec");
            assertEquals(ref.path("expected").asDouble(), row.expected(), 1e-3, who + " expected");
            assertEquals(ref.path("best_buy").asBoolean(), row.bestBuy(), who + " best buy");
        }
        // The pipeline rounds the curve's coefficients to 4 places
        JsonNode model = root.path("value_models").path(key);
        assertEquals(model.path("a").asDouble(), ranking.curve().a(), 1e-4, key + " a");
        assertEquals(model.path("b").asDouble(), ranking.curve().b(), 1e-4, key + " b");
        assertEquals(model.path("c").asDouble(), ranking.curve().c(), 1e-4, key + " c");
    }

    @Test
    void ranksEveryPricedPhone() {
        assertEquals(root.path("phones").size(), data.phones().size());
        assertFalse(Ranking.of(data.phones(), data.preset("balanced")).ladder().isEmpty());
    }
}
