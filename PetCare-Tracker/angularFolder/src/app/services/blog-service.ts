import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {BlogPost} from '../blog-post';
import {API_ORIGIN} from '../constants';

@Injectable({
  providedIn: 'root',
})
// Thin HTTP wrapper over /api/blog. getPosts() returns every post regardless of
// published status — BlogComponent (public page) filters to published==true itself.
export class BlogService {

  private apiUrl = `${API_ORIGIN}/api/blog`;

  constructor(private httpClient: HttpClient) {}

  getPosts(): Observable<BlogPost[]> {
    return this.httpClient.get<BlogPost[]>(`${this.apiUrl}/findAll`);
  }

  createPost(post: Partial<BlogPost>): Observable<BlogPost> {
    return this.httpClient.post<BlogPost>(`${this.apiUrl}/create`, post);
  }

  updatePost(id: number, post: Partial<BlogPost>): Observable<BlogPost> {
    return this.httpClient.put<BlogPost>(`${this.apiUrl}/update/${id}`, post);
  }

  deletePost(id: number): Observable<any> {
    return this.httpClient.delete(`${this.apiUrl}/delete/${id}`);
  }
}
