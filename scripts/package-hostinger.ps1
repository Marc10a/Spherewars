# Assembles a ready-to-upload folder for Node.js hosting (Hostinger) from a STANDALONE build.
# Usage (from the project root):
#   $env:STANDALONE="1"; $env:NEXT_PUBLIC_SITE_URL="https://spherewars.es"; npm run build
#   powershell -File scripts/package-hostinger.ps1 -LinuxSharp <folder with node_modules/@img linux packages>
param(
  [string]$Out = "..\spherewars-hostinger",
  [string]$LinuxSharp = ""
)
$ErrorActionPreference = "Stop"
$root = Resolve-Path "$PSScriptRoot\.."
$out = [IO.Path]::GetFullPath((Join-Path $root $Out))
if (Test-Path $out) { Remove-Item $out -Recurse -Force }
New-Item -ItemType Directory $out | Out-Null

robocopy "$root\.next\standalone" $out /E /NFL /NDL /NJH /NJS | Out-Null
New-Item -ItemType Directory "$out\.next\static" -Force | Out-Null
robocopy "$root\.next\static" "$out\.next\static" /E /NFL /NDL /NJH /NJS | Out-Null
robocopy "$root\public" "$out\public" /E /NFL /NDL /NJH /NJS | Out-Null

# Next image optimisation needs sharp for the SERVER's OS (Linux), not the Windows one used to build.
if ($LinuxSharp) {
  robocopy "$LinuxSharp\node_modules\@img" "$out\node_modules\@img" /E /NFL /NDL /NJH /NJS | Out-Null
  Remove-Item "$out\node_modules\@img\sharp-win32-x64" -Recurse -Force -ErrorAction SilentlyContinue
}
Write-Host "Folder ready: $out"
