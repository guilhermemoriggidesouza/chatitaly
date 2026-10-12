import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import { whatsSchedule as scheduleConfig } from '../config';

// Tira o print de UM elemento de uma página, com um Chromium sem tela. O
// navegador abre e fecha a cada captura: é pesado, então quem chama deve
// guardar a imagem em vez de capturar toda vez.
export async function captureElement(url: string, selector: string): Promise<Buffer> {
  if (!existsSync(scheduleConfig.chromePath)) {
    throw new Error(`Chromium não encontrado em ${scheduleConfig.chromePath} (defina CHROME_PATH)`);
  }

  const browser = await puppeteer.launch({
    executablePath: scheduleConfig.chromePath,
    headless: true,
    // Necessário dentro do container (sem sandbox do kernel e /dev/shm pequeno).
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    // Proporção de tela de celular; escala 2 = imagem com o dobro de pixels.
    await page.setViewport({ width: 540, height: 960, deviceScaleFactor: 2 });
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

    const element = await page.waitForSelector(selector, { timeout: 20000 });
    if (!element) throw new Error(`elemento ${selector} não apareceu em ${url}`);
    await page.evaluate(() => (globalThis as any).document.fonts.ready);

    return Buffer.from(await element.screenshot({ type: 'png' }));
  } finally {
    await browser.close();
  }
}
