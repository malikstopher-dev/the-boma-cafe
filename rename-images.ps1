$folder = "C:\Users\stoph\OneDrive\Documents\BOMA\the-boma-cafe\public\cocktails-and-drinks"
Get-ChildItem -Path $folder -File | Where-Object { $_.Name -match ' ' } | ForEach-Object {
    $newName = $_.Name -replace ' ', '-'
    if ($newName -notmatch '^-') {
        Rename-Item -Path $_.FullName -NewName $newName
        Write-Host "Renamed: $($_.Name) -> $newName"
    }
}