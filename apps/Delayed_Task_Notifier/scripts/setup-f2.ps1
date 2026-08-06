#Requires -Version 5.1
<#
.SYNOPSIS
    Bootstraps a machine to build/run the F2 Delayed Task Notifier (apps/Delayed_Task_Notifier).

.DESCRIPTION
    Checks for Node.js, npm, Azure CLI, and GitHub CLI; installs any that are missing via
    winget. Then runs `npm install` in this app's directory. This exists because the
    original F2 build session hit exactly this gap (Node.js wasn't installed at all) before
    any real work could start - this script removes that entire category of "did you set
    this up right" friction for whoever picks F2 up next.

    Does NOT and cannot automate: `az login` / `npx rayfin login` (interactive browser
    auth by design), or registering the Teams incoming webhook (no supported API for that -
    UI-only action). See docs/F2_HANDOFF_PROMPT.md for those remaining manual steps.

.EXAMPLE
    .\scripts\setup-f2.ps1
    Run from apps/Delayed_Task_Notifier (or anywhere - the script resolves paths relative
    to its own location).
#>

$ErrorActionPreference = "Stop"
$appRoot = Split-Path -Parent $PSScriptRoot

function Test-Command {
    param([string]$Name)
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Install-WithWinget {
    param([string]$Id, [string]$FriendlyName)
    if (-not (Test-Command "winget")) {
        Write-Warning "winget is not available on this machine. Install $FriendlyName manually, then re-run this script."
        return $false
    }
    Write-Host "Installing $FriendlyName ($Id) via winget..." -ForegroundColor Cyan
    winget install -e --id $Id --accept-source-agreements --accept-package-agreements
    return $LASTEXITCODE -eq 0
}

Write-Host "=== F2 Delayed Task Notifier - environment bootstrap ===" -ForegroundColor Green

# --- Node.js / npm ---
if (-not (Test-Command "node") -or -not (Test-Command "npm")) {
    Write-Host "Node.js/npm not found." -ForegroundColor Yellow
    Install-WithWinget -Id "OpenJS.NodeJS.LTS" -FriendlyName "Node.js LTS"
    Write-Warning "You may need to open a NEW PowerShell window/session for 'node'/'npm' to be on PATH."
} else {
    Write-Host "OK: Node.js $(node --version), npm $(npm --version)" -ForegroundColor Green
}

# --- Azure CLI ---
if (-not (Test-Command "az")) {
    Write-Host "Azure CLI not found." -ForegroundColor Yellow
    Install-WithWinget -Id "Microsoft.AzureCLI" -FriendlyName "Azure CLI"
    Write-Warning "You may need to open a NEW PowerShell window/session for 'az' to be on PATH."
} else {
    Write-Host "OK: Azure CLI installed" -ForegroundColor Green
}

# --- GitHub CLI ---
if (-not (Test-Command "gh")) {
    Write-Host "GitHub CLI not found." -ForegroundColor Yellow
    Install-WithWinget -Id "GitHub.cli" -FriendlyName "GitHub CLI"
    Write-Warning "You may need to open a NEW PowerShell window/session for 'gh' to be on PATH."
} else {
    Write-Host "OK: GitHub CLI installed" -ForegroundColor Green
}

# --- npm install ---
if (Test-Command "npm") {
    Write-Host "`nRunning 'npm install' in $appRoot ..." -ForegroundColor Cyan
    Push-Location $appRoot
    try {
        npm install
    } finally {
        Pop-Location
    }
} else {
    Write-Warning "Skipping 'npm install' - npm still not on PATH. Re-run this script in a new terminal after installing Node.js."
}

Write-Host "`n=== Bootstrap complete. Remaining manual steps (cannot be automated): ===" -ForegroundColor Green
Write-Host "  1. az login --tenant <YOUR-TENANT-ID>                 (interactive browser sign-in)"
Write-Host "  2. npx rayfin login --tenant <YOUR-TENANT-ID> --select (interactive browser sign-in)"
Write-Host "  3. npx rayfin up --workspace '<your-workspace-name>'  (deploy)"
Write-Host "  4. Register a Teams incoming webhook in your target channel (UI-only, no API)"
Write-Host "  5. Paste the webhook URL into rayfin/.env as TEAMS_WEBHOOK_URL=..."
Write-Host "`nSee docs/F2_HANDOFF_PROMPT.md for full context on each step." -ForegroundColor Cyan
