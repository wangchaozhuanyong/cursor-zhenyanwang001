export interface Category {
  id: string;
  name: string;
  icon: string;
  sort_order?: number;
  parent_id?: string;
  is_active?: boolean;
}
