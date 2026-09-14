const net = require('node:net');

function publicOrigin(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/\.$/, '');
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error();
    if (!host.includes('.') || net.isIP(host) || host.startsWith('[') || /(^|\.)(localhost|local|internal|test|invalid)$/.test(host)) throw new Error();
    return url.origin;
  } catch {
    const error = new Error('Convite externo indisponível: publique esta base e configure PUBLIC_APP_URL com o endereço HTTPS público do mesmo serviço.');
    error.code = 'PUBLIC_URL_REQUIRED';
    throw error;
  }
}
module.exports = { publicOrigin };
