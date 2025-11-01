#!/usr/bin/env node

/**
 * Simple screenshot tool for MetaTools UI
 * Usage: node scripts/screenshot.js [url] [output-name]
 * Example: node scripts/screenshot.js http://localhost:3000 homepage
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function takeScreenshot(url = 'http://localhost:3000', name = 'screenshot') {
  console.log(`📸 Taking screenshot of ${url}...`);

  const browser = await puppeteer.launch({
    headless: false, // Set to true for headless mode
    defaultViewport: {
      width: 1920,
      height: 1080
    }
  });

  try {
    const page = await browser.newPage();

    // Navigate to the URL
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait a bit for any animations to complete
    await page.waitForTimeout(2000);

    // Create screenshots directory if it doesn't exist
    const screenshotDir = path.join(__dirname, '..', 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    // Take full page screenshot
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `${name}-${timestamp}.png`;
    const filepath = path.join(screenshotDir, filename);

    await page.screenshot({
      path: filepath,
      fullPage: true
    });

    console.log(`✅ Screenshot saved to: screenshots/${filename}`);
    console.log(`📂 Full path: ${filepath}`);

    // Also take viewport screenshot
    const viewportFilename = `${name}-viewport-${timestamp}.png`;
    const viewportFilepath = path.join(screenshotDir, viewportFilename);

    await page.screenshot({
      path: viewportFilepath,
      fullPage: false
    });

    console.log(`✅ Viewport screenshot saved to: screenshots/${viewportFilename}`);

  } catch (error) {
    console.error('❌ Error taking screenshot:', error.message);
  } finally {
    await browser.close();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const url = args[0] || 'http://localhost:3000';
const name = args[1] || 'screenshot';

takeScreenshot(url, name);