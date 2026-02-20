/**
 * Index verification script using EXPLAIN ANALYZE
 *
 * Verifies PostgreSQL is using indexes correctly for common queries:
 * - Date range queries use date_idx (B-tree)
 * - Genre queries use genre_idx (B-tree)
 * - Artist search uses idx_events_artist_trgm (GIN trigram)
 * - Event name search uses idx_events_name_trgm (GIN trigram)
 *
 * Flags sequential scans which indicate poor performance.
 *
 * Usage: npm run verify:indexes
 */

import { db } from '../db/client.js';
import { sql } from 'drizzle-orm';

type QueryTest = {
  name: string;
  query: string;
  expectedIndex: string;
  description: string;
};

const QUERIES: QueryTest[] = [
  {
    name: 'Date Range Query',
    query: `SELECT * FROM events WHERE date >= NOW() AND date <= NOW() + INTERVAL '1 month' ORDER BY date LIMIT 20`,
    expectedIndex: 'date_idx',
    description: 'Should use B-tree index on date column',
  },
  {
    name: 'Genre Filter Query',
    query: `SELECT * FROM events WHERE genre = 'rock' LIMIT 20`,
    expectedIndex: 'genre_idx',
    description: 'Should use B-tree index on genre column',
  },
  {
    name: 'Artist Text Search',
    query: `SELECT * FROM events WHERE artist ILIKE '%metal%' LIMIT 20`,
    expectedIndex: 'idx_events_artist_trgm',
    description: 'Should use GIN trigram index for ILIKE pattern matching',
  },
  {
    name: 'Event Name Search',
    query: `SELECT * FROM events WHERE name ILIKE '%live%' LIMIT 20`,
    expectedIndex: 'idx_events_name_trgm',
    description: 'Should use GIN trigram index for ILIKE pattern matching',
  },
];

/**
 * Parse EXPLAIN ANALYZE output to check for index usage
 */
function analyzeQueryPlan(plan: string, expectedIndex: string): {
  usesIndex: boolean;
  usesSeqScan: boolean;
  indexName: string | null;
  details: string;
} {
  const planText = plan.toLowerCase();

  // Check for sequential scan (bad)
  const usesSeqScan = planText.includes('seq scan');

  // Check for index scan (good)
  const usesIndexScan = planText.includes('index scan') || planText.includes('bitmap index scan');

  // Try to extract index name
  let indexName: string | null = null;
  const indexMatch = planText.match(/index scan using (\w+)/);
  if (indexMatch) {
    indexName = indexMatch[1];
  } else {
    const bitmapMatch = planText.match(/bitmap index scan on (\w+)/);
    if (bitmapMatch) {
      indexName = bitmapMatch[1];
    }
  }

  // Check if correct index is used
  const usesExpectedIndex = indexName === expectedIndex.toLowerCase();

  return {
    usesIndex: usesIndexScan && usesExpectedIndex,
    usesSeqScan,
    indexName,
    details: plan,
  };
}

/**
 * Run index verification tests
 */
async function verifyIndexes(): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('INDEX VERIFICATION - EXPLAIN ANALYZE');
  console.log('='.repeat(60) + '\n');

  let allPassed = true;
  const results: Array<{
    name: string;
    passed: boolean;
    reason: string;
  }> = [];

  for (const test of QUERIES) {
    console.log(`Testing: ${test.name}`);
    console.log(`Query: ${test.query}`);
    console.log(`Expected: ${test.expectedIndex}`);
    console.log('');

    try {
      // Run EXPLAIN ANALYZE
      const result = await db.execute(sql.raw(`EXPLAIN ANALYZE ${test.query}`));

      // Parse result - drizzle returns array directly
      const planLines = (result as any[]).map((row: any) => row['QUERY PLAN']).join('\n');
      const analysis = analyzeQueryPlan(planLines, test.expectedIndex);

      let passed = true;
      let reason = '';

      if (analysis.usesSeqScan) {
        passed = false;
        reason = `⚠️  WARNING: Sequential scan detected (poor performance)`;
      } else if (!analysis.usesIndex) {
        passed = false;
        reason = `✗ FAIL: Expected index '${test.expectedIndex}' not used`;
        if (analysis.indexName) {
          reason += ` (used '${analysis.indexName}' instead)`;
        }
      } else {
        reason = `✓ PASS: Using ${test.expectedIndex}`;
      }

      results.push({ name: test.name, passed, reason });
      console.log(reason);
      console.log('');

      if (!passed) {
        allPassed = false;
        console.log('Query Plan:');
        console.log(analysis.details);
        console.log('');
      }
    } catch (error) {
      console.error(`Error running query: ${error}`);
      results.push({
        name: test.name,
        passed: false,
        reason: `✗ ERROR: ${error}`,
      });
      allPassed = false;
      console.log('');
    }
  }

  // Summary
  console.log('='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60) + '\n');

  results.forEach((result) => {
    console.log(`${result.name}: ${result.reason}`);
  });

  const passedCount = results.filter((r) => r.passed).length;
  console.log(`\n${passedCount}/${results.length} tests passed\n`);

  if (!allPassed) {
    console.log('❌ Index verification failed');
    console.log('\nRecommendations:');
    console.log('  1. Ensure database migrations have been run: npm run db:migrate');
    console.log('  2. Check that GIN trigram indexes exist (02-02 migration)');
    console.log('  3. Verify PostgreSQL pg_trgm extension is enabled');
    console.log('  4. Consider running ANALYZE to update query planner statistics');
    process.exit(1);
  }

  console.log('✓ All indexes verified successfully!');
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  verifyIndexes()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nIndex verification failed:', error);
      process.exit(1);
    });
}
