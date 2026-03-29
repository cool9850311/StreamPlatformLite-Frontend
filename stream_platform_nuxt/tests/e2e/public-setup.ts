import { test as setup } from '@playwright/test';
import { JWTHelper } from '../helpers/jwt-helper';

const API_BASE_URL = 'http://localhost:8080';

setup('switch livestream to public', async ({}) => {
  console.log('\n📺 Switching livestream to PUBLIC...\n');

  const jwtHelper = new JWTHelper();
  const adminToken = jwtHelper.generateAdminToken();

  try {
    // Get current livestream with admin token
    const response = await fetch(`${API_BASE_URL}/livestream/one`, {
      method: 'GET',
      headers: {
        'Cookie': `token=${adminToken}`,
      },
    });

    let livestream;
    if (!response.ok) {
      // No livestream exists, create one
      console.log('📺 Creating new PUBLIC livestream...');
      const createResponse = await fetch(`${API_BASE_URL}/livestream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `token=${adminToken}`,
        },
        body: JSON.stringify({
          title: 'E2E Test Stream',
          visibility: 'public',
          name: '',
          information: 'Livestream for E2E testing',
        }),
      });

      if (!createResponse.ok) {
        const error = await createResponse.text();
        throw new Error(`Failed to create livestream: ${createResponse.status} ${error}`);
      }

      livestream = await createResponse.json();
      console.log('✅ PUBLIC livestream created');
      console.log('\n✨ Setup completed!\n');
      return;
    }

    livestream = await response.json();
    console.log(`📋 Current livestream: ${livestream.uuid}`);
    console.log(`   Visibility: ${livestream.visibility}`);

    // Update to public
    if (livestream.visibility !== 'public') {
      console.log('🔧 Updating visibility to PUBLIC...');
      const updateResponse = await fetch(`${API_BASE_URL}/livestream/${livestream.uuid}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `token=${adminToken}`,
        },
        body: JSON.stringify({
          uuid: livestream.uuid,
          title: livestream.title,
          name: livestream.name || '',
          information: livestream.information || '',
          visibility: 'public',
        }),
      });

      if (!updateResponse.ok) {
        const error = await updateResponse.text();
        throw new Error(`Failed to update livestream: ${updateResponse.status} ${error}`);
      }

      console.log('✅ Visibility set to PUBLIC');
    } else {
      console.log('✅ Livestream is already PUBLIC');
    }

    console.log('\n✨ Setup completed!\n');
  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    throw error;
  }
});
