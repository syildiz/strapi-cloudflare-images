# Strapi Provider Upload Cloudflare Images

[![npm version](https://img.shields.io/npm/v/strapi-provider-upload-cloudflare-images.svg)](https://www.npmjs.com/package/strapi-provider-upload-cloudflare-images)
[![npm downloads](https://img.shields.io/npm/dm/strapi-provider-upload-cloudflare-images.svg)](https://www.npmjs.com/package/strapi-provider-upload-cloudflare-images)

A production-ready Strapi upload provider for [Cloudflare Images](https://developers.cloudflare.com/images/) that allows you to upload media files directly to Cloudflare's global CDN network with flexible variant support.

## Features

- ✅ **Upload media files** to Cloudflare Images
- ✅ **Delete files** from Cloudflare Images when removed from Strapi
- ✅ **Flexible variants** - Use any variant configuration from frontend
- ✅ **Automatic optimization** and resizing via Cloudflare
- ✅ **Global CDN delivery** with fast loading times
- ✅ **Clean URLs** without unwanted parameters
- ✅ **Metadata support** for comprehensive file information
- ✅ **Thumbnail generation** with Strapi 5 compatibility
- ✅ **Production ready** with error handling and logging

## Installation

```bash
npm install strapi-provider-upload-cloudflare-images
# or
yarn add strapi-provider-upload-cloudflare-images
```

## Configuration

### 1. Get your Cloudflare credentials

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Copy your **Account ID** from the right sidebar
3. Go to "My Profile" > "API Tokens" 
4. Create a new token with **Cloudflare Images:Edit** permissions
5. Copy your **Account Hash** from the Images tab URL (e.g., `https://dash.cloudflare.com/{account_id}/images/images`)

### 2. Configure the provider

Add the following to your `config/plugins.js` or `config/plugins.ts`:

```typescript
export default ({ env }) => ({
  upload: {
    config: {
      provider: 'strapi-provider-upload-cloudflare-images',
      providerOptions: {
        accessToken: env('CLOUDFLARE_ACCESS_TOKEN'),
        accountId: env('CLOUDFLARE_ACCOUNT_ID'),
        imagesDomain: env('CLOUDFLARE_IMAGES_DOMAIN'),
        requireSignedURLs: false,
      },
      sizeLimit: 512 * 1024 * 1024, // 512MB
      responsiveDimensions: false,
      breakpoints: {},
      generateResponsiveFormats: false,
      preserveExtensions: true,
      acceptedTypes: [
        'image/jpeg', 'image/jpg', 'image/jpe', 'image/png', 
        'image/webp', 'image/gif', 'image/svg+xml', 'image/avif', 'image/bmp'
      ],
    },
  },
});
```

### 3. Configure Security Middleware

Add Cloudflare domains to your Content Security Policy in `config/middlewares.js` or `config/middlewares.ts`:

```typescript
export default [
  // ... other middlewares
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:'],
          'img-src': [
            "'self'",
            'data:',
            'blob:',
            'market-assets.strapi.io',
            'imagedelivery.net',
            '*.imagedelivery.net',
          ],
          'media-src': [
            "'self'",
            'data:',
            'blob:',
            'market-assets.strapi.io',
            'imagedelivery.net',
            '*.imagedelivery.net',
          ],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  // ... other middlewares
];
```

### 4. Environment variables

Add these to your `.env` file:

```env
CLOUDFLARE_ACCESS_TOKEN=your_cloudflare_access_token
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
CLOUDFLARE_IMAGES_DOMAIN=https://imagedelivery.net/your_account_hash_here
```

## Usage

Once configured, the provider will automatically:

- Upload files to Cloudflare Images when you upload media in Strapi
- Delete files from Cloudflare Images when you delete them in Strapi
- Store comprehensive metadata including flexible variant examples
- Generate thumbnails compatible with Strapi 5

### Accessing uploaded files

Uploaded files will have the following structure:

```json
{
  "url": "https://imagedelivery.net/{account_hash}/{image_id}",
  "formats": {
    "thumbnail": {
      "url": "https://imagedelivery.net/{account_hash}/{image_id}/width=245,height=156,fit=contain,quality=85",
      "width": 245,
      "height": 156
    }
  },
  "provider_metadata": {
    "cloudflare_id": "unique-cloudflare-id",
    "uploaded_at": "2024-01-01T00:00:00.000Z",
    "filename": "original-filename.jpg",
    "base_url": "https://imagedelivery.net/{account_hash}/{image_id}",
    "images_domain": "https://imagedelivery.net/{account_hash}",
    "account_hash": "your_account_hash",
    "flexible_examples": {
      "webp": "https://imagedelivery.net/{account_hash}/{image_id}/format=webp",
      "quality": "https://imagedelivery.net/{account_hash}/{image_id}/quality=85",
      "resize": "https://imagedelivery.net/{account_hash}/{image_id}/width=800,height=600,fit=cover",
      "combined": "https://imagedelivery.net/{account_hash}/{image_id}/format=webp,quality=85,width=800,height=600,fit=cover",
      "thumbnail": "https://imagedelivery.net/{account_hash}/{image_id}/width=245,height=156,fit=cover,quality=85",
      "mobile": "https://imagedelivery.net/{account_hash}/{image_id}/format=webp,width=640,quality=85,fit=scale-down",
      "desktop": "https://imagedelivery.net/{account_hash}/{image_id}/format=webp,width=1920,quality=85,fit=scale-down"
    }
  }
}
```

### Flexible Variants Usage

The provider stores flexible variant examples in metadata. You can use any combination of Cloudflare Images transformations:

```javascript
// Basic image
const imageUrl = file.provider_metadata.base_url;

// WebP format
const webpUrl = `${file.provider_metadata.base_url}/format=webp`;

// Resized image
const resizedUrl = `${file.provider_metadata.base_url}/width=800,height=600,fit=cover`;

// Combined transformations
const optimizedUrl = `${file.provider_metadata.base_url}/format=webp,quality=85,width=800,height=600,fit=cover`;

// Or use the pre-defined examples
const mobileUrl = file.provider_metadata.flexible_examples.mobile;
const desktopUrl = file.provider_metadata.flexible_examples.desktop;
```

## Configuration Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `accessToken` | string | Yes | - | Cloudflare API token with Images:Edit permission |
| `accountId` | string | Yes | - | Cloudflare account ID |
| `imagesDomain` | string | Yes | - | Your Cloudflare Images domain with account hash |
| `requireSignedURLs` | boolean | No | `false` | Whether to require signed URLs for image access |

## Advanced Features

### Clean URLs
The provider ensures clean URLs without unwanted parameters that could degrade image quality. URLs are protected from Strapi's automatic parameter addition.

### Flexible Variants
Instead of fixed variants, the provider stores flexible examples that can be used from the frontend with any Cloudflare Images transformation parameters.

### Error Handling
Comprehensive error handling with detailed logging for debugging and monitoring.

### Strapi 5 Compatibility
Full compatibility with Strapi 5's media handling, including proper thumbnail generation.

## Supported Image Formats

- JPEG/JPG
- PNG
- WebP
- GIF
- SVG
- AVIF
- BMP

## Troubleshooting

### Images not showing in Strapi admin
Make sure you've configured the security middleware correctly to allow Cloudflare Images domains.

### Upload failures
Check your Cloudflare API token permissions and account ID. Enable debug logging to see detailed error messages.

### Clean URLs not working
The provider automatically prevents URL parameter pollution. Make sure you're using the latest version.

## Changelog

### v1.0.7
- Updated README with complete configuration examples
- Added middleware configuration for Content Security Policy
- Enhanced documentation with flexible variants usage examples
- Added troubleshooting section
- Production-ready release with comprehensive documentation

### v1.0.6
- Added flexible variants support
- Improved clean URL handling
- Added Strapi 5 compatibility
- Enhanced error handling and logging
- Added comprehensive metadata structure

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License

## Related

- [Cloudflare Images Documentation](https://developers.cloudflare.com/images/)
- [Cloudflare Images Transformations](https://developers.cloudflare.com/images/transform-images/)
- [Strapi Upload Providers](https://docs.strapi.io/dev-docs/providers)
- [Strapi Plugin Development](https://docs.strapi.io/dev-docs/plugins-development)
