#!/usr/bin/env node
import dotenv from 'dotenv';
import { spawn } from 'child_process';

dotenv.config({ path: '.env.local' });

console.log('🎸 Stockholm Music Events Crawler');
console.log('==================================\n');

// --- TS crawlers (imported from compiled dist/) ---
async function runTsCrawlers() {
  const tsCrawlers = [
    { name: 'Ticketmaster API', fn: async () => (await import('./dist/crawlers/ticketmaster.js')).crawlTicketmaster() },
    { name: 'AXS', fn: async () => (await import('./dist/crawlers/axs.js')).crawlAXS() },
    { name: 'DICE', fn: async () => (await import('./dist/crawlers/dice.js')).crawlDICE() },
  ];

  let successCount = 0;
  let failedCount = 0;

  for (const crawler of tsCrawlers) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📍 ${crawler.name}`);
    console.log('='.repeat(60));
    try {
      const result = await crawler.fn();
      console.log(`\n✅ ${crawler.name} complete (${result.success} saved, ${result.failed} failed)`);
      successCount++;
    } catch (err) {
      console.error(`\n❌ ${crawler.name} failed:`, err.message);
      failedCount++;
    }
  }

  return { successCount, failedCount };
}

// --- JS crawlers (spawned as subprocesses) ---
const crawlers = [
  { name: 'Stadsgårdsterminalen (Kollektivet Livet)', file: './crawl-stadsgarden.js' },
  { name: 'Debaser', file: './crawl-debaser-fixed.js' },
  { name: 'Fylkingen', file: './crawl-fylkingen-fixed.js' },
  { name: 'Slakthusen (all venues)', file: './crawl-slakthusen.js' },
  { name: 'Fasching', file: './crawl-fasching.js' },
  { name: 'Pet Sounds', file: './crawl-petsounds.js' },
  { name: 'Nalen', file: './crawl-nalen.js' },
  { name: 'Fållan', file: './crawl-fallan.js' },
  { name: 'Södra Teatern', file: './crawl-sodrateatern.js' },
  { name: 'Rönnells Antikvariat', file: './crawl-ronnells.js' },
  { name: 'Banan-Kompaniet', file: './crawl-banan-kompaniet.js' },
  { name: 'Berns', file: './crawl-berns.js' },
  { name: 'Cirkus', file: './crawl-cirkus.js' },
  { name: 'Stampen', file: './crawl-stampen.js' },
  { name: 'Gamla Enskede Bryggeri', file: './crawl-gamla-enskede-bryggeri.js' },
  { name: 'Reimersholme', file: './crawl-reimersholme.js' },
  { name: 'Rosettas', file: './crawl-rosettas.js' },
  { name: 'Slakthusetclub', file: './crawl-slakthusetclub.js' },
  { name: 'Gröna Lund', file: './crawl-gronalund.js' },
  { name: 'Geronimos FGT', file: './crawl-geronimosfgt.js' },
  { name: 'Konserthuset', file: './crawl-konserthuset.js' },
  { name: 'Fredagsmangel', file: './crawl-fredagsmangel.js' },
  { name: 'Göta Lejon', file: './crawl-gotalejon.js' },
  { name: 'B-K', file: './crawl-bk.js' },
  { name: 'Rival', file: './crawl-rival.js' },
  { name: 'Under Bron', file: './crawl-underbron-fixed.js' },
];

function runCrawler(crawler) {
  return new Promise((resolve) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📍 ${crawler.name}`);
    console.log('='.repeat(60));

    const startTime = Date.now();
    const child = spawn('node', [crawler.file], {
      stdio: 'inherit',
      env: { ...process.env }
    });

    child.on('close', (code) => {
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      if (code === 0) {
        console.log(`\n✅ ${crawler.name} complete (${duration}s)`);
        resolve({ success: true });
      } else {
        console.error(`\n❌ ${crawler.name} failed with code ${code} (${duration}s)`);
        resolve({ success: false });
      }
    });

    child.on('error', (error) => {
      console.error(`\n❌ ${crawler.name} error:`, error.message);
      resolve({ success: false });
    });
  });
}

// Run TS crawlers first
const tsResult = await runTsCrawlers();
let successCount = tsResult.successCount;
let failedCount = tsResult.failedCount;

// Then JS crawlers
for (const crawler of crawlers) {
  const result = await runCrawler(crawler);
  if (result.success) {
    successCount++;
  } else {
    failedCount++;
  }
}

const total = 3 + crawlers.length; // 3 TS + JS crawlers
console.log('\n' + '='.repeat(60));
console.log('📊 CRAWL SUMMARY');
console.log('='.repeat(60));
console.log(`Successful crawlers: ${successCount}/${total}`);
console.log(`Failed crawlers: ${failedCount}/${total}`);
console.log('\n✅ All crawlers complete!\n');
