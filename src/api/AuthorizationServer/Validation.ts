import * as utils from './utils';
import * as config from './Config';
import OAuth2Store, { AuthorizationCode, Client } from './OAuth2Store';

class Validation {
  store: OAuth2Store;
  constructor(store: OAuth2Store) {
    this.store = store;
  }

  user(user, password) {
    this.userExists(user);
    if (user.password !== password) {
      throw Error('User password does not match');
    }
    return user;
  }

  userExists(user) {
    if (user == null) {
      throw Error('User does not exist');
    }
    return user;
  }

  clientExists(client) {
    if (client == null) {
      throw Error('Client does not exist');
    }
    return client;
  }

  refreshToken(token, refreshToken, client) {
    utils.verifyToken(refreshToken, this.store.publicKey);
    if (client.id !== token.clientID) {
      throw Error('RefreshToken clientID does not match client id given');
    }
    return token;
  }

  authCode(
    code: string,
    authCode: AuthorizationCode,
    client: Client,
    redirectURI: string,
  ) {
    utils.verifyToken(code, this.store.publicKey);
    if (client.id !== authCode.clientId) {
      throw Error('AuthCode clientID does not match client id given');
    }
    if (redirectURI !== authCode.redirectURI) {
      throw Error('AuthCode redirectURI does not match redirectURI given');
    }
    return authCode;
  }

  isRefreshToken(authCode: AuthorizationCode) {
    return authCode != null && authCode.scope.indexOf('offline_access') === 0;
  }

  generateRefreshToken(authCode: AuthorizationCode) {
    const refreshToken = utils.createToken(
      this.store.privateKey,
      config.refreshToken.expiresIn,
      authCode.userId,
    );
    const expiration = config.token.calculateExpirationDate();
    return this.store.saveRefreshToken(
      refreshToken,
      expiration,
      authCode.clientId,
      authCode.userId,
      authCode.scope,
    ).token;
  }

  generateToken(authCode: AuthorizationCode) {
    const token = utils.createToken(
      this.store.privateKey,
      config.token.expiresIn,
      authCode.userId,
    );
    const expiration = config.token.calculateExpirationDate();
    return this.store.saveAccessToken(
      token,
      expiration,
      authCode.userId,
      authCode.clientId,
      authCode.scope,
    ).token;
  }

  generateTokens(authCode: AuthorizationCode) {
    if (this.isRefreshToken(authCode)) {
      return Promise.all([
        this.generateToken(authCode),
        this.generateRefreshToken(authCode),
      ]);
    }
    return Promise.all([this.generateToken(authCode)]);
  }

  tokenForHttp(token: string) {
    try {
      utils.verifyToken(token, this.store.publicKey);
    } catch (error) {
      throw Error('invalid_token');
    }
    let accessToken;
    accessToken = this.store.getAccessToken(token);
    if (!accessToken) {
      accessToken = this.store.getRefreshToken(token);
    }
    if (!accessToken) {
      throw Error('token not found');
    }
    return accessToken;
  }

  /**
   * Given a token this will return the token if it is not null. Otherwise this will throw a
   * HTTP error.
   * @param   {Object} token - The token to check
   * @throws  {Error}  If the client is null
   * @returns {Object} The client if it is a valid client
   */
  tokenExistsForHttp(token) {
    if (!token) {
      throw Error('invalid_token');
    }
    return token;
  }

  /**
   * Given a client this will return the client if it is not null. Otherwise this will throw a
   * HTTP error.
   * @param   {Object} client - The client to check
   * @throws  {Error}  If the client is null
   * @returns {Object} The client if it is a valid client
   */
  clientExistsForHttp(client) {
    if (!client) {
      throw Error('invalid_token');
    }
    return client;
  }
}

export default Validation;
