export const BANNER_MAX_WIDTH = 1000;
export const BANNER_MAX_HEIGHT = 320;
/**
 * ~300KB of image data. Well inside the backend's RECEIPT_BANNER_MAX_LENGTH and
 * its 3mb body cap, and still sharp at the size a banner prints.
 */
export const BANNER_MAX_DATA_URL_LENGTH = 420_000;

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
/** Formats with an alpha channel, which must stay PNG once rasterised. */
const TRANSPARENT_TYPES = ['image/png', 'image/svg+xml'];

const loadImage = (dataUrl: string) => new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('That file could not be read as an image.'));
    image.src = dataUrl;
});

const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
        const result = reader.result;
        if (typeof result === 'string') resolve(result);
        else reject(new Error('That file could not be read.'));
    };
    reader.onerror = () => reject(new Error('That file could not be read.'));
    reader.readAsDataURL(file);
});

/**
 * Reads a banner image, scales it down to printable dimensions and returns a
 * data URL small enough to store alongside the app settings. PNG sources keep
 * their transparency; everything else is re-encoded as JPEG.
 */
export const prepareBannerDataUrl = async (file: File): Promise<string> => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
        throw new Error('Please choose a PNG, JPEG, WEBP or SVG image.');
    }

    const sourceDataUrl = await readFileAsDataUrl(file);
    const image = await loadImage(sourceDataUrl);

    // An SVG without width/height attributes reports 0; fall back to the banner box.
    const sourceWidth = image.naturalWidth || image.width || BANNER_MAX_WIDTH;
    const sourceHeight = image.naturalHeight || image.height || BANNER_MAX_HEIGHT;

    const scale = Math.min(
        1,
        BANNER_MAX_WIDTH / sourceWidth,
        BANNER_MAX_HEIGHT / sourceHeight
    );
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));

    const render = (background?: string) => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('This browser could not process the image.');
        }
        if (background) {
            context.fillStyle = background;
            context.fillRect(0, 0, width, height);
        }
        context.drawImage(image, 0, 0, width, height);
        return canvas;
    };

    if (TRANSPARENT_TYPES.includes(file.type)) {
        const png = render().toDataURL('image/png');
        if (png.length <= BANNER_MAX_DATA_URL_LENGTH) return png;
    }

    // JPEG has no alpha, so anything transparent must be flattened onto white
    // first - drawing straight to a JPEG canvas turns transparency black.
    const flattened = render('#ffffff');
    for (const quality of [0.85, 0.7, 0.55]) {
        const jpeg = flattened.toDataURL('image/jpeg', quality);
        if (jpeg.length <= BANNER_MAX_DATA_URL_LENGTH) return jpeg;
    }

    throw new Error('That image is too large. Please use a smaller or simpler banner.');
};
