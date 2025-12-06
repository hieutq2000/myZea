import { useEffect, useState } from 'react';
import * as Updates from 'expo-updates';
import { Alert } from 'react-native';

export function useAppUpdates() {
    const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
    const [isChecking, setIsChecking] = useState(false);

    useEffect(() => {
        if (!__DEV__) {
            checkUpdate();
        }
    }, []);

    const checkUpdate = async () => {
        try {
            setIsChecking(true);
            const update = await Updates.checkForUpdateAsync();
            if (update.isAvailable) {
                setIsUpdateAvailable(true);
                Alert.alert(
                    'Cập nhật mới 🚀',
                    'Đã có phiên bản mới của ứng dụng. Bạn có muốn cập nhật ngay không?',
                    [
                        { text: 'Để sau', style: 'cancel' },
                        { text: 'Cập nhật ngay', onPress: runUpdate }
                    ]
                );
            }
        } catch (error) {
            console.log('Error checking for updates:', error);
        } finally {
            setIsChecking(false);
        }
    };

    const runUpdate = async () => {
        try {
            await Updates.fetchUpdateAsync();
            await Updates.reloadAsync();
        } catch (error) {
            Alert.alert('Lỗi', 'Không thể cập nhật. Vui lòng thử lại sau.');
            console.log('Error fetching update:', error);
        }
    };

    return {
        isUpdateAvailable,
        isChecking,
        checkUpdate,
        runUpdate
    };
}
