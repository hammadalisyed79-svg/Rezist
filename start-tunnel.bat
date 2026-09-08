@echo off
setlocal
cd /d "%~dp0"
set "PATH=%~dp0.tools\node;%PATH%"

echo.
echo  Rezist Cloudflare quick tunnel (no domain needed)
echo  Keep BOTH this window and your Next.js server running.
echo  The public https://....trycloudflare.com URL will appear below.
echo.

if not exist ".tools\cloudflared\cloudflared.exe" (
  echo cloudflared missing. Ask the agent to reinstall it, or download:
  echo https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
  exit /b 1
)

".tools\cloudflared\cloudflared.exe" tunnel --url http://127.0.0.1:3000
