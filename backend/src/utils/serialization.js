export const toPlainObject = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value.toObject === 'function') {
    return value.toObject({
      depopulate: true,
    });
  }

  return value;
};

export const serializeId = (value) => {
  if (!value) {
    return null;
  }

  return value.toString();
};

export const serializeIdArray = (values = []) => values.map((value) => serializeId(value));

export const serializeDate = (value) => {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString();
};
