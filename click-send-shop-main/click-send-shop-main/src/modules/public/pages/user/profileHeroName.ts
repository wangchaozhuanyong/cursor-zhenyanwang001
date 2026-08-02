const PROFILE_HERO_NAME_MAX_CHARS = 8;

export function formatProfileHeroName(name: string) {
  const trimmed = name.trim();
  const chars = Array.from(trimmed);
  if (chars.length <= PROFILE_HERO_NAME_MAX_CHARS) return trimmed;
  return `${chars.slice(0, PROFILE_HERO_NAME_MAX_CHARS - 1).join("")}…`;
}
