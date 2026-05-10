export interface Category {
  id: string;
  name: string;
  icon?: string;
  icon_url?: string;
  sort_order?: number;
  parent_id?: string | null;
  is_active?: boolean;
  is_visible?: boolean;
  productCount?: number;
  children?: Category[];
}
