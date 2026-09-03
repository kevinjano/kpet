package org.kpet.petshop.Repositories;

import org.kpet.petshop.Models.BlogPost;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

// Plain CRUD; the public blog page filters to published==true and sorts by date
// client-side (see BlogComponent) rather than via a derived query method here.
@Repository
public interface BlogPostRepository extends JpaRepository<BlogPost, Long> {
}
