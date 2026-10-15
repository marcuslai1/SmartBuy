package io.github.marcuslai1.smartbuy.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

/**
 * The service on a hand-made data file (src/test/resources/test-phones.json), where the
 * right answers can be worked out by hand. Spec scores are weighted means:
 *
 * <pre>
 *            price  balanced (1:1)  camera (3:1)
 *   Phone A    300       5.0            4.5
 *   Phone B    500       6.0            6.0
 *   Phone C    600       5.0            5.0    B is cheaper and better, so C is never a best buy
 *   Phone D    900       7.0            8.0
 *   Phone E   1200       7.5            7.75   a best buy only on balanced: D beats it on camera
 * </pre>
 */
class CatalogServiceTest {

    static CatalogService catalog;

    @BeforeAll
    static void load() throws IOException {
        catalog = new CatalogService(new SmartBuyProperties("src/test/resources/test-phones.json"));
    }

    private static List<String> ids(List<BestBuy> buys) {
        return buys.stream().map(BestBuy::id).toList();
    }

    @Test
    void presetsComeBackInFileOrderWithTheirWeights() {
        List<PresetView> presets = catalog.presets();
        assertEquals(List.of("balanced", "camera"), presets.stream().map(PresetView::key).toList());
        assertEquals("Camera first", presets.get(1).label());
        assertEquals(Map.of("camera", 3.0, "battery", 1.0), presets.get(1).weights());
    }

    @Test
    void bestBuysAreThePhonesNothingCheaperBeats() {
        assertEquals(List.of("a", "b", "d", "e"), ids(catalog.bestBuys("balanced", null)));
        assertEquals(List.of("a", "b", "d"), ids(catalog.bestBuys("camera", null)));
    }

    @Test
    void aBestBuyCarriesItsPriceAndScore() {
        BestBuy first = catalog.bestBuys("balanced", null).get(0);
        assertEquals("Phone A", first.name());
        assertEquals(300.0, first.typicalPriceSgd());
        assertEquals(5.0, first.specScore(), 1e-9);
    }

    @Test
    void maxPriceKeepsOnlyTheBestBuysAtOrUnderIt() {
        assertEquals(List.of("a", "b"), ids(catalog.bestBuys("balanced", 899.0)));
        assertEquals(List.of("a", "b", "d"), ids(catalog.bestBuys("balanced", 900.0)));
        assertEquals(List.of(), ids(catalog.bestBuys("balanced", 200.0)));
    }

    @Test
    void anUnknownPresetIsNotFound() {
        NotFoundException e = assertThrows(NotFoundException.class, () -> catalog.bestBuys("gaming", null));
        assertEquals("No preset 'gaming'", e.getMessage());
    }

    @Test
    void phonesAreListedInFileOrder() {
        List<PhoneSummary> phones = catalog.phones();
        assertEquals(List.of("a", "b", "c", "d", "e"), phones.stream().map(PhoneSummary::id).toList());
        assertEquals(600.0, phones.get(2).typicalPriceSgd());
    }

    @Test
    void onePhoneComesWithItsCategoryScores() {
        PhoneDetail c = catalog.phone("c");
        assertEquals("Phone C", c.name());
        assertEquals(Map.of("camera", 5.0, "battery", 5.0), c.categories());
        assertEquals(List.of("camera", "battery"), List.copyOf(c.categories().keySet()), "file order");
    }

    @Test
    void anUnknownPhoneIsNotFound() {
        NotFoundException e = assertThrows(NotFoundException.class, () -> catalog.phone("zz"));
        assertEquals("No phone 'zz'", e.getMessage());
    }
}
