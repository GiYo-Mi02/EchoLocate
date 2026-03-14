import "dotenv/config";

export default ({ config }) => {
  return {
    ...config,
    plugins: [
      ...config.plugins,
      "@rnmapbox/maps"
    ]
  };
};

