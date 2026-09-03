package org.kpet.petshop.Models;

import jakarta.persistence.*;

/**
 * Join row: how many units of a given {@link Product} a specific
 * {@link Distributor} currently has. Owned exclusively by Distributor
 * (see its {@code distributorProducts} @OneToMany with orphanRemoval) — this
 * entity is never queried or saved on its own. The admin Pedidos screen flags
 * any row here with quantity < 15 as low stock (AdminOrdersComponent.loadLowStock).
 */
@Entity
@Table(name = "distributor_product_items")
public class DistributorProduct {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", unique = true, nullable = false)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false)
    private Integer quantity = 0;

    public DistributorProduct() {
    }

    public DistributorProduct(Product product, Integer quantity) {
        this.product = product;
        this.quantity = quantity != null ? quantity : 0;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Product getProduct() {
        return product;
    }

    public void setProduct(Product product) {
        this.product = product;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }
}
