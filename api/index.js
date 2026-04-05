import app from '../server/src/full-server.mjs';

function getRoutedUrl(req) {
  const parsed = new URL(req.url, 'http://localhost');
  const routedPath = parsed.searchParams.get('__path');
  if (routedPath === null) return req.url;

  parsed.searchParams.delete('__path');
  const search = parsed.searchParams.toString();
  const normalizedPath = routedPath ? `/${routedPath}` : '/';
  return `${normalizedPath}${search ? `?${search}` : ''}`;
}

export default function handler(req, res) {
  req.url = getRoutedUrl(req);
  return app(req, res);
}

