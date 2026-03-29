/**
 * 创建测试数据脚本
 *
 * 这个脚本会通过 API 创建测试所需的 livestream 数据：
 * 1. 一个 public visibility 的直播
 * 2. 一个 member_only visibility 的直播
 */

import { JWTHelper } from '../helpers/jwt-helper';

const API_BASE_URL = 'http://localhost:8080';

interface LivestreamCreateRequest {
  title: string;
  visibility: 'public' | 'member_only';
}

interface LivestreamResponse {
  uuid: string;
  title: string;
  visibility: string;
  stream_key: string;
  owner_id: string;
}

async function createLivestream(
  data: LivestreamCreateRequest,
  token: string
): Promise<LivestreamResponse> {
  const response = await fetch(`${API_BASE_URL}/livestream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `token=${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to create livestream: ${response.status} ${errorText}`
    );
  }

  return await response.json();
}

async function getAllLivestreams(): Promise<LivestreamResponse[]> {
  const response = await fetch(`${API_BASE_URL}/livestream/one`, {
    method: 'GET',
  });

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  return [data];
}

async function deleteLivestream(uuid: string, token: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/livestream/${uuid}`, {
    method: 'DELETE',
    headers: {
      'Cookie': `token=${token}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    console.warn(`Failed to delete livestream ${uuid}: ${response.status}`);
  }
}

async function main() {
  console.log('🚀 Starting test data creation...');

  const jwtHelper = new JWTHelper();
  const adminToken = jwtHelper.generateAdminToken();

  try {
    // 1. 清理现有的测试数据（可选）
    console.log('📋 Checking existing livestreams...');
    const existingStreams = await getAllLivestreams();

    if (existingStreams.length > 0) {
      console.log(`Found ${existingStreams.length} existing livestreams`);
      for (const stream of existingStreams) {
        console.log(`  - Deleting: ${stream.title} (${stream.uuid})`);
        await deleteLivestream(stream.uuid, adminToken);
      }
    }

    // 2. 创建 public 直播
    console.log('\n📺 Creating PUBLIC livestream...');
    const publicStream = await createLivestream(
      {
        title: 'Test Public Stream',
        visibility: 'public',
      },
      adminToken
    );
    console.log('✅ Public livestream created:');
    console.log(`   UUID: ${publicStream.uuid}`);
    console.log(`   Title: ${publicStream.title}`);
    console.log(`   Stream Key: ${publicStream.stream_key}`);

    // 3. 创建 member_only 直播
    console.log('\n🔒 Creating MEMBER_ONLY livestream...');
    const memberStream = await createLivestream(
      {
        title: 'Test Member Only Stream',
        visibility: 'member_only',
      },
      adminToken
    );
    console.log('✅ Member-only livestream created:');
    console.log(`   UUID: ${memberStream.uuid}`);
    console.log(`   Title: ${memberStream.title}`);
    console.log(`   Stream Key: ${memberStream.stream_key}`);

    console.log('\n✨ Test data creation completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Public Stream: ${publicStream.uuid}`);
    console.log(`   - Member-Only Stream: ${memberStream.uuid}`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error creating test data:', error);
    process.exit(1);
  }
}

main();
