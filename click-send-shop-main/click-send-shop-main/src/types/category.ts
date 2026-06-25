export interface CategoryFaq {
  question: string;
  answer: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  buying_guide?: string;
  faq?: CategoryFaq[];
  seo_title?: string;
  seo_description?: string;
  icon?: string;
  icon_url?: string;
  banner_image_url?: string;
  banner_title?: string;
  banner_subtitle?: string;
  banner_link?: string;
  banner_enabled?: boolean;
  sort_order?: number;
  parent_id?: string | null;
  is_active?: boolean;
  is_visible?: boolean;
  productCount?: number;
  children?: Category[];
}
