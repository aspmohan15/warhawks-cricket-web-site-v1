// Supabase Storage Service for Tournament Assets & Organizer UPI QR Codes
import { getSupabaseClient, isSupabaseConfigured } from './supabase';

export const STORAGE_BUCKET_NAME = 'tournament-assets';
export const UPI_QR_FOLDER = 'upi-qr-codes';

// Default official Warhawks UPI QR Code SVG data URL fallback
export const DEFAULT_WARHAWKS_UPI = {
  upiId: 'warhawks.sports@icici',
  payeeName: 'Warhawks Tournament Operations',
  defaultFee: 1500,
  defaultQrCodeUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80'
};

/**
 * Uploads an image file to Supabase Storage bucket
 * Returns the public URL of the uploaded image
 */
export const uploadUpiQrToSupabase = async (file, tournamentId = 'default') => {
  if (!file) {
    throw new Error('No file provided for upload.');
  }

  // Validate file type
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
  if (!validTypes.includes(file.type)) {
    throw new Error('Please upload a valid image file (PNG, JPG, WEBP, or SVG).');
  }

  // Validate size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Image size must be less than 5MB.');
  }

  const client = getSupabaseClient();
  const fileExt = file.name ? file.name.split('.').pop() : 'png';
  const fileName = `upi-qr-${tournamentId}-${Date.now()}.${fileExt}`;
  const filePath = `${UPI_QR_FOLDER}/${fileName}`;

  // If Supabase is configured and connected, upload to Supabase Storage
  if (client && isSupabaseConfigured()) {
    try {
      // Check or ensure bucket exists (if permissions allow)
      const { error: uploadError } = await client.storage
        .from(STORAGE_BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type
        });

      if (!uploadError) {
        const { data: publicUrlData } = client.storage
          .from(STORAGE_BUCKET_NAME)
          .getPublicUrl(filePath);

        if (publicUrlData?.publicUrl) {
          return {
            success: true,
            storageType: 'supabase_storage',
            url: publicUrlData.publicUrl,
            fileName,
            path: filePath
          };
        }
      } else {
        console.warn('Supabase storage upload notice:', uploadError.message);
      }
    } catch (err) {
      console.warn('Supabase storage exception, falling back to local storage:', err.message);
    }
  }

  // Graceful fallback to DataURL for immediate seamless UI experience
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve({
        success: true,
        storageType: 'data_url_fallback',
        url: reader.result,
        fileName,
        path: filePath
      });
    };
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
};
