# Sonnet A セッション起動スクリプト
# 役割: コーディング担当 A（モデル: Sonnet）
# 使い方: PowerShell で  .\scripts\start-sonnet-a.ps1
#   ※ 実行ポリシーで弾かれる場合:  powershell -ExecutionPolicy Bypass -File .\scripts\start-sonnet-a.ps1

$ErrorActionPreference = "Stop"

# このスクリプトの1つ上（= プロジェクトルート）へ移動
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

# 担当プロンプトを読み込んで初期メッセージとして渡す
$promptPath = Join-Path $root "docs\team-dev\prompts\sonnet-a.md"
$prompt = Get-Content -Raw -Encoding UTF8 $promptPath

Write-Host "[start-sonnet-a] $root で Claude (Sonnet) を起動します..." -ForegroundColor Green

# モデルは alias 'sonnet'（= 最新Sonnet）を指定
claude --model sonnet $prompt
