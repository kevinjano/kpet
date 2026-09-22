// Mirrors the backend BlogPost entity 1:1.
export interface BlogPost {
  id: number;
  title: string;
  content: string;
  imageUrl: string | null;
  videoUrl: string | null;
  externalUrl: string | null;
  eventDate: string | null;
  published: boolean;
  createdAt: string;
}
