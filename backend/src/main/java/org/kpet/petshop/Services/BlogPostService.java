package org.kpet.petshop.Services;

import org.kpet.petshop.Models.BlogPost;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/** CRUD for blog posts ("Blog" section: events/photos the admin publishes). */
@Service
public interface BlogPostService {

    List<BlogPost> getAllPosts();

    Optional<BlogPost> getPostById(Long id);

    BlogPost savePost(BlogPost post);

    BlogPost updatePost(BlogPost post);

    void deletePost(Long id);
}
