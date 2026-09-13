const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 180 * 1024;
const MAX_DIMENSION = 640;

const loadImage = (url: string) => new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unable to process this image.'));
    image.src = url;
});

const canvasToBlob = (canvas: HTMLCanvasElement, quality: number) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', quality));

/** Makes a POS-ready image before its data URL is included in the product API. */
export const optimizeProductImage = async (file: File): Promise<string> => {
    if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.');
    if (file.size > MAX_SOURCE_BYTES) throw new Error('Please choose an image smaller than 10 MB.');
    const sourceUrl = URL.createObjectURL(file);
    try {
        const image = await loadImage(sourceUrl);
        const scale = Math.min(1, MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
        const width = Math.max(1, Math.round(image.naturalWidth * scale));
        const height = Math.max(1, Math.round(image.naturalHeight * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Your browser could not optimize this image.');
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
        for (const quality of [0.82, 0.72, 0.62, 0.52]) {
            const blob = await canvasToBlob(canvas, quality);
            if (blob && blob.size <= MAX_OUTPUT_BYTES) return await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result));
                reader.onerror = () => reject(new Error('Unable to save the optimized image.'));
                reader.readAsDataURL(blob);
            });
        }
        throw new Error('This image is too detailed to optimize. Please choose another image.');
    } finally { URL.revokeObjectURL(sourceUrl); }
};

export const PRODUCT_IMAGE_HELPER_TEXT = 'Images are optimized to WebP (max 640px / 180 KB) before saving.';
