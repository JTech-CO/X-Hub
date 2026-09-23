$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path -LiteralPath (Split-Path -Parent $PSScriptRoot)).Path
& node (Join-Path $PSScriptRoot 'build.cjs')
if ($LASTEXITCODE -ne 0) { throw 'Build failed; the existing release ZIP was not changed.' }
$distPath = Join-Path $repoRoot 'dist'
$manifest = [IO.File]::ReadAllText((Join-Path $distPath 'manifest.json')) | ConvertFrom-Json
$releasePath = Join-Path $repoRoot 'releases'
[IO.Directory]::CreateDirectory($releasePath) | Out-Null
$zipPath = Join-Path $releasePath ('x-hub-v' + $manifest.version + '.zip')
$temporary = Join-Path $releasePath ('.package-' + [Guid]::NewGuid().ToString('N') + '.zip')
$entries = @{}
foreach ($file in (Get-ChildItem -LiteralPath $distPath -Recurse -File)) {
  $absolute = [IO.Path]::GetFullPath($file.FullName)
  if (!$absolute.StartsWith($distPath + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Package path is outside dist.' }
  $entries[$absolute.Substring($distPath.Length + 1).Replace('\', '/')] = $absolute
}
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
function Get-StreamHash($stream) {
  $hasher = [Security.Cryptography.SHA256]::Create()
  try { [BitConverter]::ToString($hasher.ComputeHash($stream)) }
  finally { $hasher.Dispose(); $stream.Dispose() }
}
$archive = $null
try {
  $archive = [IO.Compression.ZipFile]::Open($temporary, [IO.Compression.ZipArchiveMode]::Create)
  foreach ($relative in ($entries.Keys | Sort-Object)) {
    $entry = $archive.CreateEntry($relative, [IO.Compression.CompressionLevel]::Optimal)
    $entry.LastWriteTime = [DateTimeOffset]::new(2000, 1, 1, 0, 0, 0, [TimeSpan]::Zero)
    $sourceStream = [IO.File]::OpenRead($entries[$relative])
    $zipStream = $entry.Open()
    try { $sourceStream.CopyTo($zipStream) }
    finally { $sourceStream.Dispose(); $zipStream.Dispose() }
  }
  $archive.Dispose()
  $archive = [IO.Compression.ZipFile]::OpenRead($temporary)
  if ($archive.Entries.Count -ne $entries.Count -or $null -eq $archive.GetEntry('manifest.json')) { throw 'Invalid extension ZIP layout.' }
  foreach ($entry in $archive.Entries) {
    if (!$entries.ContainsKey($entry.FullName)) { throw ('Unexpected ZIP entry: ' + $entry.FullName) }
    $zipHash = Get-StreamHash ($entry.Open())
    $sourceHash = Get-StreamHash ([IO.File]::OpenRead($entries[$entry.FullName]))
    if ($zipHash -ne $sourceHash) { throw ('ZIP hash mismatch: ' + $entry.FullName) }
  }
  $archive.Dispose()
  $archive = $null
  Move-Item -LiteralPath $temporary -Destination $zipPath -Force
} finally {
  if ($null -ne $archive) { $archive.Dispose() }
  if (Test-Path -LiteralPath $temporary) { Remove-Item -LiteralPath $temporary -Force }
}
Write-Host "Packaged v$($manifest.version): $zipPath ($($entries.Count) verified runtime files)"
