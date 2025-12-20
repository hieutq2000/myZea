const { withAndroidManifest, withGradleProperties } = require('@expo/config-plugins');

const withManifestFix = (config) => {
    // 1. Chỉ dùng Gradle Properties để ép AndroidX - Cách này an toàn nhất
    config = withGradleProperties(config, (config) => {
        const gradleProps = config.modResults;
        const props = [
            { type: 'property', key: 'android.enableJetifier', value: 'true' },
            { type: 'property', key: 'android.useAndroidX', value: 'true' }
        ];
        props.forEach(p => {
            const index = gradleProps.findIndex(gp => gp.key === p.key);
            if (index >= 0) gradleProps[index] = p;
            else gradleProps.push(p);
        });
        return config;
    });

    // 2. Fix Manifest - Tập trung vào tools:replace
    return withAndroidManifest(config, (config) => {
        const androidManifest = config.modResults;
        const manifest = androidManifest.manifest;

        if (!manifest.$) manifest.$ = {};
        manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

        const app = manifest.application?.[0];
        if (!app) return config;
        if (!app.$) app.$ = {};

        // Chỉ liệt kê các thuộc tính cơ bản hay xung đột
        const replaceAttrs = [
            'android:allowBackup',
            'android:label',
            'android:icon',
            'android:roundIcon',
            'android:theme',
            'android:supportsRtl'
        ];

        app.$['tools:replace'] = replaceAttrs.join(',');
        app.$['android:allowBackup'] = 'false';

        // Fix android:exported cho các Activity
        if (app.activity) {
            app.activity.forEach(activity => {
                if (!activity.$) activity.$ = {};
                if (activity['intent-filter'] && activity.$['android:exported'] === undefined) {
                    activity.$['android:exported'] = 'true';
                }
            });
        }

        // Quan trọng: Ép các thư viện Agora/Google tuân thủ
        if (!manifest['uses-sdk']) manifest['uses-sdk'] = [{ $: {} }];
        manifest['uses-sdk'][0].$['tools:overrideLibrary'] = 'io.agora.rtc, io.agora.rtc2, com.google.android.gms';

        return config;
    });
};

module.exports = withManifestFix;
