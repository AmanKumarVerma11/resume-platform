// The publish command's renderer: builds the page HTML directly (no server needed) and prints it.
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Resume } from '../components/Resume';
import { printPdf } from '../lib/chrome';
import type { Renderer } from '../lib/publish';
import { baseUrl } from '../lib/site';

const escapeHtml = (text: string) =>
  text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

// Same component and CSS as the web page. Fonts are inlined, so Chrome needs nothing else.
export const renderWithHtml: Renderer = (content, slug, version) => {
  const fonts = readFileSync('styles/fonts.css', 'utf8').replace(
    /url\('\/fonts\/([^']+)'\)/g,
    (_, font) => `url(data:font/ttf;base64,${readFileSync(`public/fonts/${font}`).toString('base64')})`,
  );
  const css = readFileSync('styles/resume.css', 'utf8');
  const base = baseUrl();
  const body = renderToStaticMarkup(
    createElement(Resume, { data: content, href: (key) => `${base}/go/${slug}/${version}/${key}` }),
  );
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(content.basics.name)} – Resume</title><style>${fonts}${css}</style></head><body>${body}</body></html>`;
  return printPdf((page) => page.setContent(html, { waitUntil: 'load' }));
};
