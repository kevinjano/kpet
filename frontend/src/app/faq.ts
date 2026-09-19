// Mirrors the backend Faq entity 1:1.
export interface Faq {
  id: number;
  question: string;
  answer: string;
  published: boolean;
  position: number;
  createdAt: string;
}
