import * as ImagePicker from 'expo-image-picker';

export interface ImagePickerResult {
    assets?: Array<{
        uri: string;
        type?: string;
        fileName?: string;
        fileSize?: number;
        width?: number;
        height?: number;
    }>;
    didCancel?: boolean;
    error?: string;
}

export const launchImageLibrary = async (options?: {
    mediaType?: 'photo' | 'video' | 'mixed';
    quality?: number;
    selectionLimit?: number;
}): Promise<ImagePickerResult> => {
    try {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permissionResult.granted) {
            return { didCancel: false, error: 'Cần cấp quyền truy cập thư viện ảnh' };
        }

        const selectionLimit = options?.selectionLimit || 1;
        const quality = options?.quality || 0.8;

        let mediaTypes: ImagePicker.MediaTypeOptions;
        if (options?.mediaType === 'photo') {
            mediaTypes = ImagePicker.MediaTypeOptions.Images;
        } else if (options?.mediaType === 'video') {
            mediaTypes = ImagePicker.MediaTypeOptions.Videos;
        } else {
            mediaTypes = ImagePicker.MediaTypeOptions.All;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: mediaTypes as any,
            allowsEditing: false,
            quality: Math.max(0, Math.min(1, quality)),
            allowsMultipleSelection: selectionLimit > 1,
            selectionLimit: selectionLimit,
        });

        if (result.canceled) {
            return { didCancel: true };
        }

        if (!result.assets || result.assets.length === 0) {
            return { didCancel: false, error: 'Không có ảnh nào được chọn' };
        }

        return {
            assets: result.assets.map((asset) => ({
                uri: asset.uri,
                type: asset.type || 'image',
                fileName: asset.fileName || `image_${Date.now()}.jpg`,
                fileSize: asset.fileSize,
                width: asset.width,
                height: asset.height,
            }))
        };
    } catch (error: any) {
        console.error('Image picker error:', error);
        return { error: error.message || 'Lỗi khi chọn ảnh' };
    }
};

export const launchCamera = async (options?: {
    mediaType?: 'photo' | 'video';
    quality?: number;
}): Promise<ImagePickerResult> => {
    try {
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

        if (!permissionResult.granted) {
            return { didCancel: false, error: 'Cần cấp quyền sử dụng camera' };
        }

        const quality = options?.quality || 0.8;
        const mediaTypes = options?.mediaType === 'video'
            ? ImagePicker.MediaTypeOptions.Videos
            : ImagePicker.MediaTypeOptions.Images;

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: mediaTypes as any,
            allowsEditing: false,
            quality: Math.max(0, Math.min(1, quality)),
        });

        if (result.canceled) {
            return { didCancel: true };
        }

        if (!result.assets || result.assets.length === 0) {
            return { didCancel: false, error: 'Không chụp được ảnh' };
        }

        return {
            assets: result.assets.map((asset) => ({
                uri: asset.uri,
                type: asset.type || 'image',
                fileName: asset.fileName || `photo_${Date.now()}.jpg`,
                fileSize: asset.fileSize,
                width: asset.width,
                height: asset.height,
            }))
        };
    } catch (error: any) {
        console.error('Camera error:', error);
        return { error: error.message || 'Lỗi khi chụp ảnh' };
    }
};
