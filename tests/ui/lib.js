// Shared helpers for the UI test scripts.
const fs = require('fs');

const BASE_URL = (process.env.BASE_URL || 'http://127.0.0.1:8080').replace(/\/$/, '');
const PAGES_URL = BASE_URL + '/pages/';
const API_PORT = Number(process.env.MOCK_API_PORT || 5000);

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  ].filter(Boolean);
  const found = candidates.find(p => fs.existsSync(p));
  if (!found) {
    console.error('Chrome/Edge not found. Set CHROME_PATH to your browser executable.');
    process.exit(2);
  }
  return found;
}

async function launch() {
  const puppeteer = require('puppeteer-core');
  return puppeteer.launch({
    executablePath: findChrome(),
    headless: 'new',
    args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
  });
}

/** fake signed-in customer used only against the local mock API */
const TEST_USER = { _id: 'u1', id: 'u1', name: 'Test User', firstName: 'Test', lastName: 'User', email: 'test@example.com', phone: '9876543210', role: 'admin' };

async function seedStorage(page, { auth, storage } = {}) {
  await page.goto(PAGES_URL + 'reset-password.html', { waitUntil: 'domcontentloaded' });   // tiny same-origin page
  await page.evaluate((auth, storage, user) => {
    if (auth) {
      localStorage.setItem('nansai_token', 'test-token-local');
      localStorage.setItem('nansai_user', JSON.stringify(user));
    }
    Object.keys(storage || {}).forEach(k => localStorage.setItem(k, JSON.stringify(storage[k])));
  }, !!auth, storage || null, TEST_USER);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

module.exports = { BASE_URL, PAGES_URL, API_PORT, launch, seedStorage, sleep, TEST_USER };
