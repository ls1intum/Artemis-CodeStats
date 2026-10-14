package fixture.inherited;
import org.springframework.web.bind.annotation.*;

class Parent {
    @GetMapping("/inherited")
    public Object parent() { return null; }
}
@RequestMapping("/custom")
@interface CustomMapping {}

@RestController
class Resource extends Parent {
    @CustomMapping
    public Object custom() { return null; }
}
