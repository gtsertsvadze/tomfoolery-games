# Generates public/og/fruit.png (1200x630): a simple grapes bunch + title.
# (Headless renderers on this machine can't rasterize color emoji glyphs,
# so the tile's grapes are drawn as vector shapes instead.)
# Run once from the repo root: powershell -File tools/generate-og.ps1
Add-Type -AssemblyName System.Drawing

$w = 1200; $h = 630
$bmp = New-Object System.Drawing.Bitmap($w, $h)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$g.Clear([System.Drawing.Color]::White)

$purple = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(0x8E, 0x24, 0xAA))
$outline = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(0x5E, 0x35, 0xB1), 4)
$stemPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(0x6D, 0x4C, 0x41), 12)
$leafBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(0x43, 0xA0, 0x47))
$black = [System.Drawing.Brushes]::Black

# stem + leaf
$g.DrawLine($stemPen, 600, 30, 600, 95)
$g.FillEllipse($leafBrush, 610, 30, 120, 55)

# grapes bunch (rows of circles)
$r = 46
$rows = @(
  @{ y = 120; xs = @(555, 645) },
  @{ y = 200; xs = @(508, 600, 692) },
  @{ y = 280; xs = @(462, 554, 646, 738) },
  @{ y = 360; xs = @(508, 600, 692) }
)
foreach ($row in $rows) {
  foreach ($x in $row.xs) {
    $g.FillEllipse($purple, $x - $r, $row.y - $r, $r * 2, $r * 2)
    $g.DrawEllipse($outline, $x - $r, $row.y - $r, $r * 2, $r * 2)
  }
}

$titleFont = New-Object System.Drawing.Font("Segoe UI", 64, [System.Drawing.FontStyle]::Bold)
$subFont = New-Object System.Drawing.Font("Segoe UI", 30)
$format = New-Object System.Drawing.StringFormat
$format.Alignment = [System.Drawing.StringAlignment]::Center
$g.DrawString("Name a Fruit", $titleFont, $black, $w / 2, 430, $format)
$g.DrawString("tomfoolery.games", $subFont, $black, $w / 2, 530, $format)

$out = Join-Path $PSScriptRoot "../public/og/fruit.png"
New-Item -ItemType Directory -Force -Path (Split-Path $out) | Out-Null
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
Write-Host "wrote $out"
