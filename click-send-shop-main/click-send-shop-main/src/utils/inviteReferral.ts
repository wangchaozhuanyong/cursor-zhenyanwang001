const REF_INVITE_CODE_KEY = "ref_invite_code_locked";

function normalizeInviteCode(value: string | null | undefined): string {
  return String(value || "").trim().toUpperCase();
}

export function extractInviteCodeFromSearch(search: string): string {
  const params = new URLSearchParams(search || "");
  return normalizeInviteCode(params.get("ref") || params.get("inviteCode"));
}

export function saveLockedInviteCode(code: string) {
  const normalized = normalizeInviteCode(code);
  if (!normalized) return;
  localStorage.setItem(REF_INVITE_CODE_KEY, normalized);
}

export function getLockedInviteCode(): string {
  return normalizeInviteCode(localStorage.getItem(REF_INVITE_CODE_KEY));
}

export function clearLockedInviteCode() {
  localStorage.removeItem(REF_INVITE_CODE_KEY);
}

export function syncLockedInviteCodeBySearch(search: string): string {
  const fromSearch = extractInviteCodeFromSearch(search);
  if (fromSearch) {
    saveLockedInviteCode(fromSearch);
    return fromSearch;
  }
  return getLockedInviteCode();
}

