import { useState, useEffect } from 'react';
import { Linking } from 'react-native';
import Constants from 'expo-constants';

interface VersionConfig {
    version: string;
    downloadUrl: string;
    forceUpdate: boolean;
    title: string;
    message: string;
}

export const useVersionCheck = () => {
    const [config, setConfig] = useState<VersionConfig | null>(null);
    const [needsUpdate, setNeedsUpdate] = useState(false);

    useEffect(() => {
        checkVersion();
        const interval = setInterval(checkVersion, 60 * 60 * 1000); // Check every hour
        return () => clearInterval(interval);
    }, []);

    const checkVersion = async () => {
        try {
            const res = await fetch('https://api.data5g.site/api/app-version/latest');
            const data = await res.json();

            const currentVersion = Constants.expoConfig?.version || '1.0.0';
            const remoteVersion = data.version;

            console.log('Version Check:', currentVersion, '->', remoteVersion);

            if (compareVersions(remoteVersion, currentVersion) > 0) {
                setConfig(data);
                setNeedsUpdate(true);
            }
        } catch (error) {
            console.log('Check version error:', error);
        }
    };

    const compareVersions = (v1: string, v2: string) => {
        const p1 = v1.split('.').map(Number);
        const p2 = v2.split('.').map(Number);
        for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
            const n1 = p1[i] || 0;
            const n2 = p2[i] || 0;
            if (n1 > n2) return 1;
            if (n1 < n2) return -1;
        }
        return 0;
    };

    const updateNow = () => {
        if (config?.downloadUrl) {
            Linking.openURL(config.downloadUrl);
        }
    };

    return { needsUpdate, config, updateNow, setNeedsUpdate };
};
