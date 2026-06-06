#!/usr/bin/env python3
"""Generate or apply origin firewall rules that only allow Cloudflare to 80/443."""

from __future__ import annotations

import json
import os
import platform
import subprocess
import sys
import urllib.request

CF_IPS_V4_URL = os.environ.get("CF_IPS_V4_URL", "https://www.cloudflare.com/ips-v4")
CF_IPS_V6_URL = os.environ.get("CF_IPS_V6_URL", "https://www.cloudflare.com/ips-v6")
IPTABLES_CHAIN = os.environ.get("ORIGIN_FIREWALL_CHAIN", "DAMATONG_CF_ONLY")
IP6TABLES_CHAIN = os.environ.get("ORIGIN_FIREWALL_CHAIN_V6", "DAMATONG_CF_ONLY6")
PROTECTED_PORTS = os.environ.get("ORIGIN_FIREWALL_PORTS", "80,443")
SAMPLE_V4 = ["173.245.48.0/20", "103.21.244.0/22"]
SAMPLE_V6 = ["2400:cb00::/32", "2606:4700::/32"]


def fail(message: str) -> None:
    print(f"[origin-fw] {message}", file=sys.stderr)
    sys.exit(1)


def fetch_lines(url: str) -> list[str]:
    req = urllib.request.Request(url, headers={"User-Agent": "damatong-origin-firewall/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        text = resp.read().decode("utf-8")
    return [line.strip() for line in text.splitlines() if line.strip() and not line.startswith("#")]


def load_cloudflare_ranges() -> tuple[list[str], list[str]]:
    if os.environ.get("ORIGIN_FIREWALL_OFFLINE_SAMPLE") == "1":
        return SAMPLE_V4, SAMPLE_V6
    return fetch_lines(CF_IPS_V4_URL), fetch_lines(CF_IPS_V6_URL)


def build_apply_commands(v4_ranges: list[str], v6_ranges: list[str]) -> list[list[str]]:
    commands: list[list[str]] = [
        ["iptables", "-N", IPTABLES_CHAIN],
        ["iptables", "-F", IPTABLES_CHAIN],
        ["iptables", "-A", IPTABLES_CHAIN, "-i", "lo", "-j", "RETURN"],
        ["iptables", "-A", IPTABLES_CHAIN, "-s", "127.0.0.1/32", "-j", "RETURN"],
    ]
    for cidr in v4_ranges:
        commands.append(["iptables", "-A", IPTABLES_CHAIN, "-s", cidr, "-j", "RETURN"])
    commands += [
        ["iptables", "-A", IPTABLES_CHAIN, "-j", "DROP"],
        ["iptables", "-D", "INPUT", "-p", "tcp", "-m", "multiport", "--dports", PROTECTED_PORTS, "-j", IPTABLES_CHAIN],
        ["iptables", "-I", "INPUT", "1", "-p", "tcp", "-m", "multiport", "--dports", PROTECTED_PORTS, "-j", IPTABLES_CHAIN],
    ]

    if v6_ranges:
        commands += [
            ["ip6tables", "-N", IP6TABLES_CHAIN],
            ["ip6tables", "-F", IP6TABLES_CHAIN],
            ["ip6tables", "-A", IP6TABLES_CHAIN, "-i", "lo", "-j", "RETURN"],
            ["ip6tables", "-A", IP6TABLES_CHAIN, "-s", "::1/128", "-j", "RETURN"],
        ]
        for cidr in v6_ranges:
            commands.append(["ip6tables", "-A", IP6TABLES_CHAIN, "-s", cidr, "-j", "RETURN"])
        commands += [
            ["ip6tables", "-A", IP6TABLES_CHAIN, "-j", "DROP"],
            ["ip6tables", "-D", "INPUT", "-p", "tcp", "-m", "multiport", "--dports", PROTECTED_PORTS, "-j", IP6TABLES_CHAIN],
            ["ip6tables", "-I", "INPUT", "1", "-p", "tcp", "-m", "multiport", "--dports", PROTECTED_PORTS, "-j", IP6TABLES_CHAIN],
        ]
    return commands


def build_rollback_commands() -> list[list[str]]:
    return [
        ["iptables", "-D", "INPUT", "-p", "tcp", "-m", "multiport", "--dports", PROTECTED_PORTS, "-j", IPTABLES_CHAIN],
        ["iptables", "-F", IPTABLES_CHAIN],
        ["iptables", "-X", IPTABLES_CHAIN],
        ["ip6tables", "-D", "INPUT", "-p", "tcp", "-m", "multiport", "--dports", PROTECTED_PORTS, "-j", IP6TABLES_CHAIN],
        ["ip6tables", "-F", IP6TABLES_CHAIN],
        ["ip6tables", "-X", IP6TABLES_CHAIN],
    ]


def command_payload(commands: list[list[str]]) -> dict:
    return {
        "ports": PROTECTED_PORTS,
        "commands": [" ".join(cmd) for cmd in commands],
        "note": "Apply blocks direct origin access to HTTP/HTTPS unless the source IP is Cloudflare.",
    }


def run_command(command: list[str], allow_failure: bool = False) -> None:
    result = subprocess.run(command, check=False, text=True, capture_output=True)
    if result.returncode != 0 and not allow_failure:
        fail(f"command failed: {' '.join(command)}\n{result.stderr.strip()}")


def assert_linux_root() -> None:
    if platform.system().lower() != "linux":
        fail("apply/rollback must run on the Linux origin server")
    if hasattr(os, "geteuid") and os.geteuid() != 0:
        fail("apply/rollback must run as root")


def apply_firewall() -> None:
    if os.environ.get("APPLY_ORIGIN_CLOUDFLARE_ONLY") != "1":
        fail("set APPLY_ORIGIN_CLOUDFLARE_ONLY=1 to apply")
    if os.environ.get("ORIGIN_FIREWALL_ACK") != "ONLY_CLOUDFLARE_CAN_REACH_80_443":
        fail("set ORIGIN_FIREWALL_ACK=ONLY_CLOUDFLARE_CAN_REACH_80_443 to apply")
    assert_linux_root()
    v4_ranges, v6_ranges = load_cloudflare_ranges()
    for command in build_apply_commands(v4_ranges, v6_ranges):
        allow_failure = command[1] in {"-N", "-D"}
        run_command(command, allow_failure=allow_failure)
    print(f"[origin-fw] applied Cloudflare-only rules for ports {PROTECTED_PORTS}")


def rollback_firewall() -> None:
    if os.environ.get("ORIGIN_FIREWALL_ROLLBACK_ACK") != "REMOVE_CLOUDFLARE_ONLY_RULES":
        fail("set ORIGIN_FIREWALL_ROLLBACK_ACK=REMOVE_CLOUDFLARE_ONLY_RULES to rollback")
    assert_linux_root()
    for command in build_rollback_commands():
        run_command(command, allow_failure=True)
    print(f"[origin-fw] rollback completed for ports {PROTECTED_PORTS}")


def print_dry_run() -> None:
    v4_ranges, v6_ranges = load_cloudflare_ranges()
    payload = {
        "cloudflare_ipv4_count": len(v4_ranges),
        "cloudflare_ipv6_count": len(v6_ranges),
        "apply_requires": {
            "APPLY_ORIGIN_CLOUDFLARE_ONLY": "1",
            "ORIGIN_FIREWALL_ACK": "ONLY_CLOUDFLARE_CAN_REACH_80_443",
        },
        "rollback_requires": {"ORIGIN_FIREWALL_ROLLBACK_ACK": "REMOVE_CLOUDFLARE_ONLY_RULES"},
        "apply": command_payload(build_apply_commands(v4_ranges, v6_ranges)),
        "rollback": command_payload(build_rollback_commands()),
    }
    print(json.dumps(payload, ensure_ascii=False, indent=2))


def main() -> None:
    mode = sys.argv[1] if len(sys.argv) > 1 else "dry-run"
    if mode in {"dry-run", "--dry-run", "check"}:
        print_dry_run()
        return
    if mode in {"apply", "--apply"}:
        apply_firewall()
        return
    if mode in {"rollback", "--rollback"}:
        rollback_firewall()
        return
    fail(f"unknown mode: {mode}")


if __name__ == "__main__":
    main()
