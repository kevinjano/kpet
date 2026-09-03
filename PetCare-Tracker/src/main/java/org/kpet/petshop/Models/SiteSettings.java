package org.kpet.petshop.Models;

import jakarta.persistence.*;

import java.util.ArrayList;
import java.util.List;

/**
 * Store-wide configuration, edited from the admin Configuración screen.
 * Always exactly one row: {@code id} is fixed to SiteSettingsServiceImpl.SINGLETON_ID
 * (not auto-generated), so there is no "which settings row" ambiguity anywhere
 * that reads it.
 */
@Entity
@Table(name = "site_settings")
public class SiteSettings {

    @Id
    private Long id;

    @Column(nullable = false)
    private String storeName;

    private String logoUrl;

    // Ordered list of homepage carousel image URLs; @OrderColumn persists the
    // display order so re-fetching preserves it instead of relying on insertion order.
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "site_settings_banners", joinColumns = @JoinColumn(name = "site_settings_id"))
    @Column(name = "banner_url")
    @OrderColumn(name = "position")
    private List<String> bannerUrls = new ArrayList<>();

    // The store's own WhatsApp number, used by the central checkout flow (cart ->
    // wa.me link + QR payment). Distinct from each Distributor's own whatsappNumber.
    @Column(nullable = false)
    private String whatsappNumber;

    @Column(columnDefinition = "TEXT")
    private String aboutText;

    private String instagramUrl;

    private String tiktokUrl;

    private String youtubeUrl;

    private String contactEmail;

    // Payment QR shown to the customer after checkout (cart's "payment" step),
    // right before they confirm they sent the receipt over WhatsApp.
    private String qrCodeUrl;

    public SiteSettings() {
    }

    public SiteSettings(Long id, String storeName, String logoUrl, List<String> bannerUrls, String whatsappNumber) {
        this.id = id;
        this.storeName = storeName;
        this.logoUrl = logoUrl;
        this.bannerUrls = bannerUrls != null ? bannerUrls : new ArrayList<>();
        this.whatsappNumber = whatsappNumber;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getStoreName() {
        return storeName;
    }

    public void setStoreName(String storeName) {
        this.storeName = storeName;
    }

    public String getLogoUrl() {
        return logoUrl;
    }

    public void setLogoUrl(String logoUrl) {
        this.logoUrl = logoUrl;
    }

    public List<String> getBannerUrls() {
        return bannerUrls;
    }

    public void setBannerUrls(List<String> bannerUrls) {
        this.bannerUrls = bannerUrls != null ? bannerUrls : new ArrayList<>();
    }

    public String getWhatsappNumber() {
        return whatsappNumber;
    }

    public void setWhatsappNumber(String whatsappNumber) {
        this.whatsappNumber = whatsappNumber;
    }

    public String getAboutText() {
        return aboutText;
    }

    public void setAboutText(String aboutText) {
        this.aboutText = aboutText;
    }

    public String getInstagramUrl() {
        return instagramUrl;
    }

    public void setInstagramUrl(String instagramUrl) {
        this.instagramUrl = instagramUrl;
    }

    public String getTiktokUrl() {
        return tiktokUrl;
    }

    public void setTiktokUrl(String tiktokUrl) {
        this.tiktokUrl = tiktokUrl;
    }

    public String getYoutubeUrl() {
        return youtubeUrl;
    }

    public void setYoutubeUrl(String youtubeUrl) {
        this.youtubeUrl = youtubeUrl;
    }

    public String getContactEmail() {
        return contactEmail;
    }

    public void setContactEmail(String contactEmail) {
        this.contactEmail = contactEmail;
    }

    public String getQrCodeUrl() {
        return qrCodeUrl;
    }

    public void setQrCodeUrl(String qrCodeUrl) {
        this.qrCodeUrl = qrCodeUrl;
    }
}
