import React, { useState, useEffect } from 'react';
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

export default function PhotoGrid({ images, onPressImage }: PhotoGridProps) {
    // Helper to get URI
    const getUri = (img: string | ImageObj) => typeof img === 'string' ? img : img.uri;

    // Helper: Initial Ratio
    const getInitialRatio = () => {
        if (images && images.length === 1) {
            const img = images[0];
            if (typeof img === 'object' && img.width && img.height && img.height > 0) {
                return img.width / img.height;
            }
        }
        return 1.5;
    };

    const [aspectRatio, setAspectRatio] = useState(getInitialRatio());

    useEffect(() => {
        if (images && images.length === 1) {
            const img = images[0];
            // If we already have dimensions, we don't need getSize, but we can double check or just skip
            if (typeof img === 'object' && img.width && img.height) {
                setAspectRatio(img.width / img.height);
                return;
            }

            // Fallback for string URLs or objects without dims
            const uri = getUri(img);
            Image.getSize(uri, (w, h) => {
                if (h > 0) setAspectRatio(w / h);
            }, (error) => console.log('Image getSize error:', error));
        }
    }, [images]);

    if (!images || images.length === 0) return null;

    const count = images.length;
    const uri0 = getUri(images[0]);

    // 1 Image (Full Width, Dynamic Height)
    if (count === 1) {
        return (
            <TouchableOpacity onPress={() => onPressImage(0)} activeOpacity={0.9} style={{ width: '100%', aspectRatio: aspectRatio }}>
                {/* Placeholder color can be added here if needed */}
                <View style={[StyleSheet.absoluteFill, { backgroundColor: '#ddd' }]} />
                <Image
                    source={{ uri: uri0 }}
                    style={{ width: '100%', height: '100%', maxHeight: 600 }}
                    resizeMode="contain"
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
                <View style={styles.row}>
                    <TouchableOpacity onPress={() => onPressImage(0)} activeOpacity={0.9} style={[styles.col2, { marginBottom: 2, marginRight: 2 }]}>
                        <Image source={{ uri: uri0 }} style={styles.imageHalfGrid} resizeMode="cover" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => onPressImage(1)} activeOpacity={0.9} style={[styles.col2, { marginBottom: 2, marginLeft: 2 }]}>
                        <Image source={{ uri: uri1 }} style={styles.imageHalfGrid} resizeMode="cover" />
                    </TouchableOpacity>
                </View>
                <View style={styles.row}>
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
            <View style={styles.row}>
                <TouchableOpacity onPress={() => onPressImage(0)} activeOpacity={0.9} style={[styles.col2, { marginBottom: 2, marginRight: 2 }]}>
                    <Image source={{ uri: uri0 }} style={styles.imageHalfGrid} resizeMode="cover" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onPressImage(1)} activeOpacity={0.9} style={[styles.col2, { marginBottom: 2, marginLeft: 2 }]}>
                    <Image source={{ uri: uri1 }} style={styles.imageHalfGrid} resizeMode="cover" />
                </TouchableOpacity>
            </View>
            <View style={styles.row}>
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

const styles = StyleSheet.create({
    imageFull: {
        width: '100%',
        height: 300,
    },
    row: {
        flexDirection: 'row',
        height: 300,
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
        height: 300,
    },
    imageHalfGrid: {
        width: '100%',
        height: 148, // approximate half
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
