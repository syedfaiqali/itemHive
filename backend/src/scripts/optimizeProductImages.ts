import mongoose from 'mongoose';
import sharp from 'sharp';
import connectDB from '../config/db';
import Product from '../models/Product';

const MAX_STORED_BYTES = 180 * 1024;
const APPLY = process.argv.includes('--apply');

const optimize = async (dataUrl: string) => {
    const match = dataUrl.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) return null;
    const input = Buffer.from(match[2], 'base64');
    if (input.length <= MAX_STORED_BYTES && match[1] === 'webp') return null;

    for (const quality of [82, 72, 62, 52]) {
        const output = await sharp(input, { failOn: 'none' })
            .rotate()
            .resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true })
            .webp({ quality })
            .toBuffer();
        if (output.length <= MAX_STORED_BYTES) return `data:image/webp;base64,${output.toString('base64')}`;
    }
    return undefined;
};

const run = async () => {
    await connectDB();
    if (mongoose.connection.readyState !== 1) throw new Error('MongoDB connection was not established.');

    console.log('Scanning existing product images...');
    const cursor = Product.find({ imageUrl: { $regex: /^data:image\// } })
        .select('_id id name imageUrl')
        .lean()
        .cursor();
    let optimized = 0;
    let skipped = 0;
    let failed = 0;
    let total = 0;

    for await (const product of cursor) {
        total++;
        try {
            const result = await optimize(product.imageUrl || '');
            if (result === null) { skipped++; continue; }
            if (!result) {
                skipped++;
                console.warn(`Skipped ${product.id} (${product.name}): could not reach the safe size.`);
                continue;
            }
            if (APPLY) await Product.updateOne({ _id: product._id }, { $set: { imageUrl: result, lastUpdated: new Date() } });
            optimized++;
        } catch (error) {
            failed++;
            console.warn(`Failed ${product.id} (${product.name}): ${error instanceof Error ? error.message : 'unknown error'}`);
        }
    }

    console.log(`${APPLY ? 'Updated' : 'Would update'} ${optimized}; skipped ${skipped}; failed ${failed}; total data-URL images ${total}.`);
    if (!APPLY) console.log('Dry run only. To write optimized copies: npm run migrate:product-images -- --apply');
    await mongoose.disconnect();
};

run().catch(async (error) => {
    console.error(error instanceof Error ? error.message : error);
    await mongoose.disconnect();
    process.exitCode = 1;
});
