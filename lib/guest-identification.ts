// Server-side fingerprinting (only for use in API routes)
export async function generateGuestFingerprint(req: Request): Promise<{
  fingerprint: string;
  ipAddress: string;
}> {
  // Get headers from the request object
  const headers = req.headers;
  
  // Get IP address (handle proxy headers)
  const ipAddress = headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                    headers.get('x-real-ip') || 
                    headers.get('cf-connecting-ip') || // Cloudflare
                    'unknown';
  
  // Collect browser fingerprint data
  const userAgent = headers.get('user-agent') || '';
  const acceptLanguage = headers.get('accept-language') || '';
  const acceptEncoding = headers.get('accept-encoding') || '';
  const accept = headers.get('accept') || '';
  
  // Create a stable fingerprint
  const fingerprintData = [
    ipAddress,
    userAgent,
    acceptLanguage,
    acceptEncoding,
    accept
  ].join('|');
  
  // Use simple hash function for server side
  let hash = 0;
  for (let i = 0; i < fingerprintData.length; i++) {
    const char = fingerprintData.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  const fingerprint = Math.abs(hash).toString(36);
  
  return {
    fingerprint,
    ipAddress
  };
}

// Client-side fingerprinting for enhanced accuracy
export function getClientFingerprint(): string {
  if (typeof window === 'undefined') return '';
  
  const fingerprint = {
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    colorDepth: window.screen.colorDepth,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    platform: navigator.platform,
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    deviceMemory: (navigator as any).deviceMemory || 0,
    // Add canvas fingerprint for more uniqueness
    canvas: getCanvasFingerprint()
  };
  
  return btoa(JSON.stringify(fingerprint));
}

function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    
    ctx.textBaseline = 'top';
    ctx.font = '14px "Arial"';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('Canvas fingerprint', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Canvas fingerprint', 4, 17);
    
    return canvas.toDataURL();
  } catch {
    return '';
  }
}