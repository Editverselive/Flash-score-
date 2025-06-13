const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());

app.get('/', (req, res) => {
  res.send('FlashScore API Live ✅');
});

// ➔ GET All Live Cricket Matches Summary
app.get('/api/all-matches', async (req, res) => {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.goto('https://www.flashscore.in/cricket/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    const matches = await page.evaluate(() => {
      const games = [];
      document.querySelectorAll('.event__match--live').forEach(match => {
        const id = match.getAttribute('id')?.replace('g_', '') || '';
        const home = match.querySelector('.event__participant--home')?.innerText.trim();
        const away = match.querySelector('.event__participant--away')?.innerText.trim();
        const scoreHome = match.querySelector('.event__score--home')?.innerText || '';
        const scoreAway = match.querySelector('.event__score--away')?.innerText || '';
        const time = match.querySelector('.event__stage--block')?.innerText || '';
        if (home && away) {
          games.push({
            matchId: id,
            home, away,
            scoreHome, scoreAway,
            time,
            url: `https://www.flashscore.in/match/${id}/#/match-summary`
          });
        }
      });
      return games;
    });

    await browser.close();
    res.json(matches);
  } catch (error) {
    res.status(500).json({ error: 'Failed to scrape live matches', details: error.toString() });
  }
});

// ➔ GET Single Match Detailed Summary by URL
app.get('/api/match', async (req, res) => {
  const matchUrl = req.query.url;
  if (!matchUrl) return res.status(400).json({ error: 'Provide ?url= parameter' });

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.goto(matchUrl, { waitUntil: 'networkidle2', timeout: 60000 });

    const data = await page.evaluate(() => {
      const teams = [...document.querySelectorAll('.participant__participantName')].map(el => el.innerText);
      const scores = [...document.querySelectorAll('.detailScore__score')].map(el => el.innerText);
      const status = document.querySelector('.smg__status')?.innerText || '';
      return { teams, scores, status };
    });

    await browser.close();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch score', details: err.toString() });
  }
});

app.listen(PORT, () => console.log(`Running on ${PORT}`));
