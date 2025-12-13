const sharp = require('sharp');
const path = require('path');

async function createSplashScreen() {
    const logoPath = 'C:/Users/Admin/.gemini/antigravity/brain/b3fc751d-33a0-47be-9b8d-20da799527c9/uploaded_image_1765644433130.jpg';
    const outputPath = path.join(__dirname, 'assets', 'splash.png');

    // Create a tall splash image (1284x2778 for iPhone 15 Pro Max resolution)
    const width = 1284;
    const height = 2778;
    const logoSize = 200;
    const cornerRadius = logoSize * 0.22;

    // First, process the logo with rounded corners
    const roundedLogo = await sharp(logoPath)
        .resize(logoSize, logoSize, { fit: 'cover' })
        .composite([{
            input: Buffer.from(
                `<svg width="${logoSize}" height="${logoSize}">
                    <rect x="0" y="0" width="${logoSize}" height="${logoSize}" rx="${cornerRadius}" ry="${cornerRadius}" fill="white"/>
                </svg>`
            ),
            blend: 'dest-in'
        }])
        .png()
        .toBuffer();

    // Create the splash screen with white background, logo in center, and app name
    const textY = Math.floor(height / 2) + logoSize / 2 + 30;

    await sharp({
        create: {
            width: width,
            height: height,
            channels: 4,
            background: { r: 255, g: 255, b: 255, alpha: 1 }
        }
    })
        .composite([
            {
                input: roundedLogo,
                top: Math.floor((height - logoSize) / 2) - 40,
                left: Math.floor((width - logoSize) / 2)
            },
            {
                // Add "myZyea" text below logo
                input: Buffer.from(
                    `<svg width="${width}" height="100">
                    <text x="${width / 2}" y="60" 
                          text-anchor="middle" 
                          font-family="Arial, sans-serif" 
                          font-size="48" 
                          font-weight="bold"
                          fill="#f97316">myZyea</text>
                </svg>`
                ),
                top: Math.floor(height / 2) + logoSize / 2 - 20,
                left: 0
            }
        ])
        .png()
        .toFile(outputPath);

    console.log('✅ Created splash.png - white background with centered logo and "myZyea" text!');
}

createSplashScreen().catch(console.error);
