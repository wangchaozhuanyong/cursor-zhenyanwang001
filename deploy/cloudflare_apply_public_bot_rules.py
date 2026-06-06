#!/usr/bin/env python3
"""Apply Cloudflare WAF custom rules for public storefront bot protection."""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

RULESET_PHASE = "http_request_firewall_custom"
BLOCK_RULE_NAME = os.environ.get(
    "CF_PUBLIC_BOT_BLOCK_RULE_NAME",
    "public-storefront-ai-crawler-block",
)
CHALLENGE_RULE_NAME = os.environ.get(
    "CF_PUBLIC_BOT_CHALLENGE_RULE_NAME",
    "public-storefront-bot-challenge",
)

DEFAULT_PUBLIC_HOSTS = ("damatong.net", "www.damatong.net")

PROTECTED_PATHS = (
    'http.request.uri.path eq "/"',
    'starts_with(http.request.uri.path, "/new-arrivals")',
    'starts_with(http.request.uri.path, "/categories")',
    'starts_with(http.request.uri.path, "/help")',
    'starts_with(http.request.uri.path, "/support-download")',
    'starts_with(http.request.uri.path, "/about")',
    'starts_with(http.request.uri.path, "/search")',
    'starts_with(http.request.uri.path, "/content/")',
    'starts_with(http.request.uri.path, "/product/")',
    'starts_with(http.request.uri.path, "/api/")',
    'starts_with(http.request.uri.path, "/assets/")',
)

EXEMPT_PATHS = (
    'starts_with(http.request.uri.path, "/tiktok")',
    'http.request.uri.path eq "/robots.txt"',
    'http.request.uri.path eq "/sitemap.xml"',
    'starts_with(http.request.uri.path, "/assets/tiktok-")',
    'starts_with(http.request.uri.path, "/.well-known/")',
    'starts_with(http.request.uri.path, "/api/health/")',
)

KNOWN_AI_CRAWLER_EXPR = (
    'http.user_agent matches '
    '"(?i)(Bytespider|TikTokSpider|GPTBot|ClaudeBot|CCBot|Amazonbot|Applebot|Meta-ExternalAgent|PetalBot|Google-CloudVertexBot|GoogleOther|DuckAssistBot)"'
)

GENERIC_BOT_EXPR = (
    'http.user_agent matches '
    '"(?i)(bot|spider|crawler|scraper|headless|playwright|puppeteer|phantomjs|selenium|python-requests|httpx|aiohttp|scrapy|curl|wget|go-http-client|java/|okhttp|libwww-perl|node-fetch)"'
)


def parse_public_hosts() -> list[str]:
  raw = os.environ.get("CF_PUBLIC_HOSTS", "")
  hosts = [part.strip() for part in raw.split(",") if part.strip()]
  return hosts or list(DEFAULT_PUBLIC_HOSTS)


def host_expr(hosts: list[str]) -> str:
  quoted = " ".join(f'"{host}"' for host in hosts)
  return f"http.host in {{{quoted}}}"


def or_expr(parts: tuple[str, ...]) -> str:
  return " or ".join(f"({part})" for part in parts)


def build_rule_scope(hosts: list[str]) -> str:
  return (
    f"({host_expr(hosts)} and ({or_expr(PROTECTED_PATHS)}) and "
    f"not ({or_expr(EXEMPT_PATHS)}))"
  )


def build_rules(hosts: list[str]) -> list[dict]:
  scope = build_rule_scope(hosts)
  return [
    {
      "description": BLOCK_RULE_NAME,
      "enabled": True,
      "expression": f"{scope} and ({KNOWN_AI_CRAWLER_EXPR})",
      "action": "block",
    },
    {
      "description": CHALLENGE_RULE_NAME,
      "enabled": True,
      "expression": f"{scope} and ({GENERIC_BOT_EXPR})",
      "action": "managed_challenge",
    },
  ]


def api(method: str, path: str, body: dict | None = None) -> dict:
  token = os.environ["CF_API_TOKEN"]
  zone = os.environ["CF_ZONE_ID"]
  url = f"https://api.cloudflare.com/client/v4{path.replace('{zone}', zone)}"
  data = None if body is None else json.dumps(body).encode("utf-8")
  req = urllib.request.Request(
    url,
    data=data,
    method=method,
    headers={
      "Authorization": f"Bearer {token}",
      "Content-Type": "application/json",
    },
  )
  with urllib.request.urlopen(req, timeout=60) as resp:
    return json.loads(resp.read().decode("utf-8"))


def fail(msg: str, payload: dict | None = None) -> None:
  print(f"[cf] {msg}", file=sys.stderr)
  if payload is not None:
    print(json.dumps(payload, ensure_ascii=False, indent=2), file=sys.stderr)
  sys.exit(1)


def upsert_public_bot_rules() -> None:
  hosts = parse_public_hosts()
  entry = api("GET", f"/zones/{{zone}}/rulesets/phases/{RULESET_PHASE}/entrypoint")
  if not entry.get("success"):
    fail("read custom ruleset failed", entry)

  result = entry.get("result") or {}
  rules = list(result.get("rules") or [])
  filtered = [
    rule
    for rule in rules
    if (rule.get("description") or "") not in {BLOCK_RULE_NAME, CHALLENGE_RULE_NAME}
  ]
  body = {"rules": build_rules(hosts) + filtered}
  ruleset_id = result.get("id")
  if ruleset_id:
    out = api("PUT", f"/zones/{{zone}}/rulesets/{ruleset_id}", body)
  else:
    out = api("PUT", f"/zones/{{zone}}/rulesets/phases/{RULESET_PHASE}/entrypoint", body)
  if not out.get("success"):
    fail("apply public bot rules failed", out)
  print(f'[cf] public bot rules applied for: {", ".join(hosts)}')


def print_dry_run() -> None:
  hosts = parse_public_hosts()
  payload = {
    "phase": RULESET_PHASE,
    "hosts": hosts,
    "rules": build_rules(hosts),
  }
  print(json.dumps(payload, ensure_ascii=False, indent=2))


def main() -> None:
  mode = sys.argv[1] if len(sys.argv) > 1 else "apply"
  if mode in ("apply", "--apply"):
    if not os.environ.get("CF_API_TOKEN") or not os.environ.get("CF_ZONE_ID"):
      print("[cf] missing CF_API_TOKEN or CF_ZONE_ID", file=sys.stderr)
      sys.exit(0)
    upsert_public_bot_rules()
  elif mode in ("--dry-run", "dry-run"):
    print_dry_run()
  else:
    fail(f"unknown mode: {mode}")


if __name__ == "__main__":
  try:
    main()
  except urllib.error.HTTPError as e:
    body = e.read().decode("utf-8", errors="replace")
    fail(f"HTTP {e.code}", json.loads(body) if body.strip().startswith("{") else {"raw": body})
