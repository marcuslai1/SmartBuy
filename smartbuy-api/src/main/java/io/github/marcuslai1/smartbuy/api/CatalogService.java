package io.github.marcuslai1.smartbuy.api;

import io.github.marcuslai1.smartbuy.Phone;
import io.github.marcuslai1.smartbuy.PhoneData;
import io.github.marcuslai1.smartbuy.Preset;
import io.github.marcuslai1.smartbuy.Ranking;
import java.io.IOException;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

/**
 * Loads the data file once at startup and ranks every preset straight away. The file only
 * changes when the pipeline rebuilds it, so each request is a lookup, not a recalculation.
 * The ranking itself is the smartbuy-ranking library; this class only reshapes its results.
 */
@Service
public class CatalogService {

    private final PhoneData data;
    private final Map<String, Phone> phonesById = new LinkedHashMap<>();
    private final Map<String, List<BestBuy>> ladders = new LinkedHashMap<>();

    public CatalogService(SmartBuyProperties properties) throws IOException {
        this.data = PhoneData.load(Path.of(properties.dataFile()));
        for (Phone p : data.phones()) {
            phonesById.put(p.id(), p);
        }
        for (Preset preset : data.presets().values()) {
            List<BestBuy> ladder = Ranking.of(data.phones(), preset).ladder().stream()
                    .map(r -> new BestBuy(r.phone().id(), r.phone().shortName(), r.phone().typicalPrice(),
                            r.spec(), r.value()))
                    .toList();
            ladders.put(preset.key(), ladder);
        }
    }

    public List<PresetView> presets() {
        return data.presets().values().stream()
                .map(p -> new PresetView(p.key(), p.label(), p.weights()))
                .toList();
    }

    /** The preset's best buys, cheapest first; with maxPrice, only those at or under it. */
    public List<BestBuy> bestBuys(String presetKey, Double maxPrice) {
        List<BestBuy> ladder = ladders.get(presetKey);
        if (ladder == null) {
            throw new NotFoundException("preset", presetKey);
        }
        if (maxPrice == null) {
            return ladder;
        }
        return ladder.stream().filter(b -> b.typicalPriceSgd() <= maxPrice).toList();
    }

    public List<PhoneSummary> phones() {
        return data.phones().stream()
                .map(p -> new PhoneSummary(p.id(), p.shortName(), p.typicalPrice()))
                .toList();
    }

    public PhoneDetail phone(String id) {
        Phone p = phonesById.get(id);
        if (p == null) {
            throw new NotFoundException("phone", id);
        }
        return new PhoneDetail(p.id(), p.shortName(), p.typicalPrice(), p.categories());
    }
}
