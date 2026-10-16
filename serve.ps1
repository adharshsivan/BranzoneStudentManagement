# Tiny static server for Branzone Studio Office (no Node / Python needed).
# Usage:  powershell -ExecutionPolicy Bypass -File serve.ps1   (then open http://localhost:5173)
param([int]$Port = 5173)
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Branzone Studio Office running at http://localhost:$Port/  (Ctrl+C to stop)"
$types = @{ ".html"="text/html; charset=utf-8"; ".js"="text/javascript; charset=utf-8"; ".css"="text/css; charset=utf-8"; ".json"="application/json"; ".svg"="image/svg+xml"; ".png"="image/png"; ".jpg"="image/jpeg"; ".ico"="image/x-icon"; ".md"="text/plain; charset=utf-8" }
try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    try {
      $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
      if ([string]::IsNullOrEmpty($path)) { $path = "index.html" }
      $file = [System.IO.Path]::GetFullPath((Join-Path $root $path))
      $res = $ctx.Response
      if ($file.StartsWith($root) -and (Test-Path $file -PathType Leaf)) {
        $ext = [System.IO.Path]::GetExtension($file).ToLower()
        $res.ContentType = if ($types.ContainsKey($ext)) { $types[$ext] } else { "application/octet-stream" }
        $res.Headers.Add("Cache-Control", "no-cache")
        [byte[]]$bytes = [System.IO.File]::ReadAllBytes($file)
        $res.ContentLength64 = $bytes.Length
        if ($ctx.Request.HttpMethod -ne "HEAD") { $res.OutputStream.Write($bytes, 0, $bytes.Length) }
      } else { $res.StatusCode = 404 }
    } catch { Write-Host "Request failed: $_" }
    finally { try { $ctx.Response.Close() } catch {} }
  }
} finally { $listener.Stop() }
