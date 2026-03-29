/**
 * 准备测试环境脚本
 *
 * 由于后端只支持单个 livestream，我们将：
 * 1. 为每个测试文件设置合适的 livestream visibility
 * 2. 提供切换 visibility 的辅助函数
 */

import { JWTHelper } from '../helpers/jwt-helper';

const API_BASE_URL = 'http://localhost:8080';

interface LivestreamUpdateRequest {
  uuid: string;
  title?: string;
  visibility?: 'public' | 'member_only';
  information?: string;
  name?: string;
}

async function getCurrentLivestream(): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/livestream/one`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Failed to get livestream: ${response.status}`);
  }

  return await response.json();
}

async function updateLivestream(
  data: LivestreamUpdateRequest,
  token: string
): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/livestream/${data.uuid}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `token=${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to update livestream: ${response.status} ${errorText}`
    );
  }

  return await response.json();
}

async function createLivestreamIfNotExists(token: string): Promise<any> {
  try {
    // 尝试获取现有直播
    const existing = await getCurrentLivestream();
    console.log('✅ Found existing livestream:', existing.uuid);
    return existing;
  } catch (error) {
    // 如果不存在，创建新直播
    console.log('📺 Creating new livestream...');
    const response = await fetch(`${API_BASE_URL}/livestream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${token}`,
      },
      body: JSON.stringify({
        title: 'Test Stream',
        visibility: 'public',
        name: '',
        information: '',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create livestream: ${response.status} ${errorText}`);
    }

    const created = await response.json();
    console.log('✅ Created new livestream');
    return created;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const visibility = args[0] as 'public' | 'member_only' | undefined;

  console.log('🚀 Preparing test environment...');

  const jwtHelper = new JWTHelper();
  const adminToken = jwtHelper.generateAdminToken();

  try {
    // 确保存在一个 livestream
    await createLivestreamIfNotExists(adminToken);

    // 如果指定了 visibility，更新它
    if (visibility) {
      console.log(`\n🔧 Setting livestream visibility to: ${visibility}`);
      const current = await getCurrentLivestream();

      await updateLivestream(
        {
          uuid: current.uuid,
          visibility: visibility,
          title: current.title,
          name: current.name || '',
          information: current.information || '',
        },
        adminToken
      );

      console.log(`✅ Updated visibility to: ${visibility}`);
    }

    // 验证当前状态
    const final = await getCurrentLivestream();
    console.log('\n📊 Current livestream status:');
    console.log(`   UUID: ${final.uuid}`);
    console.log(`   Title: ${final.title}`);
    console.log(`   Visibility: ${final.visibility}`);

    console.log('\n✨ Test environment ready!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error preparing test environment:', error);
    process.exit(1);
  }
}

main();
