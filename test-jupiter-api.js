/**
 * Quick test script for Jupiter API client
 * Run with: node test-jupiter-api.js
 */

import ky from 'ky';

const BASE_URL = 'https://datapi.jup.ag';

async function testJupiterAPI() {
  console.log('Testing Jupiter API client...\n');

  try {
    // Test 1: Get Meteora DBC token list (recent launches)
    console.log('1. Testing getGemsTokenList (Meteora DBC recent launches)...');
    const gemsResponse = await ky.post(`${BASE_URL}/v1/pools/gems`, {
      json: {
        recent: {
          timeframe: '24h',
          partnerConfigs: ['met-dbc'],
        },
      },
    }).json();

    console.log(`✓ Found ${gemsResponse.recent?.pools?.length || 0} recent Meteora DBC pools`);

    if (gemsResponse.recent?.pools?.length > 0) {
      const firstPool = gemsResponse.recent.pools[0];
      console.log(`  Example: ${firstPool.baseAsset.symbol} (${firstPool.baseAsset.name})`);
      console.log(`  Price: $${firstPool.baseAsset.usdPrice?.toFixed(6) || '0'}`);
      console.log(`  MCap: $${firstPool.baseAsset.mcap?.toFixed(0) || '0'}`);
      console.log(`  24h Vol: $${firstPool.volume24h?.toFixed(0) || '0'}`);
    }

    console.log('\n2. Testing graduating pools...');
    const graduatingResponse = await ky.post(`${BASE_URL}/v1/pools/gems`, {
      json: {
        aboutToGraduate: {
          timeframe: '24h',
          partnerConfigs: ['met-dbc'],
        },
      },
    }).json();

    console.log(`✓ Found ${graduatingResponse.aboutToGraduate?.pools?.length || 0} graduating pools`);

    console.log('\n3. Testing graduated pools...');
    const graduatedResponse = await ky.post(`${BASE_URL}/v1/pools/gems`, {
      json: {
        graduated: {
          timeframe: '24h',
          partnerConfigs: ['met-dbc'],
        },
      },
    }).json();

    console.log(`✓ Found ${graduatedResponse.graduated?.pools?.length || 0} graduated pools`);

    console.log('\n✅ All Jupiter API tests passed!');
    console.log('\nYou can now view the pools at: http://localhost:3000/analytics');

  } catch (error) {
    console.error('\n❌ Jupiter API test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response body:', await error.response.text().catch(() => 'Unable to read body'));
    }
    process.exit(1);
  }
}

testJupiterAPI();
