# リーダーOpus セッション起動スクリプト
# 役割: レビュー・品質・統合（モデル: Opus）
# 使い方: PowerShell で  .\scripts\start-leader.ps1
#   ※ 実行ポリシーで弾かれる場合:  powershell -ExecutionPolicy Bypass -File .\scripts\start-leader.ps1

$ErrorActionPreference = "Stop"

# このスクリプトの1つ上（= プロジェクトルート）へ移動
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

# 担当プロンプトを読み込んで初期メッセージとして渡す
$promptPath = Join-Path $root "docs\team-dev\prompts\leader.md"
$prompt = Get-Content -Raw -Encoding UTF8 $promptPath

Write-Host "[start-leader] $root で Claude (Opus) を起動します..." -ForegroundColor Green

# モデルは alias 'opus'（= 最新Opus）を指定
claude --model opus $prompt
