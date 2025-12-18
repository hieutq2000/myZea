const { withAndroidManifest } = require('@expo/config-plugins');

const withManifestFix = (config) => {
    return withAndroidManifest(config, (config) => {
        const androidManifest = config.modResults;

        // Ensure tools namespace exists
        if (!androidManifest.manifest.$) {
            androidManifest.manifest.$ = {};
        }
        androidManifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

        // Get application element
        const app = androidManifest.manifest.application?.[0];
        if (!app) return config;
        if (!app.$) app.$ = {};

        // Set application attributes
        app.$['android:allowBackup'] = 'false';
        app.$['android:supportsRtl'] = 'true';
        app.$['android:usesCleartextTraffic'] = 'true';
        app.$['android:requestLegacyExternalStorage'] = 'true';

        // Set tools:replace for application - this is critical
        app.$['tools:replace'] = [
            'android:allowBackup',
            'android:supportsRtl',
            'android:label',
            'android:icon',
            'android:roundIcon',
            'android:usesCleartextTraffic',
            'android:requestLegacyExternalStorage',
            'android:theme',
            'android:name',
            'android:extractNativeLibs'
        ].join(',');

        // Fix all activities - ensure exported is set
        if (app.activity) {
            app.activity.forEach(activity => {
                if (!activity.$) activity.$ = {};

                // MainActivity must be exported
                if (activity.$['android:name'] === '.MainActivity') {
                    activity.$['android:exported'] = 'true';
                }

                // Use tools:merge for intent-filter to avoid conflicts
                if (activity['intent-filter']) {
                    activity.$['tools:node'] = 'merge';
                }
            });
        }

        // Fix all services
        if (app.service) {
            app.service.forEach(service => {
                if (!service.$) service.$ = {};
                service.$['tools:node'] = 'merge';
            });
        }

        // Fix all receivers
        if (app.receiver) {
            app.receiver.forEach(receiver => {
                if (!receiver.$) receiver.$ = {};
                receiver.$['tools:node'] = 'merge';

                // Fix exported for receivers
                if (!receiver.$['android:exported']) {
                    receiver.$['android:exported'] = 'false';
                }
            });
        }

        // Fix providers
        if (app.provider) {
            app.provider.forEach(provider => {
                if (!provider.$) provider.$ = {};
                provider.$['tools:node'] = 'merge';
            });
        }

        // Fix permissions - use merge strategy
        if (androidManifest.manifest['uses-permission']) {
            // Remove duplicate permissions
            const seen = new Set();
            androidManifest.manifest['uses-permission'] = androidManifest.manifest['uses-permission'].filter(perm => {
                if (!perm.$) return false;
                const permName = perm.$['android:name'];
                if (seen.has(permName)) return false;
                seen.add(permName);

                // Set merge strategy for all permissions
                perm.$['tools:node'] = 'merge';
                return true;
            });
        }

        // Fix uses-feature - remove duplicates
        if (androidManifest.manifest['uses-feature']) {
            const seen = new Set();
            androidManifest.manifest['uses-feature'] = androidManifest.manifest['uses-feature'].filter(feature => {
                if (!feature.$) return false;
                const featureName = feature.$['android:name'];
                if (seen.has(featureName)) return false;
                seen.add(featureName);

                feature.$['tools:node'] = 'merge';
                return true;
            });
        }

        // Fix meta-data - critical for resolving conflicts
        if (app['meta-data']) {
            const seen = new Map();
            app['meta-data'] = app['meta-data'].filter(meta => {
                if (!meta.$) return false;
                const metaName = meta.$['android:name'];

                // If duplicate, keep the last one
                if (seen.has(metaName)) {
                    seen.set(metaName, meta);
                    return false;
                }
                seen.set(metaName, meta);

                // Use replace strategy for meta-data values
                meta.$['tools:replace'] = 'android:value,android:resource';
                return true;
            });
        }

        // Fix queries element if exists
        if (androidManifest.manifest.queries) {
            androidManifest.manifest.queries.forEach(query => {
                if (!query.$) query.$ = {};
                query.$['tools:node'] = 'merge';
            });
        }

        return config;
    });
};

module.exports = withManifestFix;
