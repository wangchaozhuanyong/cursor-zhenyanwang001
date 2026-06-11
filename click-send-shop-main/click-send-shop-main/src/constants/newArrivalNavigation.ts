export const NEW_ARRIVAL_CATEGORY_LABEL = "新品";
export const NEW_ARRIVAL_CATEGORY_SEARCH = "is_new=1&home_new_arrivals_rule=1";
export const NEW_ARRIVAL_CATEGORY_CANONICAL_SEARCH = "is_new=1";
export const NEW_ARRIVAL_CATEGORY_PATH = `/categories?${NEW_ARRIVAL_CATEGORY_SEARCH}`;

export function isNewArrivalCategoryParams(searchParams: URLSearchParams): boolean {
  return searchParams.get("is_new") === "1";
}
