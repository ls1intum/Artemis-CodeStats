package fixture.quiet;

import java.util.List;

class Service {
    void work() {
        List.of("one").forEach(_ -> {});
    }
}
