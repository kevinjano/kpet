package org.kpet.petshop.Implementations;

import org.kpet.petshop.Models.SiteSettings;
import org.kpet.petshop.Repositories.SiteSettingsRepository;
import org.kpet.petshop.Services.SiteSettingsService;
import org.springframework.stereotype.Service;

import java.util.ArrayList;

/** Lazily creates the one settings row with sensible defaults on first read if it doesn't exist yet. */
@Service
public class SiteSettingsServiceImpl implements SiteSettingsService {

    // Fixed id for the single settings row this whole app reads/writes — never treated as a list.
    private static final Long SINGLETON_ID = 1L;

    private final SiteSettingsRepository siteSettingsRepository;

    public SiteSettingsServiceImpl(SiteSettingsRepository siteSettingsRepository) {
        this.siteSettingsRepository = siteSettingsRepository;
    }

    @Override
    public SiteSettings getSettings() {
        return siteSettingsRepository.findById(SINGLETON_ID)
                .orElseGet(() -> {
                    SiteSettings defaults = new SiteSettings(SINGLETON_ID, "Kpet", null, new ArrayList<>(), "");
                    return siteSettingsRepository.save(defaults);
                });
    }

    @Override
    public SiteSettings updateSettings(SiteSettings settings) {
        // Force the singleton id regardless of what the client sent, so this can never
        // accidentally create a second settings row or overwrite an unrelated one.
        settings.setId(SINGLETON_ID);
        return siteSettingsRepository.save(settings);
    }
}
