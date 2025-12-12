import React, { useState, useEffect } from 'react';
import { Image, Dimensions, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { ImageObj } from '../utils/api';

const screenWidth = Dimensions.get('window').width;

interface AutoHeightImageProps {
    source: string | ImageObj;
    onPress?: () => void;
    maxHeight?: number;
    minHeight?: number;
}

// Component hiển thị ảnh với chiều cao tự động theo tỷ lệ thật - giống Facebook
export default function AutoHeightImage({
    source,
    onPress,
    maxHeight = 600,
    minHeight = 150
}: AutoHeightImageProps) {
    const [height, setHeight] = useState(300); // Default height while loading
    const [isLoading, setIsLoading] = useState(true);

    // Get URI from source
    const uri = typeof source === 'string' ? source : source.uri;

    // Get dimensions from source object if available
    const sourceWidth = typeof source === 'object' ? source.width : undefined;
    const sourceHeight = typeof source === 'object' ? source.height : undefined;

    useEffect(() => {
        if (!uri) return;

        // If we already have dimensions from API, use them
        if (sourceWidth && sourceHeight && sourceHeight > 0) {
            const aspectRatio = sourceWidth / sourceHeight;
            const calculatedHeight = screenWidth / aspectRatio;
            const finalHeight = Math.min(Math.max(calculatedHeight, minHeight), maxHeight);
            setHeight(finalHeight);
            setIsLoading(false);
            return;
        }

        // Otherwise, get dimensions from image URL
        Image.getSize(
            uri,
            (w, h) => {
                if (h > 0) {
                    const aspectRatio = w / h;
                    const calculatedHeight = screenWidth / aspectRatio;
                    const finalHeight = Math.min(Math.max(calculatedHeight, minHeight), maxHeight);
                    setHeight(finalHeight);
                }
                setIsLoading(false);
            },
            (error) => {
                console.log('AutoHeightImage getSize error:', error);
                setIsLoading(false);
            }
        );
    }, [uri, sourceWidth, sourceHeight, maxHeight, minHeight]);

    const content = (
        <View style={{ width: '100%', height, backgroundColor: '#f0f0f0' }}>
            <Image
                source={{ uri }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
                onLoadStart={() => setIsLoading(true)}
                onLoadEnd={() => setIsLoading(false)}
            />
            {isLoading && (
                <View style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    justifyContent: 'center',
                    alignItems: 'center'
                }}>
                    <ActivityIndicator size="small" color="#999" />
                </View>
            )}
        </View>
    );

    if (onPress) {
        return (
            <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
                {content}
            </TouchableOpacity>
        );
    }

    return content;
}
