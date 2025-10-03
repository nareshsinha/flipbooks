const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function splitImageHorizontally(inputPath, outputDir = './output', customNames = null) {
    try {
        if (!fs.existsSync(inputPath)) {
            throw new Error(`Input file not found: ${inputPath}`);
        }

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const metadata = await sharp(inputPath).metadata();
        
        if (metadata.format !== 'png') {
            throw new Error('Only PNG files are supported');
        }

        const { width, height } = metadata;
        const halfHeight = Math.floor(height / 2);

        const baseName = path.basename(inputPath, '.png');
        
        const topName = customNames?.top || `${baseName}_top.png`;
        const bottomName = customNames?.bottom || `${baseName}_bottom.png`;

        // Process both halves in parallel
        await Promise.all([
            sharp(inputPath)
                .extract({ left: 0, top: 0, width, height: halfHeight })
                .png()
                .toFile(path.join(outputDir, topName)),
            
            sharp(inputPath)
                .extract({ left: 0, top: halfHeight, width, height: height - halfHeight })
                .png()
                .toFile(path.join(outputDir, bottomName))
        ]);

        console.log('✓ Image successfully split into 2 pieces');
        console.log(`  Top: ${topName}`);
        console.log(`  Bottom: ${bottomName}`);

    } catch (error) {
        console.error('✗ Error splitting image:', error.message);
    }
}

// Example with custom names

splitImageHorizontally('page-3.png', './output', {
    top: 'page-4.png',
    bottom: 'page-5.png'
});

// Use command line or modify as needed
if (process.argv.length > 2) {
//    splitImageHorizontally(process.argv[2], process.argv[3]);
console.log("I AM HERE");
}