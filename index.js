const express = require('express');
const cors = require('cors');
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

const app = express();
app.use(cors());

app.get('/', (req, res) => {
  res.send('FlashScore API is running.');
});

app.get('/api/match', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing URL' });

  let browser;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });

    const data = await page.evaluate(() => {
      const title = document.querySelector('.tournamentHeader__country')?.innerText || 'No Title';
      const score = document.querySelector('.detailScore__wrapper')?.innerText || 'No Score';
      return { title, score };
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch score', details: error.message });
  } finally {
    if (browser) await browser.close();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
