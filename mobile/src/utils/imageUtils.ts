import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

const IMAGES_DIR = `${FileSystem.documentDirectory}item_images/`;

async function ensureImagesDir(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(IMAGES_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(IMAGES_DIR, { intermediates: true });
  }
}

export async function takePhoto(): Promise<string | null> {
  const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
  if (!permissionResult.granted) {
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.8,
    allowsEditing: false,
  });

  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  return saveImageToAppDirectory(result.assets[0].uri);
}

export async function pickImageFromGallery(): Promise<string | null> {
  const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permissionResult.granted) {
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.8,
    allowsEditing: false,
  });

  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  return saveImageToAppDirectory(result.assets[0].uri);
}

async function saveImageToAppDirectory(sourceUri: string): Promise<string> {
  await ensureImagesDir();

  const fileName = `item_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`;
  const destUri = `${IMAGES_DIR}${fileName}`;

  await FileSystem.copyAsync({
    from: sourceUri,
    to: destUri,
  });

  return destUri;
}

export async function deleteImage(imageUri: string): Promise<void> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(imageUri);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(imageUri);
    }
  } catch (e) {
    console.warn('Failed to delete image:', e);
  }
}

export function getImageUri(imageUrl?: string): string | undefined {
  if (!imageUrl) return undefined;
  return imageUrl;
}
