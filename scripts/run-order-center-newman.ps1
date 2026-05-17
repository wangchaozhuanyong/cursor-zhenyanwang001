Param(
  [string]$BaseUrl = "http://localhost:3000",
  [string]$Token = "",
  [string]$OrderId = "",
  [string]$OrderItemId = "",
  [string]$ProductId = ""
)

$collection = "docs/postman-order-center-collection.json"
$envFile = "docs/postman-order-center-environment.json"

$newman = Get-Command newman -ErrorAction SilentlyContinue
if (-not $newman) {
  Write-Host "newman not found. install: npm i -g newman"
  exit 1
}

newman run $collection `
  -e $envFile `
  --env-var "base_url=$BaseUrl" `
  --env-var "token=$Token" `
  --env-var "order_id=$OrderId" `
  --env-var "order_item_id=$OrderItemId" `
  --env-var "product_id=$ProductId" `
  --reporters cli
