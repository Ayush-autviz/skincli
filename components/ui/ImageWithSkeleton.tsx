// components/ui/ImageWithSkeleton.tsx
// Reusable image component with skeleton loading state

import React, { useState } from 'react';
import { View, TouchableOpacity, Image, StyleSheet, ViewStyle, ImageStyle } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';

// Global cache to track which images have already been loaded
const loadedImagesCache = new Set<string>();

interface ImageWithSkeletonProps {
    uri: string;
    style?: any;
    onPress?: () => void;
    containerStyle?: ViewStyle;
    borderRadius?: number;
    width?: number;
    height?: number;
    activeOpacity?: number;
    resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
}

const ImageWithSkeleton: React.FC<ImageWithSkeletonProps> = ({
    uri,
    style,
    onPress,
    containerStyle,
    borderRadius = 0,
    width,
    height,
    activeOpacity = 0.9,
    resizeMode = 'cover'
}) => {
    // Check if image was already loaded (cached)
    const [isImageLoading, setIsImageLoading] = useState(() => !loadedImagesCache.has(uri));

    // Handle empty URI
    if (!uri) {
        return (
            <TouchableOpacity
                style={containerStyle}
                onPress={onPress}
                activeOpacity={activeOpacity}
                disabled={!onPress}
            >
                <View style={[style, styles.emptyPhotoContainer]} />
            </TouchableOpacity>
        );
    }

    const handleImageLoad = () => {
        loadedImagesCache.add(uri);
        setIsImageLoading(false);
    };

    const isCached = loadedImagesCache.has(uri);
    const shouldShowSkeleton = isImageLoading && !isCached;

    // Determine dimensions from style if not provided explicitly
    const imageWidth = width || (style?.width ? Number(style.width) : 100);
    const imageHeight = height || (style?.height ? Number(style.height) : 100);

    return (
        <TouchableOpacity
            style={containerStyle}
            onPress={onPress}
            activeOpacity={activeOpacity}
            disabled={!onPress}
        >
            <View style={styles.imageContainer}>
                {shouldShowSkeleton && (
                    <View style={[styles.imageSkeleton, { width: imageWidth, height: imageHeight, borderRadius }]}>
                        <SkeletonPlaceholder borderRadius={borderRadius}>
                            <SkeletonPlaceholder.Item
                                width={imageWidth}
                                height={imageHeight}
                                borderRadius={borderRadius}
                            />
                        </SkeletonPlaceholder>
                    </View>
                )}
                <Image
                    source={{ uri }}
                    style={[style, shouldShowSkeleton && styles.hiddenImage]}
                    resizeMode={resizeMode}
                    onLoad={handleImageLoad}
                    onError={() => setIsImageLoading(false)}
                />
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    imageContainer: {
        overflow: 'hidden',
    },
    imageSkeleton: {
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 1,
        overflow: 'hidden',
        backgroundColor: '#E1E9EE',
    },
    hiddenImage: {
        opacity: 0,
    },
    emptyPhotoContainer: {
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default ImageWithSkeleton;
