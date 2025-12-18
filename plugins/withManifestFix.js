const { withAndroidManifest } = require('@expo/config-plugins');

const withManifestFix = (config) => {
    return withAndroidManifest(config, (config) => {
        const androidManifest = config.modResults;

        // Đảm bảo tools namespace tồn tại
        if (!androidManifest.manifest.$) androidManifest.manifest.$ = {};
        androidManifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

        const app = androidManifest.manifest.application[0];
        if (!app.$) app.$ = {};

        // Ép giá trị cho các thuộc tính hay xung đột
        app.$['android:allowBackup'] = 'false';
        app.$['android:supportsRtl'] = 'true';
        app.$['android:usesCleartextTraffic'] = 'true';
        app.$['android:requestLegacyExternalStorage'] = 'true';

        // Ép Gradle sử dụng giá trị của mình thay vì của thư viện
        const replaceAttrs = [
            'android:allowBackup',
            'android:supportsRtl',
            'android:label',
            'android:icon',
            'android:usesCleartextTraffic',
            'android:requestLegacyExternalStorage',
            'android:theme',
            'android:name'
        ];

        if (app.$['tools:replace']) {
            const existing = app.$['tools:replace'].split(',').map(s => s.trim());
            replaceAttrs.forEach(a => {
                if (!existing.includes(a)) existing.push(a);
            });
            app.$['tools:replace'] = existing.join(',');
        } else {
            app.$['tools:replace'] = replaceAttrs.join(',');
        }

        // Fix MainActivity exported
        if (app.activity) {
            app.activity.forEach(activity => {
                if (activity.$ && activity.$['android:name'] === '.MainActivity') {
                    activity.$['android:exported'] = 'true';
                }
            });
        }

        // Fix permissions conflicts - thêm tools:node="replace" cho các permissions
        if (androidManifest.manifest['uses-permission']) {
            androidManifest.manifest['uses-permission'].forEach(perm => {
                if (perm.$) {
                    const permName = perm.$['android:name'];
                    // Các permissions hay bị conflict
                    const conflictPerms = [
                        'android.permission.CAMERA',
                        'android.permission.RECORD_AUDIO',
                        'android.permission.READ_EXTERNAL_STORAGE',
                        'android.permission.WRITE_EXTERNAL_STORAGE',
                        'android.permission.POST_NOTIFICATIONS',
                        'android.permission.MODIFY_AUDIO_SETTINGS'
                    ];
                    if (conflictPerms.includes(permName)) {
                        perm.$['tools:node'] = 'replace';
                    }
                }
            });
        }

        // Fix meta-data conflicts
        if (app['meta-data']) {
            app['meta-data'].forEach(meta => {
                if (meta.$) {
                    meta.$['tools:replace'] = 'android:value';
                }
            });
        }

        return config;
    });
};

module.exports = withManifestFix;
