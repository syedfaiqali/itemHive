import { useEffect, useState } from 'react';
import { getLuminance } from '@mui/material';

const plates = ['#ffffff', '#0f172a'] as const;
const cache = new Map<string, Promise<number[] | null>>();

const channel = (value: number) => {
    const v = value / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const hiddenShare = (solid: number[], background: number) =>
    solid.filter(luminance => contrast(luminance, background) < 1.6).length / solid.length;

// Luminance of the logo's solid pixels, or null when the logo is opaque (it carries its own background) or blank.
async function solidLuminances(src: string): Promise<number[] | null> {
    const image = new Image();
    image.src = src;
    await image.decode();
    const scale = Math.min(1, 160 / Math.max(image.naturalWidth, image.naturalHeight, 1));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return null;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    const solid: number[] = [];
    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] > 160) solid.push(0.2126 * channel(data[i]) + 0.7152 * channel(data[i + 1]) + 0.0722 * channel(data[i + 2]));
    }
    return solid.length && solid.length < (data.length / 4) * 0.95 ? solid : null;
}

/**
 * Plate color to put behind a logo when at least 10% of it nearly disappears on `background`, otherwise null.
 * Theme `candidates` are preferred so the plate blends in; white or dark slate are the fallbacks.
 */
export function pickLogoPlate(solid: number[] | null, background: string, candidates: readonly string[] = []): string | null {
    if (!solid?.length) return null;
    const hidden = (color: string) => hiddenShare(solid, getLuminance(color));
    if (hidden(background) < 0.1) return null;
    const options = [...candidates, ...plates];
    return options.find(color => hidden(color) < 0.1) ?? options.reduce((best, color) => hidden(color) < hidden(best) ? color : best);
}

export function useLogoPlate(src: string, background: string, candidates: readonly string[] = []): string | null {
    const [result, setResult] = useState<{ src: string; solid: number[] | null } | null>(null);
    useEffect(() => {
        let active = true;
        if (!cache.has(src)) {
            if (cache.size >= 4) cache.clear();
            cache.set(src, solidLuminances(src).catch(() => null));
        }
        void cache.get(src)!.then(solid => { if (active) setResult({ src, solid }); });
        return () => { active = false; };
    }, [src]);
    // Pixel analysis runs once per logo; background changes (e.g. live color previews) only re-score it.
    return result?.src === src ? pickLogoPlate(result.solid, background, candidates) : null;
}
