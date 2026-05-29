$ErrorActionPreference = "Stop"

$url = "https://damatong.net/index.html"
$html = (Invoke-WebRequest -UseBasicParsing $url).Content

# Extract referenced asset URLs (css/js) from HTML.
$pattern = "/assets/[^`"' ]+\.(?:css|js)"
$matches = [regex]::Matches($html, $pattern)

$out = @{}
foreach ($m in $matches) {
  $out["https://damatong.net$($m.Value)"] = $true
}

$out.Keys | Sort-Object

