const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

async function splitImageVertically(inputPath, outputDir = './output', customNames = null) {
    try {
        const inputPathNew  = `./images/${documentId}/${inputPath}`;
        //console.log("############>>>",  inputPathNew)
        //console.log("############>>>",  outputDir)

        if (!fs.existsSync(inputPathNew)) {
            throw new Error(`Input file not found: ${inputPathNew}`);
        }

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }  

        const metadata = await sharp(inputPathNew).metadata();
        
        if (metadata.format !== 'png') {
            throw new Error('Only PNG files are supported');
        }
        console.log('OUTPUT DIR >>>>> ', outputDir)
        const { width, height } = metadata;
        const halfWidth = Math.floor(width / 2);

        console.log(`Original image: ${width}x${height}`);
        console.log(`Left part: ${halfWidth}x${height}`);
        console.log(`Right part: ${width - halfWidth}x${height}`);

        const baseName = path.basename(inputPathNew, '.png');
        
        const leftName = customNames?.left || `${baseName}_left.png`;
        const rightName = customNames?.right || `${baseName}_right.png`;

        // Process both halves in parallel
        await Promise.all([
            // Left half
            sharp(inputPathNew)
                .extract({ left: 0, top: 0, width: halfWidth, height: height })
                .png()
                .toFile(path.join(outputDir, leftName)),
            
            // Right half
            sharp(inputPathNew)
                .extract({ left: halfWidth, top: 0, width: width - halfWidth, height: height })
                .png()
                .toFile(path.join(outputDir, rightName))
        ]);

        console.log('✅  Image successfully split vertically into 2 pieces');
        console.log(`  Left: ${path.join(outputDir, leftName)}`);
        console.log(`  Right: ${path.join(outputDir, rightName)}`);

        return {
            left: path.join(outputDir, leftName),
            right: path.join(outputDir, rightName),
            originalDimensions: { width, height },
            splitDimensions: {
                left: { width: halfWidth, height },
                right: { width: width - halfWidth, height }
            }
        };

    } catch (error) {
        console.error('❌  Error splitting image:', error.message);
        throw error;
    }
}

// Batch processing multiple images
const documentId = '94f35af9-b482-48fc-bcd3-57d6c84dc359';

async function splitMultipleImagesVertically(imagePaths, outputDir = `./images/${documentId}/output`) {
    const results = [];
    //console.log("############",  imagePaths)
    //console.log("############",  outputDir)
    for (const imagePath of imagePaths) { 
        console.log(`\nProcessing: ${imagePath}`);
        try {
            const result = await splitImageVertically(imagePath, outputDir);
            results.push(result);
        } catch (error) {
            console.error(`Failed to process ${imagePath}:`, error.message);
        }
    }
    
    return results;
}
/*
// Example usage with custom names
// splitImageVertically('image.png', './output', {
//     left: 'custom_left.png',
//     right: 'custom_right.png'
// });

// Example for multiple images

splitMultipleImagesVertically(['page-3.png', 'page-4.png', 'page-5.png', 'page-6.png', 'page-7.png', 'page-8.png', 'page-9.png', 'page-10.png', 'page-11.png', 'page-12.png', 'page-13.png', 'page-14.png', 'page-15.png', 'page-16.png', 'page-17.png', 'page-18.png', 'page-19.png', 'page-20.png', 'page-21.png', 'page-22.png', 'page-23.png', 'page-24.png'], `./images/${documentId}/output` ); // './output'


// Command line interface
if (process.argv.length > 2) {
    const inputPath = `./images/${documentId}/${process.argv[2]}`;
    const outputDir = process.argv[3] || './output';

    // Check if input is a directory or single file
    if (fs.existsSync(inputPath)) {
        if (fs.statSync(inputPath).isDirectory()) {
            // Process all PNG files in directory
            const files = fs.readdirSync(inputPath)
                .filter(file => file.toLowerCase().endsWith('.png'))
                .map(file => path.join(inputPath, file));
            
            if (files.length > 0) {
                splitMultipleImagesVertically(files, outputDir);
            } else {
                console.log('No PNG files found in the specified directory');
            }
        } else {
            // Single file
            splitImageVertically(inputPath, outputDir);
        }
    } else {
        console.log('Input path does not exist');
    }
} else {
    //console.log('Usage: node splitImageVertical.js <input-image.png|directory> [output-directory]');
    //console.log('Examples:');
    //console.log('  node splitImageVertical.js image.png ./output');
    //console.log('  node splitImageVertical.js ./images ./split-output');
}
*/

  
 
const inputDir = `./images/${documentId}`;      // <-- put your PNG images here
const outputDir = `./thumbnails/${documentId}`; // output folder for thumbnails

(async () => {
  try {
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

    const files = fs.readdirSync(inputDir)
      .filter(file => file.toLowerCase().endsWith(".png")); // PNG only

    for (const file of files) {
      const inputPath = path.join(inputDir, file);
      const outputPath = path.join(outputDir, file);

      await sharp(inputPath)
        .resize({ width: 200 }) // ✅ max width 200px, keeps aspect ratio
        .toFile(outputPath);

      console.log(`✅ Thumbnail created: ${outputPath}`);
    }

    console.log("All thumbnails generated successfully!");
  } catch (err) {
    console.error("Error:", err);
  }
})();