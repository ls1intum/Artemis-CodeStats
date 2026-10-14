package fixture.meta;
import org.springframework.web.bind.annotation.*;

@RequestMapping(path = "/api/meta", method = RequestMethod.GET)
@interface DirectRoute {}

@DirectRoute
@interface IndirectRoute {}

@RestController
class Resource {
    @IndirectRoute
    public Object read() { return null; }
}
