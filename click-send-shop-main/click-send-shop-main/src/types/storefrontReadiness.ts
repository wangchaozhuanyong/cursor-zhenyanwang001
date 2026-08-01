export type StorefrontReadinessStatus = "ready" | "needs_review" | "not_ready";

export type StorefrontReadiness = {
  status: StorefrontReadinessStatus;
  checked_at: string;
  summary: {
    blocker_count: number;
    review_count: number;
    ready_check_count: number;
    total_check_count: number;
  };
  banners: {
    active_count: number;
    missing_count: number;
    items: Array<{
      id: string;
      title: string;
      missing_mobile: boolean;
      missing_desktop: boolean;
    }>;
  };
  categories: {
    visible_root_count: number;
    review_count: number;
    items: Array<{
      id: string;
      name: string;
      banner_enabled: boolean;
    }>;
  };
  navigation: {
    enabled_count: number;
    invalid_count: number;
    external_review_count: number;
    invalid_items: Array<{
      id: string;
      title: string;
      target_type: string;
    }>;
    external_items: Array<{
      id: string;
      title: string;
      link_url: string;
    }>;
  };
  products: {
    home_count: number;
    missing_count: number;
    items: Array<{
      id: string;
      name: string;
      groups: string[];
    }>;
  };
  compliance: {
    age_gate_enabled: boolean;
    minimum_age: number;
    restricted_category_count: number;
    blocker_count: number;
    items: Array<{
      id: string;
      name: string;
    }>;
  };
};
