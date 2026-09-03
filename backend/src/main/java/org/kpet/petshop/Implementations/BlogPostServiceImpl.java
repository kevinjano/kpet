package org.kpet.petshop.Implementations;

import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import org.kpet.petshop.Models.BlogPost;
import org.kpet.petshop.Repositories.BlogPostRepository;
import org.kpet.petshop.Services.BlogPostService;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/** Straightforward CRUD — publish/unpublish is just a boolean field, no separate workflow. */
@Service
public class BlogPostServiceImpl implements BlogPostService {

    private final BlogPostRepository blogPostRepository;

    public BlogPostServiceImpl(BlogPostRepository blogPostRepository) {
        this.blogPostRepository = blogPostRepository;
    }

    @Override
    public List<BlogPost> getAllPosts() {
        return blogPostRepository.findAll();
    }

    @Override
    public Optional<BlogPost> getPostById(Long id) {
        return blogPostRepository.findById(id);
    }

    @Override
    public BlogPost savePost(BlogPost post) {
        return blogPostRepository.save(post);
    }

    @Override
    @Transactional
    public BlogPost updatePost(BlogPost updatedPost) {
        BlogPost existing = blogPostRepository.findById(updatedPost.getId())
                .orElseThrow(() -> new EntityNotFoundException("Blog post not found with ID: " + updatedPost.getId()));

        existing.setTitle(updatedPost.getTitle());
        existing.setContent(updatedPost.getContent());
        existing.setImageUrl(updatedPost.getImageUrl());
        existing.setEventDate(updatedPost.getEventDate());
        existing.setPublished(updatedPost.isPublished());

        return blogPostRepository.save(existing);
    }

    @Override
    @Transactional
    public void deletePost(Long id) {
        if (!blogPostRepository.existsById(id)) {
            throw new EntityNotFoundException("Blog post not found with id: " + id);
        }
        blogPostRepository.deleteById(id);
    }
}
