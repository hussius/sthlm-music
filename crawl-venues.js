import dotenv from 'dotenv';
import { crawlAllVenues } from './dist/crawlers/venues/index.js';

dotenv.config({ path: '.env.local' });

console.log('🎸 Starting venue crawlers for 13 priority venues...\n');
console.log('Venues: Kollektivet Livet, Slaktkyrkan, Hus 7, Fasching, Nalen,');
console.log('        Fylkingen, Slakthuset, Fållan, Landet, Mosebacke,');
console.log('        Kägelbanan, Pet Sounds, Debaser\n');

try {
  const result = await crawlAllVenues();

  console.log('\n✅ All venue crawlers complete!');
  console.log(`📊 Total: ${result.success} events saved, ${result.failed} failed`);

  process.exit(0);
} catch (error) {
  console.error('❌ Venue crawling failed:', error);
  process.exit(1);
}
