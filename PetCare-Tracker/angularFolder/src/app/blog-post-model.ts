// Currently unused — admin-blog.component works with plain BlogPost objects/form
// values directly, never constructs this class.
import {BlogPost} from "./blog-post";

export class BlogPostModel implements BlogPost {
  constructor(
    public id: number,
    public title: string,
    public content: string,
    public imageUrl: string | null,
    public eventDate: string | null,
    public published: boolean,
    public createdAt: string,
  ) {}
}
