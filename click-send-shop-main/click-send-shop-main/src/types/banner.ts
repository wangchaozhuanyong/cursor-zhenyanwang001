export interface Banner {
  id: string;
  title: string;
  description?: string;
  cta_text?: string;
  image: string;
  link: string;
  sort_order: number;
  enabled: boolean;
}
