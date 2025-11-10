// app.config.js
export default ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    GOOGLE_MAPS_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
  },
});
