// lib/fileUtils.ts

import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';

export type UploadResult = {
  error: Error | null;
  url: string | null;
};

export async function uploadFile(
  uri: string,
  bucket: 'messages' | 'posts' | 'avatars',
  userId: string
): Promise<UploadResult> {
  try {
    // 1) Vérifier l'URI
    if (!uri) throw new Error('URI invalide');

    // 2) Construire un nom de fichier (timestamp)
    const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const timestamp = Date.now();
    const filePath = `${userId}/${timestamp}.${fileExt}`;

    let fileData: Blob | ArrayBuffer;

    // 3) Lecture du fichier
    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      fileData = await response.blob();
    } else {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      fileData = decode(base64);
    }

    // 4) Upload vers Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, fileData, {
        contentType: `image/${fileExt}`,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // 5) Récupérer l'URL publique
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) throw new Error('URL publique non disponible');

    return { error: null, url: urlData.publicUrl };
  } catch (error) {
    console.error('Erreur upload:', error);
    return {
      error: error instanceof Error ? error : new Error('Échec de l\'upload'),
      url: null,
    };
  }
}
