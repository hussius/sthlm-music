/**
 * Load testing script for Events API
 *
 * Tests all filter types under load:
 * - Basic pagination
 * - Genre filtering
 * - Date range filtering
 * - Venue filtering
 * - Artist search
 * - Event search
 * - Combined filters
 *
 * Configuration:
 * - 100 concurrent connections
 * - 30 second duration
 * - Tests multiple query patterns
 *
 * Performance targets:
 * - Average latency < 200ms (PASS)
 * - p95 latency < 300ms (acceptable)
 * - p99 latency < 500ms (acceptable)
 *
 * Usage:
 * 1. Start server: npm run dev
 * 2. Run load test: npm run test:load
 *
 * NOTE: Requires autocannon package. Install with:
 * npm install --save-dev autocannon @types/autocannon
 */

import autocannon from 'autocannon';

const BASE_URL = 'http://localhost:3000';

/**
 * Run load test against Events API
 */
async function runLoadTest(): Promise<void> {
  console.log('\nStarting Events API Load Test...');
  console.log('Configuration:');
  console.log('  - URL:', BASE_URL);
  console.log('  - Connections: 100 concurrent');
  console.log('  - Duration: 30 seconds');
  console.log('  - Scenarios: 7 query patterns\n');

  const result = await autocannon({
    url: BASE_URL,
    connections: 100,
    duration: 30,
    title: 'Events API Load Test',
    requests: [
      // Basic pagination
      {
        method: 'GET',
        path: '/api/events?limit=20',
      },
      // Genre filter
      {
        method: 'GET',
        path: '/api/events?genre=rock&limit=20',
      },
      // Date range filter
      {
        method: 'GET',
        path: '/api/events?dateFrom=2024-03-01T00:00:00Z&dateTo=2024-03-31T23:59:59Z&limit=20',
      },
      // Venue filter
      {
        method: 'GET',
        path: '/api/events?venue=Debaser%20Strand&limit=20',
      },
      // Artist search (trigram index)
      {
        method: 'GET',
        path: '/api/events?artistSearch=metal&limit=20',
      },
      // Event search (trigram index)
      {
        method: 'GET',
        path: '/api/events?eventSearch=live&limit=20',
      },
      // Combined filters
      {
        method: 'GET',
        path: '/api/events?genre=electronic&dateFrom=2024-06-01T00:00:00Z&limit=20',
      },
    ],
  });

  // Print results
  console.log('\n' + '='.repeat(60));
  console.log('LOAD TEST RESULTS');
  console.log('='.repeat(60) + '\n');

  autocannon.printResult(result);

  // Check performance targets
  console.log('\n' + '='.repeat(60));
  console.log('PERFORMANCE TARGET VALIDATION');
  console.log('='.repeat(60) + '\n');

  const avgLatency = result.latency.mean;
  const p95Latency = result.latency.p95;
  const p99Latency = result.latency.p99;

  const avgPass = avgLatency < 200;
  const p95Pass = p95Latency < 300;
  const p99Pass = p99Latency < 500;

  console.log(`Average Latency: ${avgLatency.toFixed(2)}ms`);
  console.log(`  Target: < 200ms`);
  console.log(`  Status: ${avgPass ? '✓ PASS' : '✗ FAIL'}\n`);

  console.log(`p95 Latency: ${p95Latency.toFixed(2)}ms`);
  console.log(`  Target: < 300ms`);
  console.log(`  Status: ${p95Pass ? '✓ PASS' : '✗ FAIL'}\n`);

  console.log(`p99 Latency: ${p99Latency.toFixed(2)}ms`);
  console.log(`  Target: < 500ms`);
  console.log(`  Status: ${p99Pass ? '✓ PASS' : '✗ FAIL'}\n`);

  console.log(`Total Requests: ${result.requests.total}`);
  console.log(`Requests/sec: ${result.requests.average.toFixed(2)}`);
  console.log(`Errors: ${result.errors}`);

  // Exit with error if targets not met
  if (!avgPass || !p95Pass || !p99Pass) {
    console.log('\n❌ Performance targets not met');
    process.exit(1);
  }

  console.log('\n✓ All performance targets met!');
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  runLoadTest()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nLoad test failed:', error.message);
      console.error('\nTroubleshooting:');
      console.error('  1. Ensure server is running: npm run dev');
      console.error('  2. Check server is accessible at http://localhost:3000');
      console.error('  3. Verify database is seeded: npm run seed:test');
      process.exit(1);
    });
}
