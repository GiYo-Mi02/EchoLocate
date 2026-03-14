import "dotenv/config";

export default ({ config }) => {
  return {
    ...config,
    plugins: [
      ...config.plugins,
      [
        "@rnmapbox/maps",
        {
          "RNMapboxMapsDownloadToken": process.env.MAPBOX_SECRET_TOKEN || "YOUR_SECRET_TOKEN_HERE",
          "RNMapboxMapsVersion": "11.0.0"
        }
      ]
    ]
  };
};

