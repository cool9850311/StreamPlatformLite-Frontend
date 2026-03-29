import { JWTHelper } from '../helpers/jwt-helper';

const API_BASE_URL = 'http://localhost:8080';

export default async function globalSetup() {
  console.log('\n🚀 Global Setup: Resetting test environment...\n');

  const jwtHelper = new JWTHelper();
  const adminToken = jwtHelper.generateAdminToken();

  try {
    // Step 1: Check if livestream exists
    const checkResponse = await fetch(`${API_BASE_URL}/livestream/one`, {
      method: 'GET',
      headers: {
        'Cookie': `token=${adminToken}`,
      },
    });

    // Step 2: Delete existing livestream if present (clean slate)
    if (checkResponse.ok) {
      const livestream = await checkResponse.json();
      console.log(`🗑️  Deleting existing livestream: ${livestream.uuid}`);

      const deleteResponse = await fetch(`${API_BASE_URL}/livestream/${livestream.uuid}`, {
        method: 'DELETE',
        headers: {
          'Cookie': `token=${adminToken}`,
        },
      });

      if (deleteResponse.ok) {
        console.log('✅ Existing livestream deleted');
      } else {
        console.warn(`⚠️  Failed to delete livestream: ${deleteResponse.status}`);
      }

      // Wait a bit for deletion to propagate
      await new Promise(resolve => setTimeout(resolve, 500));
    } else {
      console.log('ℹ️  No existing livestream found');
    }

    // Step 3: Verify deletion
    const verifyResponse = await fetch(`${API_BASE_URL}/livestream/one`, {
      method: 'GET',
      headers: {
        'Cookie': `token=${adminToken}`,
      },
    });

    if (verifyResponse.ok) {
      const stillExists = await verifyResponse.json();
      console.warn(`⚠️  Livestream still exists after deletion: ${stillExists.uuid}`);
      console.warn(`   Visibility: ${stillExists.visibility}`);
      console.warn(`   This may affect admin-manage-tests`);
    } else {
      console.log('✅ Database is clean (no livestream exists)');
    }

    console.log('\n📋 Test Execution Order:');
    console.log('   1️⃣  admin-manage-tests → Tests create/delete functionality');
    console.log('   2️⃣  setup-public → Creates PUBLIC livestream');
    console.log('   3️⃣  public-stream-tests → Tests public stream access');
    console.log('   4️⃣  setup-member-only → Switches to MEMBER_ONLY');
    console.log('   5️⃣  member-only-stream-tests → Tests member-only access');

    console.log('\n✨ Global setup completed!\n');
  } catch (error) {
    console.error('\n❌ Global setup failed:', error);
    throw error;
  }
}
