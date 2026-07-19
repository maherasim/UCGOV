/**
 * Resizes/compresses a captured photo client-side before upload — shared by every
 * in-app camera capture (secretary attendance selfies, case-proceeding party photos)
 * so file sizes and quality stay consistent across the app.
 */
export function compressPhoto(file, maxDimension = 640, quality = 0.72) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Could not read the photo.'));
        reader.onload = () => {
            img.onerror = () => reject(new Error('Could not process the photo.'));
            img.onload = () => {
                const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
                const canvas = document.createElement('canvas');
                canvas.width = Math.round(img.width * scale);
                canvas.height = Math.round(img.height * scale);
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                canvas.toBlob(
                    (blob) => (blob ? resolve(blob) : reject(new Error('Could not compress the photo.'))),
                    'image/jpeg',
                    quality
                );
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
}
