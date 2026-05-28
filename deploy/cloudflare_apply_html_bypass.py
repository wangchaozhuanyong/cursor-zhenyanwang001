#!/usr/bin/env python3
"""Apply Cloudflare cache bypass for HTML/SW entry + remove temp CSS redirect + purge."""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

RULE_NAME = os.environ.get("CF_HTML_CACHE_RULE_NAME", "no-cache-html-entry")
REDIRECT_NAME = os.environ.get("CF_REMOVE_REDIRECT_RULE_NAME", "hotfix-redirect-old-css")

HTML_EXPR = """(http.host in {"damatong.net" "www.damatong.net" "console.damatong.net"} and (
  http.request.uri.path eq "/" or
  http.request.uri.path eq "/index.html" or
  http.request.uri.path eq "/admin-index.html" or
  http.request.uri.path eq "/sw.js" or
  http.request.uri.path.extension eq "html" or
  http.request.uri.path matches "^/workbox-[a-z0-9]+\\\\.js$"
))"""


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


def upsert_cache_rule() -> None:
    phase = "http_request_cache_settings"
    entry = api("GET", f"/zones/{{zone}}/rulesets/phases/{phase}/entrypoint")
    if not entry.get("success"):
        fail("read cache ruleset failed", entry)
    result = entry.get("result") or {}
    rules = list(result.get("rules") or [])
    rules = [r for r in rules if (r.get("description") or "") != RULE_NAME]
    rules.append(
        {
            "description": RULE_NAME,
            "enabled": True,
            "expression": HTML_EXPR,
            "action": "set_cache_settings",
            "action_parameters": {"cache": False},
        }
    )
    ruleset_id = result.get("id")
    body = {"rules": rules}
    if ruleset_id:
        out = api("PUT", f"/zones/{{zone}}/rulesets/{ruleset_id}", body)
    else:
        out = api("PUT", f"/zones/{{zone}}/rulesets/phases/{phase}/entrypoint", body)
    if not out.get("success"):
        fail("apply cache rule failed", out)
    print(f'[cf] cache rule "{RULE_NAME}" applied')


def remove_redirect() -> None:
    phase = "http_request_dynamic_redirect"
    entry = api("GET", f"/zones/{{zone}}/rulesets/phases/{phase}/entrypoint")
    if not entry.get("success"):
        fail("read redirect ruleset failed", entry)
    result = entry.get("result") or {}
    rules = list(result.get("rules") or [])
    kept = [r for r in rules if (r.get("description") or "") != REDIRECT_NAME]
    removed = len(rules) - len(kept)
    if removed == 0:
        print(f'[cf] redirect "{REDIRECT_NAME}" not found (skip)')
        return
    ruleset_id = result.get("id")
    if not ruleset_id:
        fail("redirect ruleset id missing", entry)
    out = api("PUT", f"/zones/{{zone}}/rulesets/{ruleset_id}", {"rules": kept})
    if not out.get("success"):
        fail("remove redirect failed", out)
    print(f'[cf] removed redirect "{REDIRECT_NAME}"')


def purge() -> None:
    out = api("POST", "/zones/{zone}/purge_cache", {"purge_everything": True})
    if not out.get("success"):
        fail("purge failed", out)
    print("[cf] purge everything success")


def main() -> None:
    if not os.environ.get("CF_API_TOKEN") or not os.environ.get("CF_ZONE_ID"):
        print("[cf] missing CF_API_TOKEN or CF_ZONE_ID", file=sys.stderr)
        sys.exit(1)
    mode = sys.argv[1] if len(sys.argv) > 1 else "apply"
    if mode in ("apply", "--apply"):
        upsert_cache_rule()
        remove_redirect()
        purge()
    elif mode == "--purge-only":
        purge()
    elif mode == "--cache-only":
        upsert_cache_rule()
    elif mode == "--remove-redirect":
        remove_redirect()
    else:
        fail(f"unknown mode: {mode}")


if __name__ == "__main__":
    try:
        main()
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        fail(f"HTTP {e.code}", json.loads(body) if body.strip().startswith("{") else {"raw": body})
