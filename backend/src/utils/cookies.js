export const parseCookies = (cookieHeader = '') => {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(';').reduce((cookies, cookiePart) => {
    const [rawName, ...rawValueParts] = cookiePart.trim().split('=');

    if (!rawName) {
      return cookies;
    }

    cookies[decodeURIComponent(rawName)] = decodeURIComponent(rawValueParts.join('='));

    return cookies;
  }, {});
};

export const serializeCookie = ({
  name,
  value,
  httpOnly = true,
  secure = false,
  sameSite = 'Lax',
  path = '/',
  maxAge,
}) => {
  const cookieParts = [
    `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
    `Path=${path}`,
    `SameSite=${sameSite}`,
  ];

  if (httpOnly) {
    cookieParts.push('HttpOnly');
  }

  if (secure) {
    cookieParts.push('Secure');
  }

  if (Number.isInteger(maxAge)) {
    cookieParts.push(`Max-Age=${maxAge}`);
  }

  return cookieParts.join('; ');
};
