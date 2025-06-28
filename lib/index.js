'use strict';

const FormData = require('form-data');
const fetch = require('node-fetch');

module.exports = {
  init(config) {
    const { 
      accessToken, 
      accountId, 
      imagesDomain = 'https://imagedelivery.net',
      requireSignedURLs = false
    } = config;

    if (!accessToken) {
      throw new Error('Cloudflare Images access token is required!');
    }

    if (!accountId) {
      throw new Error('Cloudflare account ID is required!');
    }

    console.log(`🔧 Cloudflare Images Provider initialized:`);
    console.log(`   - Account ID: ${accountId}`);
    console.log(`   - Images Domain: ${imagesDomain}`);
    console.log(`   - Signed URLs: ${requireSignedURLs}`);
    console.log(`   - Using Flexible Variants (no fixed variants)`);

    return {
      async upload(file) {
        try {
          // Skip thumbnail uploads - only upload main files
          if (file.name && file.name.startsWith('thumbnail_')) {
            console.log(`⏭️ Skipping thumbnail upload: ${file.name}`);
            return; // Don't upload thumbnails
          }

          const formData = new FormData();
          
          // Add file to form data
          if (file.stream) {
            // Use the stream directly
            formData.append('file', file.stream, {
              filename: file.name,
              contentType: file.mime,
            });
          } else if (file.buffer) {
            // Use the buffer directly
            formData.append('file', file.buffer, {
              filename: file.name,
              contentType: file.mime,
            });
          } else {
            throw new Error('No file stream or buffer available');
          }

          // Add requireSignedURLs parameter
          formData.append('requireSignedURLs', requireSignedURLs.toString());

          // Add metadata for better organization (optional)
          const metadata = {
            originalName: file.name,
            uploadedAt: new Date().toISOString(),
            strapiProvider: 'cloudflare-images'
          };
          formData.append('metadata', JSON.stringify(metadata));

          console.log(`📤 Uploading ${file.name} (${file.size} bytes) to Cloudflare Images...`);

          // Upload to Cloudflare Images
          const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                ...formData.getHeaders(),
              },
              body: formData,
            }
          );

          const responseText = await response.text();
          
          if (!response.ok) {
            console.error(`❌ Upload failed: ${response.status} - ${responseText}`);
            throw new Error(`Cloudflare Images upload failed: ${response.status} - ${responseText}`);
          }

          let data;
          try {
            data = JSON.parse(responseText);
          } catch (parseError) {
            console.error('❌ Failed to parse response JSON:', responseText);
            throw new Error(`Invalid JSON response: ${responseText}`);
          }
          
          if (!data.success) {
            console.error('❌ Cloudflare API returned error:', data);
            throw new Error(`Cloudflare Images API error: ${JSON.stringify(data.errors || 'Unknown error')}`);
          }

          // Build flexible variant URL - no fixed variant needed
          const imageId = data.result.id;
          // Extract account hash from imagesDomain (e.g., https://imagedelivery.net/luwJNtzj_55OtjI-s6Qyew)
          const accountHash = imagesDomain.split('/').pop();
          const baseUrl = `${imagesDomain}/${imageId}`;

          // Create a clean URL object that prevents Strapi from adding parameters
          const cleanUrl = new String(baseUrl);
          cleanUrl.toString = () => baseUrl; // Always return clean URL
          cleanUrl.valueOf = () => baseUrl;   // Always return clean URL

          // Update file object with flexible variant URL
          file.url = cleanUrl; // Base URL for flexible variants
          
          // For Strapi 5 compatibility - use formats object instead of thumbnail property
          file.formats = {
            thumbnail: {
              name: `thumbnail_${file.name}`,
              hash: `thumbnail_${file.hash}`,
              ext: file.ext,
              mime: file.mime,
              width: 245,
              height: 156,
              size: Math.round(file.size * 0.1), // Estimate smaller size
              url: `${baseUrl}/width=245,height=156,fit=contain,quality=85`,
              provider_metadata: {
                cloudflare_id: imageId,
                is_thumbnail: true,
                base_url: baseUrl
              }
            }
          };
          
          // Store metadata for flexible frontend usage
          file.provider_metadata = {
            cloudflare_id: imageId,
            uploaded_at: data.result.uploaded,
            filename: data.result.filename,
            base_url: baseUrl,
            images_domain: imagesDomain,
            account_hash: accountHash,
            // Flexible variants examples for frontend - correct syntax
            flexible_examples: {
              webp: `${baseUrl}/format=webp`,
              quality: `${baseUrl}/quality=85`,
              resize: `${baseUrl}/width=800,height=600,fit=cover`,
              combined: `${baseUrl}/format=webp,quality=85,width=800,height=600,fit=cover`,
              thumbnail: `${baseUrl}/width=245,height=156,fit=cover,quality=85`,
              mobile: `${baseUrl}/format=webp,width=640,quality=85,fit=scale-down`,
              desktop: `${baseUrl}/format=webp,width=1920,quality=85,fit=scale-down`
            }
          };

          // Override toString and valueOf to prevent URL manipulation
          Object.defineProperty(file, 'url', {
            value: cleanUrl,
            writable: false,
            enumerable: true,
            configurable: false
          });

          console.log(`✅ File uploaded: ${file.name}`);
          console.log(`📸 Base URL: ${baseUrl}`);
          console.log(`🖼️ Thumbnail URL: ${file.formats.thumbnail.url}`);
          console.log(`🎯 Example usage: ${baseUrl}/format=webp,width=800,height=600,fit=cover,quality=85`);

        } catch (error) {
          console.error('❌ Cloudflare Images upload error:', error);
          throw error;
        }
      },

      async uploadStream(file) {
        return this.upload(file);
      },

      async delete(file) {
        try {
          // Skip thumbnail deletions - they were never uploaded to Cloudflare
          if (file.name && file.name.startsWith('thumbnail_')) {
            console.log(`⏭️ Skipping thumbnail deletion (never uploaded): ${file.name}`);
            return;
          }

          // Skip files that are marked as thumbnails in metadata
          if (file.provider_metadata?.is_thumbnail) {
            console.log(`⏭️ Skipping thumbnail deletion from metadata: ${file.name}`);
            return;
          }

          if (!file.provider_metadata?.cloudflare_id) {
            console.warn('⚠️ No Cloudflare ID found for file deletion, skipping:', file.name);
            return;
          }

          const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1/${file.provider_metadata.cloudflare_id}`,
            {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
              },
            }
          );

          if (!response.ok) {
            // Handle 404 as success - file already deleted
            if (response.status === 404) {
              console.log(`✅ File already deleted from Cloudflare Images: ${file.name}`);
              return;
            }
            
            const errorData = await response.text();
            console.error(`❌ Cloudflare Images delete failed: ${response.status} - ${errorData}`);
            throw new Error(`Failed to delete file from Cloudflare Images: ${response.status}`);
          }

          console.log(`🗑️ File deleted from Cloudflare Images: ${file.name}`);

        } catch (error) {
          console.error('❌ Cloudflare Images delete error:', error);
          throw error;
        }
      },

      // Optional: Check if file exists
      async checkFileExistence(file) {
        try {
          if (!file.provider_metadata?.cloudflare_id) {
            return false;
          }

          const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1/${file.provider_metadata.cloudflare_id}`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
              },
            }
          );

          return response.ok;
        } catch (error) {
          console.error('Error checking file existence:', error);
          return false;
        }
      },
    };
  },
}; 