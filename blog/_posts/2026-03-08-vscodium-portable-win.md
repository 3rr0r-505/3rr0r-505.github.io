---
title: "Ditch VS Code Bloat — Run VSCodium Fully Portable on Windows"
date: 2026-03-08
description: "Run VSCodium fully portable on Windows — all your extensions, settings, and cache in one folder, C:\ untouched. Includes a one-command update script."
---

If you have ever opened **Disk Cleanup** and wondered why your C:\ drive is quietly filling up even though you barely installed anything — VS Code is probably one of the culprits. Extensions, cache, logs, GPU data, crash dumps — it all quietly piles up on C:\ without asking.

This guide shows you how to switch to **VSCodium** (the open-source, telemetry-free build of VS Code) and set it up in **portable mode** so that *everything* — extensions, settings, themes, cache — lives in one folder on a drive of your choice. C:\ stays clean. Your setup stays yours.

---

## Before You Start — Replace These Placeholders

Throughout this guide you will see `<YOUR_DRIVE>`. Replace it with your actual drive and folder path before running any command.

| Placeholder | Example |
|---|---|
| `<YOUR_DRIVE>\Codium` | `D:\Apps\Codium` or `E:\Dev\Codium` |

Pick a location that makes sense for you and stick with it throughout.

---

## What Is VSCodium?

VSCodium is VS Code without Microsoft's telemetry, tracking, and proprietary bits. Same editor, same extensions (mostly), same feel — just cleaner. It uses the **Open VSX** marketplace instead of the Microsoft marketplace, which means a few Microsoft-exclusive extensions won't be available, but the vast majority of popular ones are.

---

## What Is Portable Mode?

Normally when you install VS Code (or VSCodium), it scatters data all over your system:

- Settings and keybindings → `C:\Users\you\AppData\Roaming`
- Cache and logs → `C:\Users\you\AppData\Local`
- Extensions → `C:\Users\you\.vscode-oss`

**Portable mode** changes all of that. You create a single folder called `data` inside the VSCodium directory, and VSCodium detects it automatically and keeps *everything* inside that folder. No more scattered files. No C:\ pollution.

The best part — if you ever want to move your setup to another machine, you just copy the folder. Done.

---

## Step 1 — Download the ZIP

Go to the VSCodium releases page:

👉 [https://github.com/VSCodium/vscodium/releases/latest](https://github.com/VSCodium/vscodium/releases/latest)

Download the file named:

```
VSCodium-win32-x64-x.xxx.xxxxx.zip
```

> **Important:** Download the `.zip` file, NOT the `.exe` or `.msi` installer. The installer defeats the purpose — we want the raw files so we can set up portable mode ourselves.

---

## Step 2 — Extract to Your Chosen Location

Extract the ZIP contents into your chosen folder. When done, the structure should look like this:

```
<YOUR_DRIVE>\Codium\
├── VSCodium.exe
├── bin\
├── resources\
├── locales\
└── ... other files
```

---

## Step 3 — Activate Portable Mode

This is the magic step. Create a folder called `data` inside your Codium directory:

```powershell
mkdir <YOUR_DRIVE>\Codium\data
```

That's it. VSCodium detects the `data` folder on startup and automatically switches to portable mode. From this point on, all your extensions, settings, keybindings, snippets, and cache will live inside:

```
<YOUR_DRIVE>\Codium\data\
├── extensions\       ← all your extensions
├── user-data\        ← settings, keybindings, snippets
└── tmp\              ← temp and cache
```

Nothing will touch C:\

---

## Step 4 — Add to PATH So You Can Use `codium` in Terminal

Open PowerShell and run:

```powershell
$current = [Environment]::GetEnvironmentVariable("PATH", "User")
[Environment]::SetEnvironmentVariable("PATH", $current + ";<YOUR_DRIVE>\Codium\bin", "User")
```

Restart PowerShell, then verify:

```powershell
codium --version
```

You should see the version number printed. If it works, you can now open any file or folder from the terminal with `codium .` just like you did with VS Code.

---

## Step 5 — Import Your VS Code Settings (Optional)

If you are migrating from VS Code and want to bring your settings, keybindings, and snippets over, run these:

```powershell
# Export your extensions list first
code --list-extensions > <YOUR_DRIVE>\Codium\my-extensions.txt

# Copy settings and keybindings
Copy-Item "$env:APPDATA\Code\User\settings.json" "<YOUR_DRIVE>\Codium\data\user-data\User\"
Copy-Item "$env:APPDATA\Code\User\keybindings.json" "<YOUR_DRIVE>\Codium\data\user-data\User\"

# Copy snippets
Copy-Item "$env:APPDATA\Code\User\snippets\*" "<YOUR_DRIVE>\Codium\data\user-data\User\snippets\" -Recurse -Force
```

Then install all your extensions into VSCodium:

```powershell
Get-Content <YOUR_DRIVE>\Codium\my-extensions.txt | ForEach-Object { codium --install-extension $_ }
```

> **Note:** A handful of Microsoft-exclusive extensions (like Pylance, Remote SSH, GitHub Codespaces) will fail to install on VSCodium since they are locked to the Microsoft marketplace. You will need to find alternatives for those on Open VSX.

---

## Keeping VSCodium Updated

Since we are using portable mode instead of the installer, VSCodium won't auto-update. Here is the manual process:

1. Download the new ZIP from [https://github.com/VSCodium/vscodium/releases/latest](https://github.com/VSCodium/vscodium/releases/latest)
2. Close VSCodium completely
3. Extract the ZIP and copy everything **except** the `data\` folder into your Codium directory, replacing old files
4. Your settings, extensions, and data are untouched

To make this easier, use the update script below.

---

## The Update Script

Save this as `codium-update.ps1` somewhere convenient (I keep mine inside `<YOUR_DRIVE>\Codium\`).

> **Before using:** Change `$CodiumDir` at the top to match your actual install path.

```powershell
# ============================================================
# codium-update.ps1
# Usage: .\codium-update.ps1 -location "C:\Downloads\VSCodium-win32-x64-x.x.x.zip"
# ============================================================

param (
    [Parameter(Mandatory = $true)]
    [string]$location
)

# ---------------------------------------------------------------
# CONFIGURE THIS — set your VSCodium install path
# ---------------------------------------------------------------
$CodiumDir = "<YOUR_DRIVE>\Codium"
# ---------------------------------------------------------------

$TempDir     = "$CodiumDir\_update_temp"
$ExcludeDirs = @("data")       # Add any other folders you want to preserve
$CleanDirs   = @("resources", "locales", "bin", "policies")

# --- Validate ZIP ---
if (-not (Test-Path $location)) {
    Write-Host "ERROR: File not found: $location" -ForegroundColor Red
    exit 1
}
if (-not ($location -like "*.zip")) {
    Write-Host "ERROR: Must be a .zip file." -ForegroundColor Red
    exit 1
}

# --- Check Codium is not running ---
$running = Get-Process -Name "VSCodium" -ErrorAction SilentlyContinue
if ($running) {
    Write-Host "ERROR: VSCodium is currently running. Please close it first." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Starting VSCodium update..." -ForegroundColor Cyan
Write-Host "Target : $CodiumDir"
Write-Host ""

# --- Cleanup old temp ---
if (Test-Path $TempDir) { Remove-Item $TempDir -Recurse -Force }

# --- Extract ---
Write-Host "[1/4] Extracting ZIP..." -ForegroundColor Yellow
Expand-Archive -Path $location -DestinationPath $TempDir -Force
Write-Host "      Done." -ForegroundColor Green

# --- Resolve source dir ---
$extracted = Get-ChildItem $TempDir
$SourceDir = if ($extracted.Count -eq 1 -and $extracted[0].PSIsContainer) { $extracted[0].FullName } else { $TempDir }

# --- Clean old folders ---
Write-Host "[2/4] Removing old folders..." -ForegroundColor Yellow
foreach ($dir in $CleanDirs) {
    $dirPath = Join-Path $CodiumDir $dir
    if (Test-Path $dirPath) { Remove-Item $dirPath -Recurse -Force }
}
Write-Host "      Done." -ForegroundColor Green

# --- Copy new files ---
Write-Host "[3/4] Copying new files..." -ForegroundColor Yellow
Get-ChildItem $SourceDir | ForEach-Object {
    if ($ExcludeDirs -notcontains $_.Name) {
        Copy-Item $_.FullName (Join-Path $CodiumDir $_.Name) -Recurse -Force
    }
}
Write-Host "      Done." -ForegroundColor Green

# --- Cleanup temp ---
Remove-Item $TempDir -Recurse -Force

# --- Verify ---
Write-Host "[4/4] Verifying..." -ForegroundColor Yellow
$version = (Get-Item "$CodiumDir\VSCodium.exe").VersionInfo.ProductVersion
if ($version) {
    Write-Host "      VSCodium version: $version" -ForegroundColor Green
} else {
    Write-Host "      Could not verify. Check manually." -ForegroundColor DarkYellow
}

Write-Host ""
Write-Host "Update complete. Your data\ and settings are untouched." -ForegroundColor Cyan
Write-Host ""
```

Run it like this:

```powershell
.\codium-update.ps1 -location "C:\Downloads\VSCodium-win32-x64-1.xxx.zip"
```

---

## What About C:\ — Honestly?

In portable mode with the ZIP install, VSCodium itself writes nothing to C:\. However, Windows as an OS will still do its own bookkeeping:

- A small prefetch file for the executable (`C:\Windows\Prefetch\`) — a few KB, managed by Windows
- Windows Defender scan logs — negligible, not growable
- Recently opened files list — a few KB, managed by Windows Shell

These are things *Windows* does for any application you run — not VSCodium. You cannot stop them, but they are static and negligible (typically under 5MB total, never growing).

Everything VSCodium-specific — extensions, settings, cache, logs — stays on your chosen drive.

---

## Final Folder Structure

```
<YOUR_DRIVE>\Codium\
├── VSCodium.exe
├── bin\
├── resources\
├── locales\
├── policies\
├── data\                  ← portable mode data (never touched by updates)
│   ├── extensions\
│   ├── user-data\
│   │   └── User\
│   │       ├── settings.json
│   │       ├── keybindings.json
│   │       └── snippets\
│   └── tmp\
└── codium-update.ps1      ← your update script
```

Clean, contained, portable. That's it.

---

*VSCodium project: [https://vscodium.com](https://vscodium.com)*
*Releases: [https://github.com/VSCodium/vscodium/releases](https://github.com/VSCodium/vscodium/releases)*