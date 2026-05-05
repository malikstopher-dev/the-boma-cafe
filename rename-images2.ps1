$folder = "C:\Users\stoph\OneDrive\Documents\BOMA\the-boma-cafe\public\cocktails-and-drinks"

# Force rename remaining files with spaces by adding temp suffix first
$files = @(
    @{old="Chocolate Milkshake.jpg"; new="Chocolate-Milkshake-v2.jpg"},
    @{old="Strawberry Milkshake.jpg"; new="Strawberry-Milkshake-v2.jpg"},
    @{old="Chocolate Freezo.jpg"; new="Chocolate-Freezo-v2.jpg"},
    @{old="Mango Freezo.jpg"; new="Mango-Freezo-v2.jpg"}
)

foreach ($f in $files) {
    $oldPath = Join-Path $folder $f.old
    if (Test-Path $oldPath) {
        $newPath = Join-Path $folder $f.new
        Rename-Item -Path $oldPath -NewName $f.new
        Write-Host "Renamed: $($f.old) -> $($f.new)"
    }
}

# Now rename to clean kebab-case
Get-ChildItem -Path $folder -File | Where-Object { $_.Name -match ' ' } | ForEach-Object {
    $newName = $_.Name -replace ' ', '-'
    if ($newName -notmatch '^-') {
        Rename-Item -Path $_.FullName -NewName $newName
        Write-Host "Renamed: $($_.Name) -> $newName"
    }
}