#!/usr/bin/env bash
# 生产公网 URL（source 后用于部署脚本健康检查）
export PROD_STOREFRONT_URL="${PROD_STOREFRONT_URL:-https://damatong.net}"
export PROD_ADMIN_URL="${PROD_ADMIN_URL:-https://console.damatong.net}"
