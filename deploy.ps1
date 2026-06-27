param(
    [ValidateSet("up", "down", "build", "logs", "restart")]
    [string]$Action = "up"
)

$composeFile = Join-Path $PSScriptRoot "docker-compose.yml"

if (!(Test-Path $composeFile)) {
    Write-Error "docker-compose.yml not found at $composeFile"
    exit 1
}

switch ($Action) {
    "up" {
        Write-Host "Starting DevPilot..." -ForegroundColor Green
        docker compose -f $composeFile up -d
        Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
        Write-Host "Backend:  http://localhost:8000" -ForegroundColor Cyan
    }
    "down" {
        Write-Host "Stopping DevPilot..." -ForegroundColor Yellow
        docker compose -f $composeFile down
    }
    "build" {
        Write-Host "Building DevPilot images..." -ForegroundColor Cyan
        docker compose -f $composeFile build
    }
    "logs" {
        docker compose -f $composeFile logs -f
    }
    "restart" {
        Write-Host "Restarting DevPilot..." -ForegroundColor Yellow
        docker compose -f $composeFile down
        docker compose -f $composeFile up -d
        Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
        Write-Host "Backend:  http://localhost:8000" -ForegroundColor Cyan
    }
}
