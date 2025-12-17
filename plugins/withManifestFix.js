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

        // Ép Gradle sử dụng giá trị của mình thay vì của thư viện (như expo-notifications)
        const replaceAttrs = 'android:allowBackup,android:supportsRtl,android:label,android:icon';
        if (app.$['tools:replace']) {
            const existing = app.$['tools:replace'].split(',').map(s => s.trim());
            ['android:allowBackup', 'android:supportsRtl', 'android:label', 'android:icon'].forEach(a => {
                if (!existing.includes(a)) existing.push(a);
            });
            app.$['tools:replace'] = existing.join(',');
        } else {
            app.$['tools:replace'] = replaceAttrs;
        }

        if (app.activity) {
            app.activity.forEach(activity => {
                if (activity.$ && activity.$['android:name'] === '.MainActivity') {
                    activity.$['android:exported'] = 'true';
                }
            });
        }

        return config;
    });
};

module.exports = withManifestFix;
