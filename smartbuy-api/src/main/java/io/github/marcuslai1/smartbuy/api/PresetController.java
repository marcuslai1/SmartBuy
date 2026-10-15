package io.github.marcuslai1.smartbuy.api;

import jakarta.validation.constraints.Positive;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * GET /api/presets                                 the scoring presets
 * GET /api/presets/{key}/best-buys?maxPrice=800    a preset's best buys, cheapest first
 */
@RestController
@RequestMapping("/api/presets")
public class PresetController {

    private final CatalogService catalog;

    public PresetController(CatalogService catalog) {
        this.catalog = catalog;
    }

    @GetMapping
    public List<PresetView> presets() {
        return catalog.presets();
    }

    @GetMapping("/{key}/best-buys")
    public List<BestBuy> bestBuys(@PathVariable String key,
                                  @RequestParam(required = false) @Positive Double maxPrice) {
        return catalog.bestBuys(key, maxPrice);
    }
}
