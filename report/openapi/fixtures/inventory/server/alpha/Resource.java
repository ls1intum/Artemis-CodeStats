package fixture.alpha;

import static fixture.constants.Paths.ROOT;
import static fixture.constants.Paths.CORE;
import fixture.constants.Paths;
import org.springframework.web.bind.annotation.*;
import org.springframework.context.annotation.*;

@RestController
@Profile(CORE)
@Conditional(FeatureEnabled.class)
@RequestMapping(path = { ROOT + "/alpha", "/api/alias" }, produces = "application/json")
public class Resource {
    @GetMapping(value = { "/{id}", "/all" }, params = "view=full")
    public Object read() { return null; }

    @RequestMapping(path = Paths.WRITE, method = { RequestMethod.PUT, RequestMethod.POST }, headers = "X-Mode=write")
    public Object write() { return null; }

    @GetMapping("/all")
    public Object variant() { return null; }
}
