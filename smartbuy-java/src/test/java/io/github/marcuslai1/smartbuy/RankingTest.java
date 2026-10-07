package io.github.marcuslai1.smartbuy;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class RankingTest {

    private static Phone phone(String id, double price, double camera, double battery) {
        return new Phone(id, id, price, Map.of("camera", camera, "battery", battery));
    }

    @Test
    void specScoreIsTheWeightedMean() {
        Preset cameraFirst = new Preset("camera", "Camera", Map.of("camera", 3.0, "battery", 1.0));
        assertEquals(7.0, cameraFirst.specScore(Map.of("camera", 8.0, "battery", 4.0)), 1e-12);
    }

    @Test
    void aMissingCategoryIsAnError() {
        Preset p = new Preset("p", "P", Map.of("camera", 1.0, "battery", 1.0));
        assertThrows(IllegalArgumentException.class, () -> p.specScore(Map.of("camera", 8.0)));
    }

    @Test
    void scoresEveryPhoneAndListsTheBestBuysCheapestFirst() {
        Preset even = new Preset("even", "Even", Map.of("camera", 1.0, "battery", 1.0));
        List<Phone> phones = List.of(
                phone("flagship", 1500, 9, 8),   // 8.5
                phone("budget", 300, 5, 6),      // 5.5
                phone("overpriced", 1200, 6, 6), // 6.0, beaten by the cheaper midrange
                phone("midrange", 700, 7, 8));   // 7.5
        Ranking r = Ranking.of(phones, even);

        assertEquals(List.of("flagship", "budget", "overpriced", "midrange"),
                r.rows().stream().map(row -> row.phone().id()).toList());
        assertEquals(List.of("budget", "midrange", "flagship"),
                r.ladder().stream().map(row -> row.phone().id()).toList());
        for (Ranking.Row row : r.rows()) {
            assertEquals(r.curve().expected(row.phone().typicalPrice()), row.expected(), 1e-12);
            assertEquals(row.spec() - row.expected(), row.value(), 1e-12);
        }
        assertEquals(6.0, r.rows().get(2).spec(), 1e-12);
    }

    @Test
    void aPhoneWithoutAPriceIsRejected() {
        assertThrows(IllegalArgumentException.class, () -> phone("unpriced", 0, 5, 5));
    }
}
