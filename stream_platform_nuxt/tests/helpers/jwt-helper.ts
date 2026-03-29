import jwt from 'jsonwebtoken';

interface TokenPayload {
  user_id: string;
  username: string;
  avatar?: string;
  role: number;
  identity_provider: string;
  exp: number;
}

export class JWTHelper {
  private secretKey: string;

  constructor(secretKey: string = 'm6zr8Z1NL3ctUi2lcF8QEtZxI') {
    this.secretKey = secretKey;
  }

  generateToken(role: number, userId: string, username: string): string {
    const payload: TokenPayload = {
      user_id: userId,
      username: username,
      avatar: '',
      role: role,
      identity_provider: 'Origin',
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
    };

    return jwt.sign(payload, this.secretKey);
  }

  generateAdminToken(): string {
    return this.generateToken(0, 'test-admin', 'Test Admin');
  }

  generateEditorToken(userId?: string): string {
    const editorId = userId || 'test-editor';
    const username = userId ? `Editor ${userId}` : 'Test Editor';
    return this.generateToken(2, editorId, username);
  }

  generateUserToken(): string {
    return this.generateToken(3, 'test-user', 'Test User');
  }

  generateGuestToken(): string {
    return this.generateToken(4, 'test-guest', 'Test Guest');
  }
}
