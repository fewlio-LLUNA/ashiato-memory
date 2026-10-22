# public/icon.svg から public/apple-touch-icon.png（180×180）を書き出す（設計書 §8.1）
# 使い方: プロジェクトルートで  powershell -ExecutionPolicy Bypass -File .\scripts\export-icon.ps1
# 必要なもの: Google Chrome または Microsoft Edge（ヘッドレスでスクリーンショットを撮る）

$ErrorActionPreference = 'Stop'

$IconSize = 180
$Root = Split-Path -Parent $PSScriptRoot
$SvgPath = Join-Path $Root 'public\icon.svg'
$PngPath = Join-Path $Root 'public\apple-touch-icon.png'

$BrowserCandidates = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
)
$Browser = $BrowserCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $Browser) { throw 'Chrome / Edge が見つかりません。' }

# SVG を直接開くと寸法が合わないため、指定サイズの <img> で包んだ一時 HTML を撮る
$SvgUrl = ([System.Uri]$SvgPath).AbsoluteUri
$WrapperPath = Join-Path ([System.IO.Path]::GetTempPath()) 'ashiato-icon-export.html'
$Html = @"
<!doctype html><html><head><style>
html,body{margin:0;padding:0;overflow:hidden}
img{display:block;width:${IconSize}px;height:${IconSize}px}
</style></head><body><img src="$SvgUrl"></body></html>
"@
Set-Content -Path $WrapperPath -Value $Html -Encoding UTF8

# Chrome は GUI アプリで & 呼び出しでは終了を待たないため、Start-Process -Wait で待つ
$BrowserArgs = @(
  '--headless', '--disable-gpu', '--hide-scrollbars',
  "--window-size=$IconSize,$IconSize", "--screenshot=`"$PngPath`"",
  ([System.Uri]$WrapperPath).AbsoluteUri
)
# 古い PNG が残っていると失敗を見逃すため、先に消しておく
Remove-Item $PngPath -ErrorAction SilentlyContinue
try {
  Start-Process -FilePath $Browser -ArgumentList $BrowserArgs -Wait -WindowStyle Hidden
} finally {
  Remove-Item $WrapperPath -ErrorAction SilentlyContinue
}

if (-not (Test-Path $PngPath)) { throw "書き出しに失敗しました: $PngPath" }
Write-Host "書き出しました: $PngPath"
