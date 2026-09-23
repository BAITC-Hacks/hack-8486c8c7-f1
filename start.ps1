$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if (-not (Test-Path -LiteralPath '.venv/Scripts/python.exe')) {
    if (Get-Command py -ErrorAction SilentlyContinue) { & py -3 -m venv .venv }
    elseif (Get-Command python -ErrorAction SilentlyContinue) { & python -m venv .venv }
    else { throw 'Install Python 3.11+ and retry.' }
    if ($LASTEXITCODE -ne 0) { throw 'Could not create Python environment.' }
}
$taskPython = Join-Path $PSScriptRoot '.venv/Scripts/python.exe'
& $taskPython -m pip install -r backend/requirements.txt
if ($LASTEXITCODE -ne 0) { throw 'Backend dependency installation failed.' }
& npm.cmd ci --prefix frontend
if ($LASTEXITCODE -ne 0) { throw 'Frontend dependency installation failed.' }
& npm.cmd run build --prefix frontend
if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed.' }
Write-Host 'Open http://127.0.0.1:8000 - Ctrl+C to stop' -ForegroundColor Green
& $taskPython -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
