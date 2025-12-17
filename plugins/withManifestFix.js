const { withAndroidManifest } = require('@expo/config-plugins');

const withManifestFix = (config) => {
    return withAndroidManifest(config, (config) => {
        const androidManifest = config.modResults;

        // Ensure the tools namespace is defined
        if (!androidManifest.manifest.$['xmlns:tools']) {
            androidManifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
        }

        const app = androidManifest.manifest.application[0];

        // Fix: Manifest merger failed : Attribute application@allowBackup value=(true) per conflicts with ...
        // We force the value and tell manifest merger to replace it.
        app.$['android:allowBackup'] = 'true';

        if (app.$['tools:replace']) {
            const currentReplace = app.$['tools:replace'];
            if (!currentReplace.includes('android:allowBackup')) {
                app.$['tools:replace'] = `${currentReplace},android:allowBackup`;
            }
        } else {
            app.$['tools:replace'] = 'android:allowBackup';
        }

        return config;
    });
};

module.exports = withManifestFix;
