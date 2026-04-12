import { createHmac, randomBytes } from 'crypto'

export class CsrfHelper {
  private secretKey: string

  constructor(secretKey: string = 'm6zr8Z1NL3ctUi2lcF8QEtZxI') {
    this.secretKey = secretKey
  }

  generateToken(userID: string): string {
    const nonce = randomBytes(16).toString('hex')
    const data = `${nonce}:${userID}`
    const sig = createHmac('sha256', this.secretKey).update(data).digest('hex')
    return `${nonce}.${sig}`
  }
}
