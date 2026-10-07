package io.github.marcuslai1.smartbuy;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * The site's data file, smartbuy-frontend/public/phones.json, as written by
 * pipeline/build.py: the priced phones and the scoring presets. Phones still awaiting
 * prices are listed separately in the file and aren't ranked.
 */
public record PhoneData(List<Phone> phones, Map<String, Preset> presets) {

    public static PhoneData load(Path file) throws IOException {
        JsonNode root = new ObjectMapper().readTree(file.toFile());
        Map<String, Preset> presets = new LinkedHashMap<>();
        for (Map.Entry<String, JsonNode> e : root.path("presets").properties()) {
            presets.put(e.getKey(),
                    new Preset(e.getKey(), e.getValue().path("label").asText(), numbers(e.getValue().path("weights"))));
        }
        List<Phone> phones = new ArrayList<>();
        for (JsonNode p : root.path("phones")) {
            phones.add(new Phone(p.path("id").asText(), p.path("short_name").asText(),
                    p.path("price").path("typical_sgd").asDouble(), numbers(p.path("categories"))));
        }
        if (phones.isEmpty() || presets.isEmpty()) {
            throw new IOException(file + " has no phones or no presets");
        }
        return new PhoneData(List.copyOf(phones), Collections.unmodifiableMap(presets));
    }

    public Preset preset(String key) {
        Preset p = presets.get(key);
        if (p == null) {
            throw new IllegalArgumentException("no preset '" + key + "'; choose from " + presets.keySet());
        }
        return p;
    }

    private static Map<String, Double> numbers(JsonNode object) {
        Map<String, Double> out = new LinkedHashMap<>();
        for (Map.Entry<String, JsonNode> e : object.properties()) {
            out.put(e.getKey(), e.getValue().asDouble());
        }
        return out;
    }
}
