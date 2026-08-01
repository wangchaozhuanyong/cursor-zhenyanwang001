export interface Banner {
  id: string;
  title: string;
  description?: string;
  cta_text?: string;
  image: string;
  image_mobile?: string;
  image_desktop?: string;
  link: string;
  sort_order: number;
  enabled: boolean;
}
