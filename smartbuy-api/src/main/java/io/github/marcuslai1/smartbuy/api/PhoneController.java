package io.github.marcuslai1.smartbuy.api;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * GET /api/phones         every ranked phone
 * GET /api/phones/{id}    one phone with its category scores
 */
@RestController
@RequestMapping("/api/phones")
public class PhoneController {

    private final CatalogService catalog;

    public PhoneController(CatalogService catalog) {
        this.catalog = catalog;
    }

    @GetMapping
    public List<PhoneSummary> phones() {
        return catalog.phones();
    }

    @GetMapping("/{id}")
    public PhoneDetail phone(@PathVariable String id) {
        return catalog.phone(id);
    }
}
