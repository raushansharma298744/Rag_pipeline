@echo off
REM Startup script for RAG Pipeline with React Frontend - Windows

echo 🚀 Starting RAG Pipeline (React Frontend)...

REM Check if virtual environment exists
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate venv
call venv\Scripts\activate.bat

REM Install Python dependencies
echo Installing Python dependencies...
pip install -q -r requirements.txt

REM Start API in background
echo Starting FastAPI server on port 8000...
start "RAG API" cmd /k "venv\Scripts\activate.bat && uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --reload"

REM Wait for API to be ready
echo Waiting for API to be ready...
for /l %%i in (1,1,30) do (
    curl -s http://localhost:8000/health >nul 2>&1
    if not errorlevel 1 (
        echo ✅ API is ready!
        goto api_ready
    )
    timeout /t 1 /nobreak >nul
)
:api_ready

REM Install Node dependencies and start React frontend
echo Installing Node dependencies...
cd frontend-react
if not exist node_modules npm install

echo Starting React frontend on port 5173...
start "RAG Frontend" cmd /k "npm run dev"
cd ..

echo.
echo ✅ RAG Pipeline is running!
echo    📡 API: http://localhost:8000
echo    📚 API Docs: http://localhost:8000/docs
echo    🎨 Frontend (React): http://localhost:5173
echo.
echo Close the command windows to stop services.
pause