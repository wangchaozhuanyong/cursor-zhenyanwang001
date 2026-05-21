const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

let cachedAdminCsrfToken = "";
let inflightAdminCsrfToken: Promise<string> | null = null;

export function setAdminCsrfToken(token: string | undefined | null): void {
  cachedAdminCsrfToken = String(token || "");
}

export function clearAdminCsrfToken(): void {
  cachedAdminCsrfToken = "";
  inflightAdminCsrfToken = null;
}

export async function getAdminCsrfToken(): Promise<string> {
  if (cachedAdminCsrfToken) return cachedAdminCsrfToken;
  if (!inflightAdminCsrfToken) {
    inflightAdminCsrfToken = fetch(`${BASE_URL}/admin/auth/csrf`, {
      method: "GET",
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch admin CSRF token");
        const body = (await res.json()) as { data?: { csrfToken?: string } };
        const token = body.data?.csrfToken || "";
        setAdminCsrfToken(token);
        return token;
      })
      .finally(() => {
        inflightAdminCsrfToken = null;
      });
  }
  return inflightAdminCsrfToken;
}
