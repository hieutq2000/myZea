const { withAndroidManifest } = require('@expo/config-plugins');

const withManifestFix = (config) => {
    return withAndroidManifest(config, (config) => {
        const androidManifest = config.modResults;

        // 1. Đảm bảo xmlns:tools tồn tại ở thẻ <manifest>
        if (!androidManifest.manifest.$) {
            androidManifest.manifest.$ = {};
        }
        androidManifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

        // 2. Lấy thẻ <application>
        const app = androidManifest.manifest.application[0];
        if (!app.$) {
            app.$ = {};
        }

        // 3. Ép giá trị cho các thuộc tính hay gây xung đột
        app.$['android:allowBackup'] = 'false';
        app.$['android:supportsRtl'] = 'true';

        // 4. Thêm tools:replace để Gradle ưu tiên giá trị của App thay vì thư viện
        const replaceAttributes = 'android:allowBackup,android:supportsRtl';

        if (app.$['tools:replace']) {
            const currentReplace = app.$['tools:replace'];
            // Hợp nhất các thuộc tính mà không làm mất cái cũ
            const attributes = currentReplace.split(',').map(a => a.trim());
            if (!attributes.includes('android:allowBackup')) attributes.push('android:allowBackup');
            if (!attributes.includes('android:supportsRtl')) attributes.push('android:supportsRtl');
            app.$['tools:replace'] = attributes.join(',');
        } else {
            app.$['tools:replace'] = replaceAttributes;
        }

        // 5. Đảm bảo MainActivity có android:exported="true" (Cần cho Android 12+)
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
