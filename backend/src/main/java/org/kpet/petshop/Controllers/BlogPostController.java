package org.kpet.petshop.Controllers;

import jakarta.persistence.EntityNotFoundException;
import org.kpet.petshop.Models.BlogPost;
import org.kpet.petshop.Repositories.BlogPostRepository;
import org.kpet.petshop.Services.BlogPostService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

/** REST surface for blog posts. getAllPosts() returns every post regardless of published status — filtering to published-only happens client-side in BlogComponent. */
@RestController
@RequestMapping("/api/blog")
public class BlogPostController {

    private final BlogPostService blogPostService;
    private final BlogPostRepository blogPostRepository;

    public BlogPostController(BlogPostService blogPostService, BlogPostRepository blogPostRepository) {
        this.blogPostService = blogPostService;
        this.blogPostRepository = blogPostRepository;
    }

    @RequestMapping(value = "/findAll", produces = "application/json")
    public List<BlogPost> getAllPosts() {
        return blogPostRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<BlogPost> getPostById(@PathVariable Long id) {
        return blogPostService.getPostById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @RequestMapping(value = "/create", produces = "application/json", method = RequestMethod.POST)
    public ResponseEntity<BlogPost> createPost(@RequestBody BlogPost post) {
        BlogPost saved = blogPostService.savePost(post);
        return ResponseEntity.created(URI.create("/api/blog/" + saved.getId())).body(saved);
    }

    @RequestMapping(value = "/update/{id}", produces = "application/json", method = RequestMethod.PUT)
    public ResponseEntity<BlogPost> updatePost(@PathVariable Long id, @RequestBody BlogPost post) {
        post.setId(id);
        try {
            return ResponseEntity.ok(blogPostService.updatePost(post));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @RequestMapping(value = "/delete/{id}", produces = "application/json", method = RequestMethod.DELETE)
    public ResponseEntity<Void> deletePost(@PathVariable Long id) {
        try {
            blogPostService.deletePost(id);
            return ResponseEntity.ok().build();
        } catch (EntityNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
