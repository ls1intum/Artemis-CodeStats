package fixture.unsupported;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/unsupported")
public class Resource {
    @GetMapping(UNKNOWN)
    public Object unresolved() { return null; }
    @GetMapping("/${prefix}/dynamic")
    public Object dynamic() { return null; }
    @GetMapping("/{login:[a-z]+}")
    public Object constrained() { return null; }
    @RequestMapping("/any-method")
    public Object unconstrained() { return null; }
    public RouterFunction<?> programmatic() { return null; }
}
