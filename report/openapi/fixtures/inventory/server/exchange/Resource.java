package fixture.exchange;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.service.annotation.*;

@RestController
class Resource {
    @GetExchange("/api/exchange")
    public Object read() { return null; }
}

@HttpExchange("/api/inherited-exchange")
interface Contract {
    @PostExchange
    Object write();
}

@RestController
class Implementation implements Contract {
    public Object write() { return null; }
}
