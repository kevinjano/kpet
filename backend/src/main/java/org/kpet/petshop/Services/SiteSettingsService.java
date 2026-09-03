package org.kpet.petshop.Services;

import org.kpet.petshop.Models.SiteSettings;
import org.springframework.stereotype.Service;

/** Reads/writes the single SiteSettings row (store name, logo, banners, WhatsApp number, QR code, about section). */
@Service
public interface SiteSettingsService {

    SiteSettings getSettings();

    SiteSettings updateSettings(SiteSettings settings);
}
