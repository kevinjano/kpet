package org.kpet.petshop.Controllers;

import jakarta.persistence.EntityNotFoundException;
import org.kpet.petshop.Models.Distributor;
import org.kpet.petshop.Repositories.DistributorRepository;
import org.kpet.petshop.Services.DistributorService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

/** REST surface for distributors and their per-product stock. See Distributor's class comment for the overall model. */
@RestController
@RequestMapping("/api/distributors")
public class DistributorController {

    private final DistributorService distributorService;
    private final DistributorRepository distributorRepository;

    public DistributorController(DistributorService distributorService, DistributorRepository distributorRepository) {
        this.distributorService = distributorService;
        this.distributorRepository = distributorRepository;
    }

    @RequestMapping(value = "/findAll", produces = "application/json")
    public List<Distributor> getAllDistributors() {
        return distributorRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Distributor> getDistributorById(@PathVariable Long id) {
        return distributorService.getDistributorById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @RequestMapping(value = "/create", produces = "application/json", method = RequestMethod.POST)
    public ResponseEntity<Distributor> createDistributor(@RequestBody Distributor distributor) {
        Distributor saved = distributorService.saveDistributor(distributor);
        return ResponseEntity.created(URI.create("/api/distributors/" + saved.getId())).body(saved);
    }

    @RequestMapping(value = "/update/{id}", produces = "application/json", method = RequestMethod.PUT)
    public ResponseEntity<Distributor> updateDistributor(@PathVariable Long id, @RequestBody Distributor distributor) {
        distributor.setId(id);
        try {
            return ResponseEntity.ok(distributorService.updateDistributor(distributor));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @RequestMapping(value = "/delete/{id}", produces = "application/json", method = RequestMethod.DELETE)
    public ResponseEntity<Void> deleteDistributor(@PathVariable Long id) {
        try {
            distributorService.deleteDistributor(id);
            return ResponseEntity.ok().build();
        } catch (EntityNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
