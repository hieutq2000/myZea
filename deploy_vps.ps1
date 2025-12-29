Write-Host "--- Bắt đầu Deploy lên VPS 103.195.5.146 ---"

# 1. Upload Admin Web
Write-Host "[1/3] Uploading Admin Web to /var/www/admin/..."
scp -r admin-web/dist/* root@103.195.5.146:/var/www/admin/

# 2. Upload Backend Files
Write-Host "[2/3] Uploading Backend code to /root/vinalive-backend/..."
# Upload index.js to src
scp backend/src/index.js root@103.195.5.146:/root/vinalive-backend/src/
# Upload groupRoutes.js to src (for group chat support)
scp backend/src/groupRoutes.js root@103.195.5.146:/root/vinalive-backend/src/
# Upload changelog.js to src
scp backend/src/changelog.js root@103.195.5.146:/root/vinalive-backend/src/
# Upload dbOptimize.js to src (database optimization script)
scp backend/src/dbOptimize.js root@103.195.5.146:/root/vinalive-backend/src/
# Upload socketHandlers.js to src (Socket.IO realtime handlers)
scp backend/src/socketHandlers.js root@103.195.5.146:/root/vinalive-backend/src/
# Upload routes folder (modular routes)
ssh root@103.195.5.146 "mkdir -p /root/vinalive-backend/src/routes"
scp -r backend/src/routes/* root@103.195.5.146:/root/vinalive-backend/src/routes/
# Upload init_certificates_table.js to scripts
ssh root@103.195.5.146 "mkdir -p /root/vinalive-backend/src/scripts"
scp backend/src/scripts/init_certificates_table.js root@103.195.5.146:/root/vinalive-backend/src/scripts/
# Upload package.json
scp backend/package.json root@103.195.5.146:/root/vinalive-backend/
# Upload app-install.html to public
scp backend/public/app-install.html root@103.195.5.146:/root/vinalive-backend/public/
# Upload 404.html to public
scp backend/public/404.html root@103.195.5.146:/root/vinalive-backend/public/
# Upload source.json for AltStore repo
scp source.json root@103.195.5.146:/root/vinalive-backend/
# Upload source.json to Web Root (Public access)
scp source.json root@103.195.5.146:/var/www/

# Note: Stickers folder is large and rarely changes
# Only upload stickers manually if needed with:
# scp -r backend/uploads/stickers root@103.195.5.146:/root/vinalive-backend/uploads/

# 3. Reload Backend
Write-Host "[3/3] Installing dependencies and Restarting PM2 services..."
ssh root@103.195.5.146 "cd /root/vinalive-backend && npm install && pm2 delete all && pm2 start src/index.js --name backend"

# 4. Run migrations
Write-Host "[4/5] Running Database Migrations..."
ssh root@103.195.5.146 "cd /root/vinalive-backend/src/scripts && node init_certificates_table.js"

# 5. Run Database Optimization
Write-Host "[5/5] Running Database Optimization..."
ssh root@103.195.5.146 "cd /root/vinalive-backend/src && node dbOptimize.js"

Write-Host "--- Deploy Hoàn Tất! ---"
