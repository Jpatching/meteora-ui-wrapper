/**
 * Test Jupiter API without Meteora filter
 */

import ky from 'ky';

const BASE_URL = 'https://datapi.jup.ag';

async function testAllPools() {
  console.log('Testing Jupiter API (all launchpads)...\n');

  try {
    // Test with no filter to see all pools
    console.log('1. Testing recent launches (all launchpads)...');
    const gemsResponse = await ky.post(`${BASE_URL}/v1/pools/gems`, {
      json: {
        recent: {
          timeframe: '24h',
        },
      },
    }).json();

    console.log(`✓ Found ${gemsResponse.recent?.pools?.length || 0} recent pools`);

    if (gemsResponse.recent?.pools?.length > 0) {
      // Show first 5 pools with their launchpad info
      console.log('\nFirst 5 pools:');
      gemsResponse.recent.pools.slice(0, 5).forEach((pool, i) => {
        console.log(`  ${i + 1}. ${pool.baseAsset.symbol} - Launchpad: ${pool.baseAsset.launchpad || 'unknown'}`);
        console.log(`     Price: $${pool.baseAsset.usdPrice?.toFixed(6) || '0'} | MCap: $${(pool.baseAsset.mcap / 1000).toFixed(0)}K`);
      });

      // Count pools by launchpad
      const launchpadCounts = {};
      gemsResponse.recent.pools.forEach(pool => {
        const launchpad = pool.baseAsset.launchpad || 'unknown';
        launchpadCounts[launchpad] = (launchpadCounts[launchpad] || 0) + 1;
      });

      console.log('\nPools by launchpad:');
      Object.entries(launchpadCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([launchpad, count]) => {
          console.log(`  ${launchpad}: ${count}`);
        });
    }

    console.log('\n✅ Test completed!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
    }
    process.exit(1);
  }
}

testAllPools();
