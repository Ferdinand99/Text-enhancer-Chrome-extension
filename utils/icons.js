// Base64-encoded placeholder icon data
// This creates a blue square with white text as a temporary icon
export const iconData = {
    generateIcons: async () => {
        const canvas = new OffscreenCanvas(128, 128);
        const ctx = canvas.getContext('2d');

        // Background
        ctx.fillStyle = '#2563eb';
        ctx.fillRect(0, 0, 128, 128);

        // Text
        ctx.fillStyle = 'white';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('AI', 64, 64);

        // Generate different sizes
        const sizes = [16, 32, 48, 128];
        const icons = {};

        for (const size of sizes) {
            const sizedCanvas = new OffscreenCanvas(size, size);
            const sizedCtx = sizedCanvas.getContext('2d');
            sizedCtx.drawImage(canvas, 0, 0, size, size);
            const blob = await sizedCanvas.convertToBlob();
            icons[size] = URL.createObjectURL(blob);
        }

        return icons;
    }
};