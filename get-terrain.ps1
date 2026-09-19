# Downloads 28 elevation tiles (AWS Terrain Tiles, open data) into data\terrain.
# Run from C:\dev\mos-translator
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
$dir = "data\terrain"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
$fail = 0
$tiles = @(
  "marine-corps,711,1644",
  "marine-corps,712,1644",
  "marine-corps,711,1645",
  "marine-corps,712,1645",
  "army,1148,1619",
  "army,1149,1619",
  "army,1148,1620",
  "army,1149,1620",
  "navy,250,1798",
  "navy,251,1798",
  "navy,250,1799",
  "navy,251,1799",
  "air-force,738,1604",
  "air-force,739,1604",
  "air-force,738,1605",
  "air-force,739,1605",
  "space-force,856,1567",
  "space-force,857,1567",
  "space-force,856,1568",
  "space-force,857,1568",
  "coast-guard,1227,1529",
  "coast-guard,1228,1529",
  "coast-guard,1227,1530",
  "coast-guard,1228,1530",
  "all,1170,1566",
  "all,1171,1566",
  "all,1170,1567",
  "all,1171,1567"
)
foreach ($t in $tiles) {
  $p = $t.Split(",")
  $url = "https://elevation-tiles-prod.s3.amazonaws.com/terrarium/12/{0}/{1}.png" -f $p[1], $p[2]
  $out = Join-Path $dir ("{0}_{1}_{2}.png" -f $p[0], $p[1], $p[2])
  if (Test-Path $out) { Write-Host "skip $out"; continue }
  try {
    Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing
    Write-Host "ok   $out"
  } catch {
    $fail++
    Write-Host "FAIL $url"
    Write-Host $_.Exception.Message
  }
}
$n = (Get-ChildItem $dir -Filter *.png -ErrorAction SilentlyContinue).Count
Write-Host ""
Write-Host ("downloaded {0} of 28 files, {1} failed" -f $n, $fail)
