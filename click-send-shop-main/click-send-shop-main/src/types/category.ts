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
  sort_order?: number;
  parent_id?: string | null;
  is_active?: boolean;
  is_visible?: boolean;
  productCount?: number;
  children?: Category[];
}
