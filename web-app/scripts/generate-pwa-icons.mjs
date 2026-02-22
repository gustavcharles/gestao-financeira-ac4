import sharp from 'sharp';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const input = path.join(__dirname, '../public/logo.png');
const outputDir = path.join(__dirname, '../public');

const icons = [
    { name: 'pwa-192x192.png', size: 192, padding: 0 },
    { name: 'pwa-512x512.png', size: 512, padding: 0 },
    { name: 'apple-touch-icon.png', size: 180, padding: 0 },
    { name: 'favicon-32x32.png', size: 32, padding: 0 },
];

// Maskable icon: add ~10% padding with dark background for "safe zone"
async function generateMaskable(inputPath, outputPath, size) {
    const inner = Math.round(size * 0.8);
    const logo = await sharp(inputPath)
        .resize(inner, inner, { fit: 'contain', background: { r: 15, g: 23, b: 42, alpha: 1 } })
        .png()
        .toBuffer();

    await sharp({
        create: {
            width: size,
            height: size,
            channels: 4,
            background: { r: 15, g: 23, b: 42, alpha: 1 }, // #0f172a
        }
    })
        .composite([{ input: logo, gravity: 'centre' }])
        .png()
        .toFile(outputPath);
    console.log(`✅ ${outputPath}`);
}

async function main() {
    for (const { name, size } of icons) {
        const out = path.join(outputDir, name);
        await sharp(input)
            .resize(size, size, { fit: 'contain', background: { r: 15, g: 23, b: 42, alpha: 1 } })
            .png()
            .toFile(out);
        console.log(`✅ ${out}`);
    }

    await generateMaskable(
        input,
        path.join(outputDir, 'pwa-maskable-512x512.png'),
        512
    );
}

main().catch(err => { console.error(err); process.exit(1); });
