package fixture.beta;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/alpha")
public class Resource {
    @GetMapping("/all")
    public Object overlap() { return null; }
}
