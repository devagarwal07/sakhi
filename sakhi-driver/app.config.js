module.exports = ({ config }) => {
  return {
    ...config,
    android: {
      ...config.android,
      config: {
        ...(config.android?.config || {})
      }
    }
  };
};
