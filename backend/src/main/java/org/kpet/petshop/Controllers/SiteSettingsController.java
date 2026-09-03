package org.kpet.petshop.Controllers;

import org.kpet.petshop.Models.SiteSettings;
import org.kpet.petshop.Services.SiteSettingsService;
import org.springframework.web.bind.annotation.*;

/** Two endpoints only: read and replace the single SiteSettings row. */
@RestController
@RequestMapping("/api/settings")
public class SiteSettingsController {

    private final SiteSettingsService siteSettingsService;

    public SiteSettingsController(SiteSettingsService siteSettingsService) {
        this.siteSettingsService = siteSettingsService;
    }

    @GetMapping
    public SiteSettings getSettings() {
        return siteSettingsService.getSettings();
    }

    @RequestMapping(value = "/update", produces = "application/json", method = RequestMethod.PUT)
    public SiteSettings updateSettings(@RequestBody SiteSettings settings) {
        return siteSettingsService.updateSettings(settings);
    }
}
