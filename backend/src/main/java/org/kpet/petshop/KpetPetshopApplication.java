package org.kpet.petshop;

import org.apache.log4j.BasicConfigurator;
import org.kpet.petshop.Models.Product;
import org.kpet.petshop.Models.SiteSettings;
import org.kpet.petshop.Models.User;
import org.kpet.petshop.Repositories.ProductRepository;
import org.kpet.petshop.Repositories.SiteSettingsRepository;
import org.kpet.petshop.Services.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;

import java.util.ArrayList;

@SpringBootApplication
@EnableConfigurationProperties
@EntityScan(basePackages = {"org.kpet.petshop.Models"})
public class KpetPetshopApplication {

    public static void main(String[] args) {
        BasicConfigurator.configure();
        SpringApplication.run(KpetPetshopApplication.class, args);
    }

    /**
     * Seeds demo data on first boot only. Every block below is guarded by an
     * existence check, which matters because {@code spring.jpa.hibernate.ddl-auto}
     * is {@code update} (not {@code create-drop}) — the schema persists across
     * restarts, so without these guards every restart would re-insert duplicate
     * demo users/products or clobber whatever the admin has since configured.
     */
    @Bean
    CommandLineRunner initData(UserService userService, ProductRepository productRepository,
                                SiteSettingsRepository siteSettingsRepository) {
        return args -> {

            // Demo users — only created the very first time (won't duplicate or fail on restart
            // now that the schema persists instead of being recreated on every startup).
            // SECURITY: admin123/cliente123 are public (they're in this file). Before your
            // FIRST deploy to a real production database, log in as admin@kpet.com and change
            // its password from Mi Perfil/admin, or delete the account — otherwise anyone who
            // reads this repo can log in as Admin on your live site.
            if (userService.getUserByEmail("admin@kpet.com").isEmpty()) {
                userService.saveUser(new User(null, "Admin", "Kpet", "admin@kpet.com", "514-000-0000", "admin123", "Admin"));
            }
            if (userService.getUserByEmail("cliente@kpet.com").isEmpty()) {
                userService.saveUser(new User(null, "Juan", "Perez", "cliente@kpet.com", "514-111-1111", "cliente123", "Client"));
            }

            // Site settings — only seeded if the row doesn't exist yet, so any changes the admin
            // makes from Configuración (logo, banners, WhatsApp number) are never overwritten
            if (siteSettingsRepository.findById(1L).isEmpty()) {
                siteSettingsRepository.save(new SiteSettings(1L, "Kpet", "/assets/images/kpet-logo.png", new ArrayList<>(), "15145551234"));
            }

            // Demo catalog — only seeded when the catalog is completely empty (fresh install).
            // Once the admin adds real products, this block never runs again.
            if (productRepository.count() == 0) {
                productRepository.save(new Product(null, "Alimento Perro Adulto 15kg",
                        "Alimento balanceado para perros adultos de razas medianas y grandes.",
                        45.00, null, false, "Perros", 20, null, true));

                productRepository.save(new Product(null, "Alimento Gato Adulto 10kg",
                        "Alimento completo para gatos adultos, con salmón y arroz.",
                        38.00, null, false, "Gatos", 15, null, true));

                productRepository.save(new Product(null, "Snacks Dentales para Perros",
                        "Premios dentales que ayudan a reducir el sarro y refrescan el aliento.",
                        8.50, 6.50, true, "Perros", 40, null, true));

                productRepository.save(new Product(null, "Arena Sanitaria Aglomerante 10kg",
                        "Arena de rápida absorción y control de olores para gatos.",
                        18.00, null, false, "Novedades", 25, null, true));

                productRepository.save(new Product(null, "Cama Acolchada para Mascotas",
                        "Cama suave y lavable, disponible para perros y gatos pequeños/medianos.",
                        25.00, 19.90, true, "Novedades", 10, null, true));
            }
        };
    }
}
