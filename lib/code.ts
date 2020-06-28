const code = (exports.CODE = {
  SERVER_ERROR: -1,
  //access token invalid related
  APP_SECRET_INVALID: 40001,
  ACCESS_TOKEN_INVALID: 40014,
  ACCESS_TOKEN_EXPIRED: 42001,
  ACCESS_TOKEN_REFRESH_NEEDED: 42007,
});

const accessTokenRelatedCodes = [
  code.APP_SECRET_INVALID,
  code.ACCESS_TOKEN_INVALID,
  code.ACCESS_TOKEN_EXPIRED,
  code.ACCESS_TOKEN_REFRESH_NEEDED,
];

/* istanbul ignore next  */
export function errorByAccessTokenRelated(errorCode: number): boolean {
  return accessTokenRelatedCodes.indexOf(errorCode) >= 0;
}
