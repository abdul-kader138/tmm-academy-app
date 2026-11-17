import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Image,
  Animated,
  StyleSheet,
  StyleProp,
  ImageStyle,
  ViewStyle,
  ImageSourcePropType,
  ImageResizeMode,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface ShimmerImageProps {
  source: ImageSourcePropType;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  resizeMode?: ImageResizeMode;
  fallbackIcon?: keyof typeof Ionicons.glyphMap;
  borderRadius?: number;
}

export const ShimmerImage: React.FC<ShimmerImageProps> = ({
  source,
  style,
  containerStyle,
  resizeMode = 'cover',
  fallbackIcon = 'book-outline',
  borderRadius = 0,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [containerWidth, setContainerWidth] = useState(350);

  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (!isLoaded && !hasError) {
      animation = Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1300,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      animation.start();
    }
    return () => {
      animation?.stop();
    };
  }, [isLoaded, hasError]);

  const handleLoad = () => {
    setIsLoaded(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(true);
  };

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-containerWidth, containerWidth],
  });

  return (
    <View
      style={[
        styles.container,
        borderRadius ? { borderRadius, overflow: 'hidden' } : null,
        containerStyle,
      ]}
      onLayout={(e) => {
        const { width } = e.nativeEvent.layout;
        if (width > 0) setContainerWidth(width);
      }}
    >
      {/* Background Ocean Wave / Shimmer Effect while image loads */}
      {!isLoaded && !hasError && (
        <View style={StyleSheet.absoluteFill}>
          <View style={styles.baseSkeleton}>
            <Ionicons name={fallbackIcon} size={36} color="#CBD5E1" />
          </View>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                width: '100%',
                transform: [{ translateX }],
              },
            ]}
          >
            <LinearGradient
              colors={[
                'rgba(241, 245, 249, 0)',
                'rgba(255, 255, 255, 0.75)',
                'rgba(241, 245, 249, 0)',
              ]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
      )}

      {/* Fallback View if image fails to load */}
      {hasError && (
        <View style={[StyleSheet.absoluteFill, styles.errorContainer]}>
          <Ionicons name={fallbackIcon} size={36} color="#94A3B8" />
        </View>
      )}

      {/* The Image itself with smooth fade-in */}
      {!hasError && (
        <Animated.Image
          source={source}
          style={[
            style,
            {
              opacity: fadeAnim,
            },
          ]}
          resizeMode={resizeMode}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
  },
  baseSkeleton: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
