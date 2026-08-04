$base = 'http://localhost:5073'
Write-Host "Starting endpoint tests against $base"
Start-Sleep -Seconds 2

$creds = @{ username = 'e2e_user_ps'; password = 'P@ssw0rd!'; role = 'officer' }
$body = $creds | ConvertTo-Json

try {
    # Register (may already exist)
    try {
        $reg = Invoke-RestMethod -Uri "$base/api/Authentication/register" -Method Post -Body $body -ContentType 'application/json' -ErrorAction Stop
        Write-Host 'REGISTER OK'
    } catch {
        Write-Host 'REGISTER SKIPPED or ERROR:' $_.Exception.Message
    }

    # Login
    $login = Invoke-RestMethod -Uri "$base/api/Authentication/login" -Method Post -Body $body -ContentType 'application/json' -ErrorAction Stop
    Write-Host 'LOGIN OK'
    $token = $login.token
    Write-Host "TOKEN: $token"
    $headers = @{ Authorization = "Bearer $token" }

    # Cadets
    try {
        $cadets = Invoke-RestMethod -Uri "$base/api/Cadets/cadets" -Method Get -Headers $headers -ErrorAction Stop
        Write-Host ("CADETS count: " + ($cadets | Measure-Object).Count)
    } catch {
        Write-Host 'CADETS ERROR:' $_.Exception.Message
        $cadets = @()
    }
    if ($cadets -and $cadets.Count -gt 0) { $cid = $cadets[0].id } else { $cid = 0; Write-Host 'No cadet id available, using 0' }

    # Get profile (profile should include qrCodeValue)
    try { $getqr = Invoke-RestMethod -Uri "$base/api/Cadets/profile/$cid" -Method Get -Headers $headers -ErrorAction Stop; Write-Host "GET_PROFILE present: $([bool]$getqr.qrCodeValue)" } catch { Write-Host 'GET_PROFILE ERROR:' $_.Exception.Message }

    # Attendance list
    try { $attList = Invoke-RestMethod -Uri "$base/api/Attendance/attendance" -Method Get -Headers $headers -ErrorAction Stop; Write-Host ("ATT COUNT: " + ($attList | Measure-Object).Count) } catch { Write-Host 'ATT LIST ERROR:' $_.Exception.Message }

    # Create attendance
    try {
        $createBody = @{ cadetId = $cid; officerName = 'e2e_officer' } | ConvertTo-Json
        $created = Invoke-RestMethod -Uri "$base/api/Attendance/attendance" -Method Post -Headers $headers -Body $createBody -ContentType 'application/json' -ErrorAction Stop
        Write-Host ('CREATE OK: ' + ($created | ConvertTo-Json -Depth 2))
    } catch { Write-Host 'CREATE ERROR:' $_.Exception.Message }

    # Scan attendance using QR value
    if ($getqr -and $getqr.qrCodeValue) {
        try {
            $scanBody = @{ qrCodeValue = $getqr.qrCodeValue; officerName = 'e2e_officer' } | ConvertTo-Json
            $scanned = Invoke-RestMethod -Uri "$base/api/Attendance/scan" -Method Post -Headers $headers -Body $scanBody -ContentType 'application/json' -ErrorAction Stop
            Write-Host ('SCAN OK: ' + ($scanned | ConvertTo-Json -Depth 2))
        } catch { Write-Host 'SCAN ERROR:' $_.Exception.Message }
    } else { Write-Host 'SCAN_ATT SKIPPED: no qrCodeValue' }

    # Delete created attendance
    $delId = $null
    if ($created) {
        if ($created.attendanceId) { $delId = $created.attendanceId } elseif ($created.id) { $delId = $created.id }
    }
    if ($delId) {
        try { Invoke-RestMethod -Uri "$base/api/Attendance/attendance/$delId" -Method Delete -Headers $headers -ErrorAction Stop; Write-Host ('DELETED ' + $delId) } catch { Write-Host 'DELETE ERROR:' $_.Exception.Message }
    } else { Write-Host 'DELETE_ATT SKIPPED: no id found' }

    # Report
    try { $report = Invoke-RestMethod -Uri "$base/api/Attendance/report" -Method Get -Headers $headers -ErrorAction Stop; Write-Host ('REPORT OK: ' + ($report | ConvertTo-Json -Depth 2)) } catch { Write-Host 'REPORT ERROR:' $_.Exception.Message }
} catch { Write-Host 'UNEXPECTED ERROR:' $_.Exception.Message }

Write-Host 'END OF TESTS' 
