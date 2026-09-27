// Prints a page to a US Letter PDF with headless Chrome: your installed Chrome locally,
// @sparticuz/chromium on Vercel.
import puppeteer, { type Page } from 'puppeteer-core';

const PAGE_HEIGHT_PX = 11 * 96; // US Letter at 96 CSS px per inch

// Unpacked once per instance: concurrent requests unpacking at the same time can run a half-written binary.
let executablePath: Promise<string> | undefined;

async function launchBrowser() {
  if (!process.env.VERCEL) return puppeteer.launch({ channel: 'chrome', headless: true });
  const { default: chromium } = await import('@sparticuz/chromium');
  executablePath ??= chromium.executablePath();
  return puppeteer.launch({
    args: await puppeteer.defaultArgs({ args: chromium.args, headless: 'shell' }),
    executablePath: await executablePath,
    headless: 'shell',
  });
}

// `load` puts the resume on the page. overflowPx > 0 means it no longer fits on one page.
export async function printPdf(load: (page: Page) => Promise<unknown>) {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await load(page);
    await page.emulateMediaType('print');
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    const height = await page.evaluate(() => document.querySelector('.resume')?.scrollHeight ?? 0);
    if (!height) throw new Error('The resume did not render');
    const pdf = await page.pdf({ format: 'letter', printBackground: true, preferCSSPageSize: true });
    return { pdf: Buffer.from(pdf), overflowPx: Math.max(0, height - PAGE_HEIGHT_PX) };
  } finally {
    await browser.close();
  }
}
