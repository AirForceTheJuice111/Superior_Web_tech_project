param(
    [switch]$InstallDeps,
    [switch]$RebuildBackend,
    [string]$PythonHost = "127.0.0.1",
    [int]$PythonPort = 8000,
    [int]$BackendPort = 8080,
    [int]$FrontendPort = 4200,
    [string]$MavenSettings = ""
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$BackendDir = Join-Path $ProjectRoot "backend"
$PythonDir = Join-Path $ProjectRoot "python-service"
$LogDir = Join-Path $ProjectRoot "logs"
$PidFile = Join-Path $LogDir "local-run-pids.txt"
$BackendJar = Join-Path $BackendDir "target\mlplatform-backend-0.0.1-SNAPSHOT.jar"

function Write-Step {
    param([string]$Message)
    Write-Host "[start-local] $Message"
}

function Test-CommandExists {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Missing command: $Name"
    }
}

function Test-PortFree {
    param(
        [int]$Port,
        [string]$Name
    )

    $listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($listeners) {
        $owners = $listeners | Select-Object -ExpandProperty OwningProcess -Unique
        $details = foreach ($owner in $owners) {
            $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $owner" -ErrorAction SilentlyContinue
            if ($proc) {
                "$owner $($proc.Name) $($proc.CommandLine)"
            } else {
                "$owner"
            }
        }
        throw "$Name port $Port is already in use: $($details -join '; ')"
    }
}

function Wait-HttpOk {
    param(
        [string]$Url,
        [string]$Name,
        [int]$TimeoutSeconds = 60
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
                Write-Step "$Name is ready: $Url"
                return
            }
        } catch {
            Start-Sleep -Seconds 2
        }
    } while ((Get-Date) -lt $deadline)

    throw "$Name did not become ready in $TimeoutSeconds seconds: $Url"
}

function Save-Pid {
    param(
        [string]$Name,
        [int]$ProcessId
    )
    Add-Content -Path $PidFile -Value "$Name=$ProcessId"
}

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
Remove-Item -Path $PidFile -Force -ErrorAction SilentlyContinue

Write-Step "checking required commands"
Test-CommandExists "python"
Test-CommandExists "java"
Test-CommandExists "mvn"
Test-CommandExists "npm.cmd"

Write-Step "checking ports"
Test-PortFree -Port $PythonPort -Name "Python FastAPI"
Test-PortFree -Port $BackendPort -Name "Spring Boot"
Test-PortFree -Port $FrontendPort -Name "Angular"

if ($InstallDeps) {
    Write-Step "installing frontend dependencies with npm ci"
    Push-Location $ProjectRoot
    try {
        npm ci
    } finally {
        Pop-Location
    }

    Write-Step "installing Python dependencies"
    python -m pip install -r (Join-Path $PythonDir "requirements.txt")
}

if ($RebuildBackend -or -not (Test-Path $BackendJar)) {
    Write-Step "building backend jar"
    Push-Location $BackendDir
    try {
        $mvnArgs = @()
        if ($MavenSettings.Trim().Length -gt 0) {
            $mvnArgs += @("-s", $MavenSettings)
        }
        $mvnArgs += @("-q", "-DskipTests", "package")
        & mvn @mvnArgs
    } finally {
        Pop-Location
    }
}

Write-Step "starting Python service on http://$PythonHost`:$PythonPort"
$pythonProcess = Start-Process `
    -FilePath "python" `
    -ArgumentList @("-m", "uvicorn", "main:app", "--host", $PythonHost, "--port", "$PythonPort", "--app-dir", "python-service") `
    -WorkingDirectory $ProjectRoot `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $LogDir "python.out.log") `
    -RedirectStandardError (Join-Path $LogDir "python.err.log") `
    -PassThru
Save-Pid -Name "python" -ProcessId $pythonProcess.Id
Wait-HttpOk -Url "http://$PythonHost`:$PythonPort/internal/health" -Name "Python FastAPI" -TimeoutSeconds 60

Write-Step "starting Spring Boot backend on http://localhost:$BackendPort"
$backendProcess = Start-Process `
    -FilePath "java" `
    -ArgumentList @("-jar", $BackendJar, "--server.port=$BackendPort") `
    -WorkingDirectory $BackendDir `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $LogDir "backend.out.log") `
    -RedirectStandardError (Join-Path $LogDir "backend.err.log") `
    -PassThru
Save-Pid -Name "backend" -ProcessId $backendProcess.Id
Wait-HttpOk -Url "http://localhost:$BackendPort/swagger-ui.html" -Name "Spring Boot backend" -TimeoutSeconds 90

Write-Step "starting Angular frontend on http://localhost:$FrontendPort"
$frontendProcess = Start-Process `
    -FilePath "npm.cmd" `
    -ArgumentList @("start", "--", "--port", "$FrontendPort") `
    -WorkingDirectory $ProjectRoot `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $LogDir "frontend.out.log") `
    -RedirectStandardError (Join-Path $LogDir "frontend.err.log") `
    -PassThru
Save-Pid -Name "frontend-shell" -ProcessId $frontendProcess.Id
Wait-HttpOk -Url "http://localhost:$FrontendPort" -Name "Angular frontend" -TimeoutSeconds 120

Write-Host ""
Write-Step "all services are running"
Write-Host "Frontend: http://localhost:$FrontendPort"
Write-Host "Backend Swagger: http://localhost:$BackendPort/swagger-ui.html"
Write-Host "Python health: http://$PythonHost`:$PythonPort/internal/health"
Write-Host "Logs: $LogDir"
Write-Host "PID file: $PidFile"
Write-Host ""
Write-Host "To stop the processes started by this script:"
Write-Host "Get-Content `"$PidFile`" | ForEach-Object { `$id = (`$_ -split '=')[1]; Stop-Process -Id `$id -Force -ErrorAction SilentlyContinue }"
