Write-Host "--- Bắt đầu Deploy lên VPS 103.195.5.146 ---"

# 1. Upload Admin Web
Write-Host "[1/3] Uploading Admin Web to /var/www/admin/..."
scp -r admin-web/dist/* root@103.195.5.146:/var/www/admin/

# 2. Upload Backend Files
Write-Host "[2/3] Uploading Backend code (index.js, app-install.html) to /root/vinalive-backend/..."
# Upload index.js to src
scp backend/src/index.js root@103.195.5.146:/root/vinalive-backend/src/
# Upload app-install.html to public
scp backend/public/app-install.html root@103.195.5.146:/root/vinalive-backend/public/
# Upload 404.html to public
scp backend/public/404.html root@103.195.5.146:/root/vinalive-backend/public/

# 3. Reload Backend
Write-Host "[3/3] Restarting PM2 services..."
ssh root@103.195.5.146 "pm2 reload all"

Write-Host "--- Deploy Hoàn Tất! ---"
