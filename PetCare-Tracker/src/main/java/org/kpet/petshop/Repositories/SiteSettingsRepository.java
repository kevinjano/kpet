package org.kpet.petshop.Repositories;

import org.kpet.petshop.Models.SiteSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

// SiteSettings is a singleton row (fixed id, see SiteSettingsServiceImpl.SINGLETON_ID);
// plain JpaRepository CRUD is all that's needed to read/replace that one row.
@Repository
public interface SiteSettingsRepository extends JpaRepository<SiteSettings, Long> {
}
