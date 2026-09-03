package org.kpet.petshop.Models;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.persistence.*;

import java.util.ArrayList;
import java.util.List;

/**
 * A third-party reseller who carries a subset of the catalog with their own
 * stock counts (see {@link DistributorProduct}) and their own WhatsApp number.
 * Customers buy from a distributor via a direct WhatsApp message
 * (DistributorDetailComponent.contactOnWhatsapp) — there's no cart, no order
 * record, and no automatic stock deduction for those sales; the distributor's
 * quantities are maintained manually by the admin from this entity's form.
 */
@Entity
@Table(name = "distributors", indexes = {
        @Index(name = "idx_distributors_city", columnList = "city"),
        @Index(name = "idx_distributors_active", columnList = "active")
})
public class Distributor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", unique = true, nullable = false)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String city;

    private String address;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String phone;

    // Distinct from `phone` since a distributor's WhatsApp Business line can differ
    // from its public phone number; this is what customer orders get sent to.
    private String whatsappNumber;

    private String imageUrl;

    // Optional link to Google Maps (or any map service) for "Ver en el mapa"
    private String mapUrl;

    @Column(nullable = false)
    private boolean active = true;

    // Which products this distributor carries, and how many units of each it has.
    // Owned unidirectionally from Distributor — no back-reference needed on Product.
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JoinColumn(name = "distributor_id")
    private List<DistributorProduct> distributorProducts = new ArrayList<>();

    // Write-only convenience field: the frontend sends {productId, quantity} pairs;
    // the service resolves each productId into a managed Product reference.
    @Transient
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private List<DistributorProductInput> productQuantities;

    public Distributor() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getWhatsappNumber() {
        return whatsappNumber;
    }

    public void setWhatsappNumber(String whatsappNumber) {
        this.whatsappNumber = whatsappNumber;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public String getMapUrl() {
        return mapUrl;
    }

    public void setMapUrl(String mapUrl) {
        this.mapUrl = mapUrl;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public List<DistributorProduct> getDistributorProducts() {
        return distributorProducts;
    }

    public void setDistributorProducts(List<DistributorProduct> distributorProducts) {
        this.distributorProducts = distributorProducts != null ? distributorProducts : new ArrayList<>();
    }

    public List<DistributorProductInput> getProductQuantities() {
        return productQuantities;
    }

    public void setProductQuantities(List<DistributorProductInput> productQuantities) {
        this.productQuantities = productQuantities;
    }
}
