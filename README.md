# LocalStack Webpack Sync

This plugin provides a way to automatically sync your Webpack Builds into an S3 Bucket for use with LocalStack Cloudfront
Distributions.

Usage:

```js
const LocalStackWebpackSync = require("localstack-webpack-sync").default;

module.exports = () => ({
  plugins: [
    new LocalStackWebpackSync({
      bucket: "bucket-name", // (You can also pass in `/bucket\-name/` for regex matching instead)
    })
  ],
    
  devServer: {
    open: true,
    allowedHosts: [".cloudfront.localhost.localstack.cloud"], // This allows CloudFront to poll the webpack info socket to know when to reload
    https: true // If you've set CloudFront to only accept https, it'll also attempt to hit the webpack info socket through https
  }
});
```

Options:

| Name   | Type          | Description                                                                                                                                                                                                               |
|--------|---------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| bucket | string/RegExp | The plugin will use the S3 Client to list all buckets in LocalStack and try to find a bucket matching this name. If you pass in a regular expression, it will fetch the first bucket that matches that regular expression |
