package org.kpet.petshop.Models;

import jakarta.persistence.*;

/**
 * A catalog item. {@code stock} is the central/warehouse quantity — distinct
 * from the per-distributor quantity tracked in {@link DistributorProduct} — and
 * is what gets decremented automatically when an order is confirmed (see
 * OrderServiceImpl.deductStock). {@code onSale}/{@code salePrice} drive the
 * storefront's strike-through price display; when onSale is false, salePrice is
 * ignored everywhere it's read.
 */
@Entity
@Table(name = "products", indexes = {
        @Index(name = "idx_products_category", columnList = "category"),
        @Index(name = "idx_products_active", columnList = "active")
})
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", unique = true, nullable = false)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private Double price;

    private Double salePrice;

    @Column(nullable = false)
    private boolean onSale = false;

    @Column(nullable = false)
    private String category;

    @Column(nullable = false)
    private Integer stock = 0;

    private String imageUrl;

    @Column(nullable = false)
    private boolean active = true;

    public Product() {
    }

    public Product(Long id, String name, String description, Double price, Double salePrice, boolean onSale,
                   String category, Integer stock, String imageUrl, boolean active) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.price = price;
        this.salePrice = salePrice;
        this.onSale = onSale;
        this.category = category;
        this.stock = stock;
        this.imageUrl = imageUrl;
        this.active = active;
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

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Double getPrice() {
        return price;
    }

    public void setPrice(Double price) {
        this.price = price;
    }

    public Double getSalePrice() {
        return salePrice;
    }

    public void setSalePrice(Double salePrice) {
        this.salePrice = salePrice;
    }

    public boolean isOnSale() {
        return onSale;
    }

    public void setOnSale(boolean onSale) {
        this.onSale = onSale;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public Integer getStock() {
        return stock;
    }

    public void setStock(Integer stock) {
        this.stock = stock;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    @Override
    public String toString() {
        return "Product{" +
                "id=" + id +
                ", name='" + name + '\'' +
                ", price=" + price +
                ", salePrice=" + salePrice +
                ", onSale=" + onSale +
                ", category='" + category + '\'' +
                ", stock=" + stock +
                ", active=" + active +
                '}';
    }
}
