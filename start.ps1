$ErrorActionPreference = 'Stop'

Set-Location -LiteralPath $PSScriptRoot

# Add Node.js to PATH for npm and all child processes
$nodePath = 'C:\Program Files\nodejs'

if (-not (Test-Path -LiteralPath "$nodePath\node.exe")) {
    throw 'Node.js not found in C:\Program Files\nodejs'
}

$env:Path = "$nodePath;$env:Path"

$npm = Join-Path $nodePath 'npm.cmd'

# Create Python virtual environment if needed
if (-not (Test-Path -LiteralPath '.venv/Scripts/python.exe')) {
    if (Get-Command py -ErrorAction SilentlyContinue) {
        & py -3 -m venv .venv
    }
    elseif (Get-Command python -ErrorAction SilentlyContinue) {
        & python -m venv .venv
    }
    else {
        throw 'Install Python 3.11+ and retry.'
    }

    if ($LASTEXITCODE -ne 0) {
        throw 'Could not create Python environment.'
    }
}

$taskPython = Join-Path $PSScriptRoot '.venv/Scripts/python.exe'

# Backend dependencies
& $taskPython -m pip install -r backend/requirements.txt

if ($LASTEXITCODE -ne 0) {
    throw 'Backend dependency installation failed.'
}

# Frontend dependencies
& $npm ci --prefix frontend

if ($LASTEXITCODE -ne 0) {
    throw 'Frontend dependency installation failed.'
}

# Build frontend
& $npm run build --prefix frontend

if ($LASTEXITCODE -ne 0) {
    throw 'Frontend build failed.'
}

Write-Host ''
Write-Host 'TaskQuest AI started successfully!' -ForegroundColor Green
Write-Host 'Open http://127.0.0.1:8000' -ForegroundColor Green
Write-Host 'Press Ctrl+C to stop' -ForegroundColor Yellow
Write-Host ''

# Start backend
& $taskPython -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000