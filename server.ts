import express from 'express';
import type { Request, Response } from 'express';
import path from 'node:path';
import fs from 'node:fs/promises';
import JSZip from 'jszip';
import { build as viteBuild, createServer as createViteServer } from 'vite';

const PORT = Number(process.env.PORT) || 3000;
const ROOT_DIR = process.cwd();
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const PUBLIC_HTACCESS = path.join(ROOT_DIR, 'public', '.htaccess');

async function addDirectoryToZip(zip: JSZip, dirPath: string, relativeBase = '') {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const zipPath = relativeBase ? `${relativeBase}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      await addDirectoryToZip(zip, fullPath, zipPath);
    } else if (entry.isFile()) {
      const content = await fs.readFile(fullPath);
      zip.file(zipPath, content);
    }
  }
}

async function startServer() {
  const app = express();

  // API Route: Build static bundle and stream a ready-to-upload IONOS ZIP package
  app.get('/api/export-ionos-zip', async (req: Request, res: Response) => {
    try {
      const rawBrand = typeof req.query.brand === 'string' ? req.query.brand : 'conference';
      const safeSlug = rawBrand
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'conference';

      // Trigger fresh Vite production static build with relative ./ asset base
      await viteBuild({
        root: ROOT_DIR,
        logLevel: 'silent',
      });

      const zip = new JSZip();
      await addDirectoryToZip(zip, DIST_DIR);

      // Explicitly ensure Apache .htaccess is present at ZIP root for IONOS Webspace
      const distHtaccess = path.join(DIST_DIR, '.htaccess');
      try {
        await fs.access(distHtaccess);
      } catch {
        try {
          const htaccessContent = await fs.readFile(PUBLIC_HTACCESS);
          zip.file('.htaccess', htaccessContent);
        } catch {
          // ignore if missing
        }
      }

      const zipBuffer = await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${safeSlug}-ionos-upload.zip"`
      );
      res.setHeader('Content-Length', String(zipBuffer.length));
      res.send(zipBuffer);
    } catch (error) {
      console.error('Failed to build IONOS ZIP package:', error);
      res.status(500).json({
        error: 'Unable to package static files for IONOS upload.',
      });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(DIST_DIR));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(DIST_DIR, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
