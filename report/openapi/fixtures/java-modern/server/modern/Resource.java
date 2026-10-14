package fixture.modern;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
class Resource {
    record Entry(String name, int count) {}

    @GetMapping("/api/modern")
    String read(Object input) {
        var _ = List.of("ignored");
        List.of("one").forEach(_ -> {});
        try {
            return switch (input) {
                case Entry(var name, _) -> name;
                default -> "other";
            };
        } catch (RuntimeException _) {
            return "failed";
        }
    }
}
