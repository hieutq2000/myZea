import { useEffect, useState, useCallback } from 'react';
import * as Updates from 'expo-updates';

interface UseAppUpdatesReturn {
    isUpdateAvailable: boolean;
    isDownloading: boolean;
    checkForUpdate: () => Promise<void>;
    downloadAndApply: () => Promise<void>;
    dismissUpdate: () => void;
}

export function useAppUpdates(): UseAppUpdatesReturn {
    const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const checkForUpdate = useCallback(async () => {
        try {
            // Don't check in development mode
            if (__DEV__) {
                console.log('[Updates] Skipping update check in DEV mode');
                return;
            }

            console.log('[Updates] Checking for updates...');
            const update = await Updates.checkForUpdateAsync();

            if (update.isAvailable) {
                console.log('[Updates] New update available!');
                setIsUpdateAvailable(true);
            } else {
                console.log('[Updates] App is up to date');
                setIsUpdateAvailable(false);
            }
        } catch (error) {
            console.log('[Updates] Error checking for updates:', error);
            setIsUpdateAvailable(false);
        }
    }, []);

    const downloadAndApply = useCallback(async () => {
        try {
            setIsDownloading(true);
            console.log('[Updates] Downloading update...');

            await Updates.fetchUpdateAsync();

            console.log('[Updates] Update downloaded, reloading...');
            await Updates.reloadAsync();
        } catch (error) {
            console.log('[Updates] Error downloading update:', error);
            setIsDownloading(false);
        }
    }, []);

    const dismissUpdate = useCallback(() => {
        setIsUpdateAvailable(false);
    }, []);

    // Auto check on mount
    useEffect(() => {
        // Delay check slightly to let app fully load
        const timer = setTimeout(() => {
            checkForUpdate();
        }, 2000);

        return () => clearTimeout(timer);
    }, [checkForUpdate]);

    return {
        isUpdateAvailable,
        isDownloading,
        checkForUpdate,
        downloadAndApply,
        dismissUpdate,
    };
}
