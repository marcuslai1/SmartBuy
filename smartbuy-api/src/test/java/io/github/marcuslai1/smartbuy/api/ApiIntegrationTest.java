package io.github.marcuslai1.smartbuy.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import io.github.marcuslai1.smartbuy.PhoneData;
import io.github.marcuslai1.smartbuy.Preset;
import io.github.marcuslai1.smartbuy.Ranking;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

/**
 * The whole app started on the site's real data file. For every preset, the API's best
 * buys must be the same phones, in the same order and with the same price, score and
 * vs-typical figures, as the ranking library gives directly.
 */
@SpringBootTest
@AutoConfigureMockMvc
class ApiIntegrationTest {

    static final Path SITE_DATA = Path.of("..", "smartbuy-frontend", "public", "phones.json");

    @Autowired
    MockMvc mvc;

    @Test
    void everyPresetsBestBuysMatchTheRankingLibrary() throws Exception {
        PhoneData data = PhoneData.load(SITE_DATA);
        for (Preset preset : data.presets().values()) {
            List<Ranking.Row> expected = Ranking.of(data.phones(), preset).ladder();

            String body = mvc.perform(get("/api/presets/{key}/best-buys", preset.key()))
                    .andExpect(status().isOk())
                    .andReturn().getResponse().getContentAsString();
            List<String> ids = JsonPath.read(body, "$[*].id");
            assertEquals(expected.stream().map(row -> row.phone().id()).toList(), ids, preset.key());
            for (int i = 0; i < expected.size(); i++) {
                Ranking.Row row = expected.get(i);
                String at = preset.key() + " " + row.phone().id();
                assertEquals(row.phone().typicalPrice(), number(body, "$[" + i + "].typicalPriceSgd"), 1e-9, at);
                assertEquals(row.spec(), number(body, "$[" + i + "].specScore"), 1e-9, at);
                assertEquals(row.value(), number(body, "$[" + i + "].vsTypical"), 1e-9, at);
            }
        }
    }

    private static double number(String json, String path) {
        return JsonPath.<Number>read(json, path).doubleValue();
    }

    @Test
    void reportsHealthy() throws Exception {
        mvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }
}
