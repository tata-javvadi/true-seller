import jsQR from 'jsqr';

export function extractUpiId(payload: string): string | null {
  const decoded = (() => {
    try { return decodeURIComponent(payload); } catch { return payload; }
  })();
  const params = decoded.includes('?') ? new URLSearchParams(decoded.slice(decoded.indexOf('?') + 1)) : null;
  const address = params?.get('pa') ?? params?.get('vpa');
  if (address && /^[\w.-]{2,256}@[\w.-]{2,64}$/.test(address.trim())) return address.trim();
  return decoded.match(/[\w.-]{2,256}@[\w.-]{2,64}/)?.[0] ?? null;
}

export async function decodeQrImage(file: File): Promise<string | null> {
  let bitmap: ImageBitmap | null = null;
  let image: HTMLImageElement | null = null;
  let objectUrl: string | null = null;
  try {
    if (typeof createImageBitmap === 'function') bitmap = await createImageBitmap(file);
    else {
      objectUrl = URL.createObjectURL(file);
      image = new Image();
      image.src = objectUrl;
      await image.decode();
    }
    const source = bitmap ?? image;
    if (!source) return null;
    const scale = Math.min(1, 1800 / Math.max(source.width, source.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(source.width * scale);
    canvas.height = Math.round(source.height * scale);
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return null;
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    return jsQR(pixels.data, pixels.width, pixels.height, { inversionAttempts: 'attemptBoth' })?.data ?? null;
  } finally {
    bitmap?.close();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}
