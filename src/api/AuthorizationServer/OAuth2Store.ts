import { createUuid } from "./utils"

class AuthorizationCode {
  code: string
  clientId: string
  redirectURI: string
  userId: string
  scope: string[]

  constructor(
    code: string,
    clientId: string,
    redirectURI: string,
    userId: string,
    scope: string[]
  ) {
    this.code = code
    this.clientId = clientId
    this.redirectURI = redirectURI
    this.userId = userId
    this.scope = scope
  }
}
class AccessToken {
  token: string
  expiration: Date
  userId?: string
  clientId?: string
  scope?: string[]
  constructor(
    token: string,
    expiration: Date,
    userId: string,
    clientId: string,
    scope: string[]
  ) {
    this.token = token
    this.expiration = expiration
    this.userId = userId
    this.clientId = clientId
    this.scope = scope
  }
}

class Client {
  id: string
  private secret: string
  scope: string[]
  trusted: boolean
  constructor(id: string, secret: string, scope: string[] = [], trusted: boolean = false) {
    this.id = id
    this.secret = secret
    this.scope = scope
    this.trusted = trusted
  }

  updateSecret(secret: string) {
    this.secret = secret
  }

  public get Secret() : string {
    return this.secret
  }

  validate(secret: string) {
    if (this.secret != secret) {
      throw Error('secret does not match')
    }
  }
}

class User {
  id: string
  username: string
  private password: string
  scope: string[]
  trusted: boolean
  constructor(id: string, username: string, password: string, scope: string[] = [], trusted: boolean = false) {
    this.id = id
    this.username = username
    this.password = password
    this.scope = scope
    this.trusted = trusted
  }

  updatePassword(password: string) {
    this.password = password
  }

  public get Password() : string {
    return this.password
  }


  validate(password: string) {
    if (this.password != password) {
      throw Error('password does not match')
    }
  }
}

class OAuth2Store {
  accessCodeStore: Map<string, AuthorizationCode>
  accessTokenStore: Map<string, AccessToken>
  refreshTokenStore: Map<string, AccessToken>
  clientStore: Map<string, Client>
  userStore: Map<string, User>

  publicKey: string
  privateKey: string

  constructor(publicKey: string, privateKey: string) {
    this.accessCodeStore = new Map()
    this.accessTokenStore = new Map()
    this.refreshTokenStore = new Map()
    this.clientStore = new Map()
    this.userStore = new Map()

    this.publicKey = publicKey
    this.privateKey = privateKey
  }

  ////////////////////////
  // Authorization Code //
  ////////////////////////
  hasAuthorizationCode(code: string): boolean {
    return this.accessCodeStore.has(code)
  }

  getAuthorizationCode(code: string): AuthorizationCode {
    if (!this.accessCodeStore.has(code)) {
      throw Error('authorization code does not exist')
    }
    return this.accessCodeStore.get(code)!
  }

  saveAuthorizationCode(
    code: string,
    clientId: string,
    redirectURI: string, userId: string,
    scope: string[]
  ): void {
    this.accessCodeStore.set(code, new AuthorizationCode(code, clientId, redirectURI, userId, scope))
  }

  deleteAuthorizationCode(
    code: string
  ): AuthorizationCode {
    const ac = this.getAuthorizationCode(code)
    this.accessCodeStore.delete(code)
    return ac
  }

  ///////////////////
  // Access Tokens //
  ///////////////////
  hasAccessToken(token: string): boolean {
    return this.accessTokenStore.has(token)
  }

  getAccessToken(token: string): AccessToken {
    if (!this.accessTokenStore.has(token)) {
      throw Error('access token does not exist')
    }
    return this.accessTokenStore.get(token)!
  }

  saveAccessToken(
    token: string,
    expiration: Date,
    userId: string,
    clientId: string,
    scope: string[] = []
  ): AccessToken {
    this.accessTokenStore.set(token, new AccessToken(token, expiration, userId, clientId, scope))
    return this.accessTokenStore.get(token)!
  }

  deleteAccessToken(
    token: string
  ): AccessToken {
    const at = this.getAccessToken(token)
    this.accessTokenStore.delete(token)
    return at
  }

  ////////////////////
  // Refresh Tokens //
  ////////////////////
  hasRefreshToken(token: string): boolean {
    return this.refreshTokenStore.has(token)
  }

  getRefreshToken(token: string): AccessToken {
    if (!this.refreshTokenStore.has(token)) {
      throw Error('refresh token does not exist')
    }
    return this.refreshTokenStore.get(token)!
  }

  saveRefreshToken(
    token: string,
    expiration: Date,
    userId: string,
    clientId: string,
    scope: string[] = []
  ): AccessToken {
    this.refreshTokenStore.set(token, new AccessToken(token, expiration, userId, clientId, scope))
    return this.refreshTokenStore.get(token)!
  }

  deleteRefreshToken(
    token: string
  ): AccessToken {
    const rt = this.getRefreshToken(token)
    this.refreshTokenStore.delete(token)
    return rt
  }

  /////////////
  // Clients //
  /////////////
  hasClient(id: string): boolean {
    return this.clientStore.has(id)
  }

  getClient(id: string): Client {
    if (!this.clientStore.has(id)) {
      throw Error('client does not exist')
    }
    return this.clientStore.get(id)!
  }

  saveClient(
    id: string = createUuid(),
    secret: string,
    scope?: string[],
    trusted?: boolean
  ): void {
    this.clientStore.set(id, new Client(id, secret, scope, trusted))
  }

  updateClient(
    id: string,
    secret?: string,
    scope?: string[],
    trusted?: boolean
  ): void {
    const client = this.getClient(id)
    if (secret) {
      client.updateSecret(secret)
    }
    if (scope) {
      client.scope = scope
    }
    if (trusted) {
      client.trusted = trusted
    }
    this.clientStore.set(client.id, client)
  }

  deleteClient(
    id: string
  ): Client {
    const client = this.getClient(id)
    this.clientStore.delete(id)
    return client
  }

  //////////
  // User //
  //////////
  hasUser(id: string): boolean {
    return this.userStore.has(id)
  }

  getUser(id: string): User {
    if (!this.userStore.has(id)) {
      throw Error('user does not exist')
    }
    return this.userStore.get(id)!
  }

  findUserByUsername(username: string): User {
    const values = Array.from(this.userStore.values())
    if (values.findIndex((v, i) => v.username == username) == -1) {
      throw Error('user does not exist')
    }
    return values.find((v, i) => v.username == username)!
  }

  saveUser(
    id: string = createUuid(),
    username: string,
    password: string,
    scope?: string[],
    trusted?: boolean
  ): void {
    this.userStore.set(id, new User(id, username, password, scope, trusted))
  }

  updateUser(
    username: string,
    password?: string,
    scope?: string[],
    trusted?: boolean
  ): void {
    const user = this.findUserByUsername(username)
    if (password) {
      user.updatePassword(password)
    }
    if (scope) {
      user.scope = scope
    }
    if (trusted) {
      user.trusted = trusted
    }
    this.userStore.set(user.id, user)
  }

  deleteUser(
    id: string
  ): User {
    const user = this.getUser(id)
    this.userStore.delete(id)
    return user
  }
}

export default OAuth2Store
export { AuthorizationCode, AccessToken, Client, User }
