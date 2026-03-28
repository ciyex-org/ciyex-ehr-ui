import type { NextApiRequest, NextApiResponse } from 'next';

// PDF generation now uses the browser's native print dialog (window.print())
// instead of server-side Puppeteer rendering. This endpoint is kept as a stub
// for backward compatibility but is no longer actively used.

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(410).json({
    success: false,
    message: 'This endpoint has been retired. PDF generation now uses the browser print dialog.',
  });
}
