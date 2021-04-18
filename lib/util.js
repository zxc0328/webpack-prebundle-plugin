const omit = (obj, keys) => {
  let newObj = {};
  Object.keys(obj)
    .filter((k) => !keys.includes(k))
    .forEach((k) => {
      newObj[k] = obj[k];
    });

  return newObj;
};

module.exports = {
  omit,
};
