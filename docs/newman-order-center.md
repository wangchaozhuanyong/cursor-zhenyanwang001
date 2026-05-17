# Newman 一键执行（订单中心）

## 1) 安装

```bash
npm i -g newman
```

## 2) Linux/macOS

```bash
BASE_URL="http://localhost:3000" \
TOKEN="<access_token>" \
ORDER_ID="<order_id>" \
ORDER_ITEM_ID="<order_item_id>" \
PRODUCT_ID="<product_id>" \
bash scripts/run-order-center-newman.sh
```

## 3) Windows PowerShell

```powershell
powershell -ExecutionPolicy Bypass -File scripts/run-order-center-newman.ps1 `
  -BaseUrl "http://localhost:3000" `
  -Token "<access_token>" `
  -OrderId "<order_id>" `
  -OrderItemId "<order_item_id>" `
  -ProductId "<product_id>"
```

## 4) CI 示例

```bash
newman run docs/postman-order-center-collection.json \
  -e docs/postman-order-center-environment.json \
  --env-var "base_url=$BASE_URL" \
  --env-var "token=$TOKEN" \
  --env-var "order_id=$ORDER_ID" \
  --env-var "order_item_id=$ORDER_ITEM_ID" \
  --env-var "product_id=$PRODUCT_ID" \
  --reporters cli,junit \
  --reporter-junit-export artifacts/newman-order-center.xml
```
