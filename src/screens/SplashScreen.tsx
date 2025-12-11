import React, { useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getLatestChangelog } from '../utils/changelog';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
    onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
    useEffect(() => {
        // Auto dismiss after 2 seconds
        const timer = setTimeout(() => {
            onFinish();
        }, 2000);

        return () => clearTimeout(timer);
    }, [onFinish]);

    return (
        <LinearGradient
            colors={['#667eea', '#764ba2', '#f97316']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.container}
        >
            {/* Decorative circles */}
            <View style={styles.circle1} />
            <View style={styles.circle2} />

            {/* Logo */}
            <View style={styles.logoContainer}>
                <Text style={styles.logo}>🎓</Text>
                <Text style={styles.title}>Zyea</Text>
            </View>

            {/* Bottom section */}
            <View style={styles.bottomSection}>
                <Text style={styles.copyright}>© Zyea Corporation v{getLatestChangelog()?.version || '2.0'}</Text>
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    circle1: {
        position: 'absolute',
        width: width * 1.2,
        height: width * 1.2,
        borderRadius: width * 0.6,
        backgroundColor: 'rgba(255,255,255,0.08)',
        top: -width * 0.3,
        left: -width * 0.3,
    },
    circle2: {
        position: 'absolute',
        width: width * 0.8,
        height: width * 0.8,
        borderRadius: width * 0.4,
        backgroundColor: 'rgba(255,255,255,0.05)',
        bottom: -width * 0.2,
        right: -width * 0.2,
    },
    logoContainer: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
    },
    logo: {
        fontSize: 100,
        marginBottom: 16,
    },
    title: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#fff',
        textShadowColor: 'rgba(0,0,0,0.2)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    bottomSection: {
        paddingBottom: 50,
        alignItems: 'center',
    },
    slogan: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 12,
    },
    copyright: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
    },
});
