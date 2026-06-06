#!/usr/bin/env python3
"""Apply optional Cloudflare Bot Management settings for Damatong."""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

BOT_MANAGEMENT_PATH = "/zones/{zone}/bot_management"
CUSTOM_RULES_PHASE = "http_request_firewall_custom"
SKIP_RULE_NAME = os.environ.get("CF_BOT_MANAGEMENT_SKIP_RULE_NAME", "public-tiktok-sbfm-skip")
DEFAULT_PUBLIC_HOSTS = ("damatong.net", "www.damatong.net")


def parse_hosts() -> list[str]:
    raw = os.environ.get("CF_PUBLIC_HOSTS", "")
    hosts = [part.strip() for part in raw.split(",") if part.strip()]
    return hosts or list(DEFAULT_PUBLIC_HOSTS)


def host_expr(hosts: list[str]) -> str:
    quoted = " ".join(f'"{host}"' for host in hosts)
    return f"http.host in {{{quoted}}}"


def tiktok_skip_expression(hosts: list[str]) -> str:
    allowed_paths = (
        'starts_with(http.request.uri.path, "/tiktok")',
        'starts_with(http.request.uri.path, "/assets/tiktok-")',
        'http.request.uri.path eq "/robots.txt"',
        'http.request.uri.path eq "/sitemap.xml"',
    )
    path_expr = " or ".join(f"({part})" for part in allowed_paths)
    return f"({host_expr(hosts)} and ({path_expr}))"


def build_skip_rule(hosts: list[str]) -> dict:
    return {
        "description": SKIP_RULE_NAME,
        "enabled": True,
        "expression": tiktok_skip_expression(hosts),
        "action": "skip",
        "action_parameters": {"phases": ["http_request_sbfm"]},
        "logging": {"enabled": True},
    }


def desired_bot_config(mode: str) -> dict:
    if mode == "conservative":
        return {
            "ai_bots_protection": "disabled",
            "content_bots_protection": "disabled",
            "crawler_protection": "disabled",
            "enable_js": False,
            "sbfm_definitely_automated": "managed_challenge",
            "sbfm_likely_automated": "allow",
            "sbfm_verified_bots": "allow",
            "sbfm_static_resource_protection": False,
        }
    if mode == "ai-only":
        return {
            "ai_bots_protection": "block",
            "content_bots_protection": "disabled",
            "crawler_protection": "disabled",
            "enable_js": False,
            "sbfm_definitely_automated": "allow",
            "sbfm_likely_automated": "allow",
            "sbfm_verified_bots": "allow",
            "sbfm_static_resource_protection": False,
        }
    if mode == "aggressive":
        return {
            "ai_bots_protection": "block",
            "content_bots_protection": "block",
            "crawler_protection": "enabled",
            "enable_js": True,
            "sbfm_definitely_automated": "managed_challenge",
            "sbfm_likely_automated": "managed_challenge",
            "sbfm_verified_bots": "allow",
            "sbfm_static_resource_protection": False,
        }
    raise ValueError(f"unknown mode: {mode}")


def api(method: str, path: str, body: dict | None = None) -> dict:
    token = os.environ["CF_API_TOKEN"]
    zone = os.environ["CF_ZONE_ID"]
    url = f"https://api.cloudflare.com/client/v4{path.replace('{zone}', zone)}"
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode("utf-8"))


def fail(msg: str, payload: dict | None = None) -> None:
    print(f"[cf-bot] {msg}", file=sys.stderr)
    if payload is not None:
        print(json.dumps(payload, ensure_ascii=False, indent=2), file=sys.stderr)
    sys.exit(1)


def require_cloudflare_env() -> None:
    missing = [key for key in ("CF_API_TOKEN", "CF_ZONE_ID") if not os.environ.get(key)]
    if missing:
        fail(f"missing required env: {', '.join(missing)}")


def filtered_update_payload(current: dict, desired: dict) -> dict:
    if os.environ.get("CF_BOT_MANAGEMENT_FORCE_FIELDS") == "1":
        return desired
    return {key: value for key, value in desired.items() if key in current}


def upsert_sbfm_skip_rule(hosts: list[str]) -> None:
    entry = api("GET", f"/zones/{{zone}}/rulesets/phases/{CUSTOM_RULES_PHASE}/entrypoint")
    if not entry.get("success"):
        fail("read custom ruleset failed", entry)

    result = entry.get("result") or {}
    rules = list(result.get("rules") or [])
    filtered = [rule for rule in rules if (rule.get("description") or "") != SKIP_RULE_NAME]
    body = {"rules": [build_skip_rule(hosts)] + filtered}
    ruleset_id = result.get("id")
    if ruleset_id:
        out = api("PUT", f"/zones/{{zone}}/rulesets/{ruleset_id}", body)
    else:
        out = api("PUT", f"/zones/{{zone}}/rulesets/phases/{CUSTOM_RULES_PHASE}/entrypoint", body)
    if not out.get("success"):
        fail("apply SBFM skip rule failed", out)


def apply_bot_management(mode: str) -> None:
    if os.environ.get("APPLY_CF_BOT_MANAGEMENT") != "1":
        fail("set APPLY_CF_BOT_MANAGEMENT=1 to apply")
    if os.environ.get("CF_BOT_MANAGEMENT_ACK") != "KEEP_TIKTOK_AVAILABLE":
        fail("set CF_BOT_MANAGEMENT_ACK=KEEP_TIKTOK_AVAILABLE to apply")
    if mode in {"ai-only", "aggressive"} and os.environ.get("CF_BOT_MANAGEMENT_RISK_ACK") != "AI_BOTS_CAN_AFFECT_TIKTOK":
        fail("set CF_BOT_MANAGEMENT_RISK_ACK=AI_BOTS_CAN_AFFECT_TIKTOK for ai-only/aggressive mode")

    hosts = parse_hosts()
    upsert_sbfm_skip_rule(hosts)

    current_resp = api("GET", BOT_MANAGEMENT_PATH)
    if not current_resp.get("success"):
        fail("read bot management config failed", current_resp)
    current = current_resp.get("result") or {}
    payload = filtered_update_payload(current, desired_bot_config(mode))
    if not payload:
        fail("no supported Bot Management fields found on current plan", {"current_keys": sorted(current.keys())})

    out = api("PUT", BOT_MANAGEMENT_PATH, payload)
    if not out.get("success"):
        fail("apply bot management config failed", out)
    print(f"[cf-bot] applied mode={mode} fields={','.join(sorted(payload.keys()))}")


def print_dry_run(mode: str) -> None:
    hosts = parse_hosts()
    payload = {
        "mode": mode,
        "requires_apply_env": {
            "APPLY_CF_BOT_MANAGEMENT": "1",
            "CF_BOT_MANAGEMENT_ACK": "KEEP_TIKTOK_AVAILABLE",
        },
        "skip_rule": build_skip_rule(hosts),
        "bot_management_update": desired_bot_config(mode),
    }
    if mode in {"ai-only", "aggressive"}:
        payload["requires_apply_env"]["CF_BOT_MANAGEMENT_RISK_ACK"] = "AI_BOTS_CAN_AFFECT_TIKTOK"
    print(json.dumps(payload, ensure_ascii=False, indent=2))


def main() -> None:
    mode_arg = sys.argv[1] if len(sys.argv) > 1 else "dry-run"
    config_mode = os.environ.get("CF_BOT_MANAGEMENT_MODE", "conservative").strip() or "conservative"
    if mode_arg in {"dry-run", "--dry-run"}:
        print_dry_run(config_mode)
        return
    if mode_arg in {"apply", "--apply"}:
        require_cloudflare_env()
        apply_bot_management(config_mode)
        return
    fail(f"unknown mode: {mode_arg}")


if __name__ == "__main__":
    try:
        main()
    except ValueError as e:
        fail(str(e))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        fail(f"HTTP {e.code}", json.loads(body) if body.strip().startswith("{") else {"raw": body})
