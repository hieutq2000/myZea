const { withAndroidManifest } = require('@expo/config-plugins');

const withManifestFix = (config) => {
    return withAndroidManifest(config, (config) => {
        const androidManifest = config.modResults;

        // Ensure the tools namespace is defined
        if (!androidManifest.manifest.$['xmlns:tools']) {
            androidManifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
        }

        const app = androidManifest.manifest.application[0];

        // Fix: Manifest merger failed - Force allowBackup to false to avoid conflicts
        // Many libraries set this to true/false, causing conflicts. False is safer for most apps.
        app.$['android:allowBackup'] = 'false';

        // Add tools:replace="android:allowBackup" to resolve conflict
        if (app.$['tools:replace']) {
            const currentReplace = app.$['tools:replace'];
            if (!currentReplace.includes('android:allowBackup')) {
                app.$['tools:replace'] = `${currentReplace},android:allowBackup`;
            }
        } else {
            app.$['tools:replace'] = 'android:allowBackup';
        }

        // Add android:exported="true" to main activity if missing (required for Android 12+)
        if (app.activity) {
            app.activity.forEach(activity => {
                if (activity.$['android:name'] === '.MainActivity') {
                    activity.$['android:exported'] = 'true';
                }
            });
        }

        return config;
    });
};

module.exports = withManifestFix;
