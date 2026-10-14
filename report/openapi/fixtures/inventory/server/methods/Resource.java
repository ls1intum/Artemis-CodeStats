package fixture.methods;
import org.springframework.web.bind.annotation.*;

interface Constants { String PATH = "/api/methods"; }

@RestController
@RequestMapping(path = Constants.PATH, method = RequestMethod.POST)
public class Resource {
    @GetMapping
    public void combined() {}
}
