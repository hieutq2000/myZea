import React from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Text, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

interface ImageObj {
    uri: string;
    width?: number;
    height?: number;
}

interface PhotoGridProps {
    images: (string | ImageObj)[];
    onPressImage: (index: number) => void;
}

// Default aspect ratio when no dimensions available
const DEFAULT_ASPECT_RATIO = 1.5; // 3:2 - common photo ratio
const MAX_SINGLE_IMAGE_HEIGHT = 400; // Facebook limits to ~400px for single image
const MIN_SINGLE_IMAGE_HEIGHT = 200; // Minimum height for very wide images

export default function PhotoGrid({ images, onPressImage }: PhotoGridProps) {
    // Helper to get URI
    const getUri = (img: string | ImageObj) => typeof img === 'string' ? img : img.uri;

    // Helper to get aspectRatio from image object (if available)
    const getAspectRatio = (img: string | ImageObj): number => {
        if (typeof img === 'object' && img.width && img.height && img.height > 0) {
            return img.width / img.height;
        }
        return DEFAULT_ASPECT_RATIO;
    };

    if (!images || images.length === 0) return null;

    const count = images.length;
    const uri0 = getUri(images[0]);

    // 1 Image (Full Width, Dynamic Height with max limit like Facebook)
    if (count === 1) {
        const aspectRatio = getAspectRatio(images[0]);

        // For single image: allow wider range of aspect ratios
        // Only clamp extreme cases (very tall or very wide)
        const clampedRatio = Math.min(Math.max(aspectRatio, 0.5), 2.0); // 1:2 to 2:1
        const calculatedHeight = width / clampedRatio;

        // Clamp height between min and max
        const finalHeight = Math.min(Math.max(calculatedHeight, MIN_SINGLE_IMAGE_HEIGHT), MAX_SINGLE_IMAGE_HEIGHT);

        // Determine if image will be cropped significantly
        const actualRatioFromHeight = width / finalHeight;
        const isCropped = Math.abs(actualRatioFromHeight - aspectRatio) > 0.3;

        return (
            <TouchableOpacity
                onPress={() => onPressImage(0)}
                activeOpacity={0.9}
                style={{ width: '100%', height: finalHeight, backgroundColor: '#000' }}
            >
                <Image
                    source={{ uri: uri0 }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode={isCropped ? "contain" : "cover"}
                />
            </TouchableOpacity>
        );
    }

    const uri1 = images[1] ? getUri(images[1]) : '';
    const uri2 = images[2] ? getUri(images[2]) : '';
    const uri3 = images[3] ? getUri(images[3]) : '';

    // 2 Images (Split Vertical)
    if (count === 2) {
        return (
            <View style={styles.row}>
                <TouchableOpacity onPress={() => onPressImage(0)} activeOpacity={0.9} style={styles.col2}>
                    <Image source={{ uri: uri0 }} style={styles.imageHalf} resizeMode="cover" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onPressImage(1)} activeOpacity={0.9} style={styles.col2}>
                    <Image source={{ uri: uri1 }} style={styles.imageHalf} resizeMode="cover" />
                </TouchableOpacity>
            </View>
        );
    }

    // 3 Images (1 Big Left, 2 Small Right)
    if (count === 3) {
        return (
            <View style={styles.row}>
                <TouchableOpacity onPress={() => onPressImage(0)} activeOpacity={0.9} style={styles.col2}>
                    <Image source={{ uri: uri0 }} style={styles.imageHalf} resizeMode="cover" />
                </TouchableOpacity>
                <View style={styles.col2}>
                    <TouchableOpacity onPress={() => onPressImage(1)} activeOpacity={0.9} style={{ flex: 1, marginBottom: 2 }}>
                        <Image source={{ uri: uri1 }} style={styles.imageQuarter} resizeMode="cover" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => onPressImage(2)} activeOpacity={0.9} style={{ flex: 1, marginTop: 2 }}>
                        <Image source={{ uri: uri2 }} style={styles.imageQuarter} resizeMode="cover" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // 4 Images (2x2 Grid)
    if (count === 4) {
        return (
            <View style={styles.gridContainer}>
                <View style={styles.gridRow}>
                    <TouchableOpacity onPress={() => onPressImage(0)} activeOpacity={0.9} style={[styles.col2, { marginBottom: 2, marginRight: 2 }]}>
                        <Image source={{ uri: uri0 }} style={styles.imageHalfGrid} resizeMode="cover" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => onPressImage(1)} activeOpacity={0.9} style={[styles.col2, { marginBottom: 2, marginLeft: 2 }]}>
                        <Image source={{ uri: uri1 }} style={styles.imageHalfGrid} resizeMode="cover" />
                    </TouchableOpacity>
                </View>
                <View style={styles.gridRow}>
                    <TouchableOpacity onPress={() => onPressImage(2)} activeOpacity={0.9} style={[styles.col2, { marginTop: 2, marginRight: 2 }]}>
                        <Image source={{ uri: uri2 }} style={styles.imageHalfGrid} resizeMode="cover" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => onPressImage(3)} activeOpacity={0.9} style={[styles.col2, { marginTop: 2, marginLeft: 2 }]}>
                        <Image source={{ uri: uri3 }} style={styles.imageHalfGrid} resizeMode="cover" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // 5+ Images (2x2 Grid with Overlay on last one)
    return (
        <View style={styles.gridContainer}>
            <View style={styles.gridRow}>
                <TouchableOpacity onPress={() => onPressImage(0)} activeOpacity={0.9} style={[styles.col2, { marginBottom: 2, marginRight: 2 }]}>
                    <Image source={{ uri: uri0 }} style={styles.imageHalfGrid} resizeMode="cover" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onPressImage(1)} activeOpacity={0.9} style={[styles.col2, { marginBottom: 2, marginLeft: 2 }]}>
                    <Image source={{ uri: uri1 }} style={styles.imageHalfGrid} resizeMode="cover" />
                </TouchableOpacity>
            </View>
            <View style={styles.gridRow}>
                <TouchableOpacity onPress={() => onPressImage(2)} activeOpacity={0.9} style={[styles.col2, { marginTop: 2, marginRight: 2 }]}>
                    <Image source={{ uri: uri2 }} style={styles.imageHalfGrid} resizeMode="cover" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onPressImage(3)} activeOpacity={0.9} style={[styles.col2, { marginTop: 2, marginLeft: 2 }]}>
                    <Image source={{ uri: uri3 }} style={styles.imageHalfGrid} resizeMode="cover" />
                    <View style={styles.overlay}>
                        <Text style={styles.overlayText}>+{count - 3}</Text>
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const MULTI_IMAGE_HEIGHT = 350; // Fixed height for 2+ images like Facebook

const styles = StyleSheet.create({
    imageFull: {
        width: '100%',
        height: 500, // Single image max height
    },
    row: {
        flexDirection: 'row',
        height: MULTI_IMAGE_HEIGHT, // 2-3 images row height
    },
    gridRow: {
        flex: 1,
        flexDirection: 'row',
    },
    col2: {
        flex: 1,
    },
    imageHalf: {
        width: '100%',
        height: '100%',
        marginHorizontal: 1, // small gap
    },
    imageQuarter: {
        width: '100%',
        height: '100%',
    },
    gridContainer: {
        height: MULTI_IMAGE_HEIGHT, // 4+ images grid height - same as 2-3 for consistency
    },
    imageHalfGrid: {
        width: '100%',
        height: '100%',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    overlayText: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
    },
});
