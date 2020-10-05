/* eslint-disable @typescript-eslint/no-var-requires */
const { AuthorizationCode } = require('simple-oauth2');
const fetch = require('node-fetch');

let cachedOAuthMeta = null;

const sanitizeMigMeta = (migMeta) => {
  const oauthCopy = { ...migMeta.oauth };
  delete oauthCopy.clientSecret;
  return { ...migMeta, oauth: oauthCopy };
};

const getOAuthMeta = async (migMeta) => {
  if (cachedOAuthMeta) {
    return cachedOAuthMeta;
  }
  const oAuthMetaUrl = `${migMeta.clusterApi}/.well-known/oauth-authorization-server`;
  const res = await fetch(oAuthMetaUrl).then((res) => res.json());
  cachedOAuthMeta = res;
  return cachedOAuthMeta;
};

const getClusterAuth = async (migMeta) => {
  const oAuthMeta = await getOAuthMeta(migMeta);
  return new AuthorizationCode({
    client: {
      id: migMeta.oauth.clientId,
      secret: migMeta.oauth.clientSecret,
    },
    auth: {
      tokenHost: oAuthMeta.token_endpoint,
      authorizePath: oAuthMeta.authorization_endpoint,
    },
  });
};

module.exports = {
  sanitizeMigMeta,
  getClusterAuth,
};
