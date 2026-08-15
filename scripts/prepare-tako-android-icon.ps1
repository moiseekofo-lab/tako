Add-Type -AssemblyName System.Drawing

$sourcePath = 'C:\Users\LENOVO\Downloads\WhatsApp Image 2026-08-13 at 09.40.31 (1).jpeg'
$assetsPath = 'C:\Users\LENOVO\myApp\assets\images'
$size = 1024

$source = [System.Drawing.Bitmap]::FromFile($sourcePath)

function New-Canvas([bool]$transparent) {
    $format = if ($transparent) {
        [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
    } else {
        [System.Drawing.Imaging.PixelFormat]::Format24bppRgb
    }
    return New-Object System.Drawing.Bitmap($size, $size, $format)
}

# Icône classique : reproduction fidèle de l'image fournie.
$legacy = New-Canvas $false
$graphics = [System.Drawing.Graphics]::FromImage($legacy)
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.DrawImage($source, 0, 0, $size, $size)
$graphics.Dispose()
$legacy.Save((Join-Path $assetsPath 'tako-app-icon.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$legacy.Dispose()

# Icône adaptative : extrait le symbole, puis centre précisément son emprise visuelle.
$scaled = New-Canvas $false
$graphics = [System.Drawing.Graphics]::FromImage($scaled)
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.DrawImage($source, 0, 0, $size, $size)
$graphics.Dispose()

$points = New-Object System.Collections.Generic.List[object]
for ($y = 0; $y -lt $size; $y++) {
    for ($x = 0; $x -lt $size; $x++) {
        $pixel = $scaled.GetPixel($x, $y)
        $isWhite = $pixel.R -gt 175 -and $pixel.G -gt 175 -and $pixel.B -gt 175
        $isYellow = $pixel.R -gt 165 -and $pixel.G -gt 105 -and $pixel.B -lt 175
        if ($isWhite -or $isYellow) {
            $points.Add([System.Drawing.Point]::new($x, $y))
        }
    }
}

$minX = ($points | Measure-Object X -Minimum).Minimum
$maxX = ($points | Measure-Object X -Maximum).Maximum
$minY = ($points | Measure-Object Y -Minimum).Minimum
$maxY = ($points | Measure-Object Y -Maximum).Maximum
$offsetX = [int](($size - ($maxX - $minX + 1)) / 2 - $minX)
$offsetY = [int](($size - ($maxY - $minY + 1)) / 2 - $minY)

$rawForeground = New-Canvas $true
$rawMonochrome = New-Canvas $true
for ($y = 0; $y -lt $size; $y++) {
    for ($x = 0; $x -lt $size; $x++) {
        $pixel = $scaled.GetPixel($x, $y)
        $isWhite = $pixel.R -gt 175 -and $pixel.G -gt 175 -and $pixel.B -gt 175
        $isYellow = $pixel.R -gt 165 -and $pixel.G -gt 105 -and $pixel.B -lt 175
        if ($isWhite -or $isYellow) {
            $targetX = $x + $offsetX
            $targetY = $y + $offsetY
            if ($targetX -ge 0 -and $targetX -lt $size -and $targetY -ge 0 -and $targetY -lt $size) {
                $rawForeground.SetPixel($targetX, $targetY, [System.Drawing.Color]::FromArgb(255, $pixel.R, $pixel.G, $pixel.B))
                $rawMonochrome.SetPixel($targetX, $targetY, [System.Drawing.Color]::White)
            }
        }
    }
}

# Agrandissement léger du symbole autour du centre, sans modifier ses proportions.
$iconScale = 1.15
$drawSize = [int]($size * $iconScale)
$drawOffset = [int](($size - $drawSize) / 2)
$foreground = New-Canvas $true
$monochrome = New-Canvas $true
$graphics = [System.Drawing.Graphics]::FromImage($foreground)
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.DrawImage($rawForeground, $drawOffset, $drawOffset, $drawSize, $drawSize)
$graphics.Dispose()
$graphics = [System.Drawing.Graphics]::FromImage($monochrome)
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.DrawImage($rawMonochrome, $drawOffset, $drawOffset, $drawSize, $drawSize)
$graphics.Dispose()

$foreground.Save((Join-Path $assetsPath 'android-icon-foreground.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$monochrome.Save((Join-Path $assetsPath 'android-icon-monochrome.png'), [System.Drawing.Imaging.ImageFormat]::Png)

$background = New-Canvas $false
$graphics = [System.Drawing.Graphics]::FromImage($background)
$graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#0B2870'))
$graphics.Dispose()
$background.Save((Join-Path $assetsPath 'android-icon-background.png'), [System.Drawing.Imaging.ImageFormat]::Png)

$background.Dispose()
$foreground.Dispose()
$monochrome.Dispose()
$rawForeground.Dispose()
$rawMonochrome.Dispose()
$scaled.Dispose()
$source.Dispose()

Write-Output "Icônes TaKo générées et centrées. Décalage appliqué : X=$offsetX, Y=$offsetY"
