const { withAppBuildGradle, withProjectBuildGradle } = require('@expo/config-plugins');

// Plugin to fix duplicate class conflicts between AndroidX and Support Library
const withGradleFix = (config) => {
    // Fix project-level build.gradle
    config = withProjectBuildGradle(config, (config) => {
        if (config.modResults.language === 'groovy') {
            let contents = config.modResults.contents;

            // Add configurations to force AndroidX versions
            if (!contents.includes('configurations.all')) {
                const allProjectsBlock = contents.indexOf('allprojects {');
                if (allProjectsBlock !== -1) {
                    const insertPosition = contents.indexOf('{', allProjectsBlock) + 1;
                    const forceResolution = `
        configurations.all {
            resolutionStrategy {
                // Force AndroidX versions to resolve duplicate class issues
                force 'androidx.versionedparcelable:versionedparcelable:1.1.1'
                force 'androidx.core:core:1.12.0'
                force 'androidx.appcompat:appcompat:1.6.1'
                force 'androidx.activity:activity:1.8.0'
                force 'androidx.fragment:fragment:1.6.2'
                
                // Exclude old support library
                eachDependency { details ->
                    if (details.requested.group == 'com.android.support') {
                        details.useVersion '28.0.0'
                    }
                }
            }
            
            // Exclude duplicate modules
            exclude group: 'com.android.support', module: 'versionedparcelable'
            exclude group: 'com.android.support', module: 'support-compat'
            exclude group: 'com.android.support', module: 'support-core-utils'
            exclude group: 'com.android.support', module: 'support-core-ui'
            exclude group: 'com.android.support', module: 'support-fragment'
        }
`;
                    contents = contents.slice(0, insertPosition) + forceResolution + contents.slice(insertPosition);
                    config.modResults.contents = contents;
                }
            }
        }
        return config;
    });

    // Fix app-level build.gradle
    config = withAppBuildGradle(config, (config) => {
        if (config.modResults.language === 'groovy') {
            let contents = config.modResults.contents;

            // Add packagingOptions to handle duplicate files
            if (!contents.includes('packagingOptions')) {
                const androidBlock = contents.indexOf('android {');
                if (androidBlock !== -1) {
                    // Find the closing of android block to add packagingOptions
                    let braceCount = 0;
                    let insertPos = -1;
                    for (let i = androidBlock; i < contents.length; i++) {
                        if (contents[i] === '{') braceCount++;
                        if (contents[i] === '}') {
                            braceCount--;
                            if (braceCount === 0) {
                                insertPos = i;
                                break;
                            }
                        }
                    }

                    if (insertPos !== -1) {
                        const packagingOptions = `
    packagingOptions {
        pickFirst '**/libc++_shared.so'
        pickFirst '**/libfbjni.so'
        exclude 'META-INF/DEPENDENCIES'
        exclude 'META-INF/LICENSE'
        exclude 'META-INF/LICENSE.txt'
        exclude 'META-INF/NOTICE'
        exclude 'META-INF/NOTICE.txt'
    }
`;
                        contents = contents.slice(0, insertPos) + packagingOptions + contents.slice(insertPos);
                        config.modResults.contents = contents;
                    }
                }
            }

            // Add configurations to exclude duplicates
            if (!contents.includes('configurations.all')) {
                const dependenciesBlock = contents.indexOf('dependencies {');
                if (dependenciesBlock !== -1) {
                    const configBlock = `
configurations.all {
    exclude group: 'com.android.support', module: 'versionedparcelable'
    exclude group: 'com.android.support', module: 'collections'
    
    resolutionStrategy.eachDependency { details ->
        if (details.requested.group == 'com.android.support' && details.requested.name != 'multidex') {
            details.useTarget group: 'androidx.legacy', name: 'legacy-support-v4', version: '1.0.0'
        }
    }
}

`;
                    contents = contents.slice(0, dependenciesBlock) + configBlock + contents.slice(dependenciesBlock);
                    config.modResults.contents = contents;
                }
            }
        }
        return config;
    });

    return config;
};

module.exports = withGradleFix;
