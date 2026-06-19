param(
  [string]$Destination = ".\backups"
)

$ErrorActionPreference = "Stop"
$appDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$target = Join-Path $appDir $Destination
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
New-Item -ItemType Directory -Path $target -Force | Out-Null

if ($env:DATABASE_URL) {
  $pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
  if (-not $pgDump) { throw "pg_dump não encontrado. Instale as ferramentas do PostgreSQL." }
  & $pgDump.Source $env:DATABASE_URL --format=custom --file=(Join-Path $target "implanta-$stamp.dump")
} else {
  Copy-Item -LiteralPath (Join-Path $appDir "data\app-state.json") -Destination (Join-Path $target "app-state-$stamp.json")
}

Write-Output "Backup criado em $target"
