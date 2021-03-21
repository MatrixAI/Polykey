const token = {
  expiresIn: 60 * 60,
  calculateExpirationDate: () => new Date(Date.now() + 60 * 60 * 1000),
};

const refreshToken = {
  expiresIn: 52560000,
};

export { token, refreshToken };
