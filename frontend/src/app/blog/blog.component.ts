import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BlogService } from '../services/blog-service';
import { SiteSettingsService } from '../services/site-settings-service';
import { BlogPost } from '../blog-post';
import { SiteSettings } from '../site-settings';
import { resolveImageUrl, trackById, DEFAULT_LOGO_URL } from '../constants';

@Component({
  selector: 'app-blog',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './blog.component.html',
  styleUrl: './blog.component.css'
})
// Public blog page: fetches every post but only shows published==true, newest first.
export class BlogComponent implements OnInit {

  posts: BlogPost[] = [];
  settings: SiteSettings | undefined;
  resolveImageUrl = resolveImageUrl;
  defaultLogoUrl = DEFAULT_LOGO_URL;
  trackById = trackById;

  constructor(
    private blogService: BlogService,
    private siteSettingsService: SiteSettingsService,
  ) {}

  ngOnInit(): void {
    this.blogService.getPosts().subscribe(data => {
      this.posts = data
        .filter(p => p.published)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    });

    this.siteSettingsService.getSettings().subscribe(settings => {
      this.settings = settings;
    });
  }
}
