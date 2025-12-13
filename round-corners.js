const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function roundCorners() {
    // Đọc file gốc từ logo đã upload
    const inputPath = 'C:/Users/Admin/.gemini/antigravity/brain/b3fc751d-33a0-47be-9b8d-20da799527c9/uploaded_image_1765644433130.jpg';

    // Get image metadata
    const metadata = await sharp(inputPath).metadata();
    const width = metadata.width || 1024;
    const height = metadata.height || 1024;

    // Create rounded corners mask (22% of the smaller dimension for nice iOS-like corners)
    const cornerRadius = Math.min(width, height) * 0.22;

    const roundedCorners = Buffer.from(
        `<svg width="${width}" height="${height}">
            <rect x="0" y="0" width="${width}" height="${height}" rx="${cornerRadius}" ry="${cornerRadius}" fill="white"/>
        </svg>`
    );

    // Create rounded versions for each asset
    const assets = ['icon.png', 'adaptive-icon.png', 'favicon.png', 'splash-icon.png'];

    for (const asset of assets) {
        const outputPath = path.join(__dirname, 'assets', asset);

        await sharp(inputPath)
            .composite([{
                input: roundedCorners,
                blend: 'dest-in'
            }])
            .png()
            .toFile(outputPath);

        console.log(`✅ Updated: assets/${asset}`);
    }

    console.log('\n🎉 All icons updated with rounded corners!');
}

roundCorners().catch(console.error);
