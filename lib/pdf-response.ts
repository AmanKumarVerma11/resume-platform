import type { VersionDoc } from './db';

export function pdfResponse(version: VersionDoc) {
  const fileName = `${version.content.basics.name.replace(/\s+/g, '_')}_Resume.pdf`;
  return new Response(new Uint8Array(version.pdf.value()), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
}
