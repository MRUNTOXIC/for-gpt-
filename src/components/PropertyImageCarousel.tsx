import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Platform,
  ViewStyle,
  NativeSyntheticEvent,
  NativeScrollEvent,
  DimensionValue,
} from 'react-native';
import { Image } from 'expo-image';
import { getFullImageUrl } from '../utils/imageUrl';
import { GLOBAL_IMAGE_HEIGHT } from '../theme/layout';

interface Props {
  images: string[];
  width: number;
  height?: DimensionValue;
  style?: ViewStyle;
}

export default function PropertyImageCarousel({
  images,
  width,
  height = GLOBAL_IMAGE_HEIGHT,
  style,
}: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentIndexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const displayImages: string[] = images?.length > 0 ? images : [];
  const count = displayImages.length;

  const stopAutoScroll = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startAutoScroll = useCallback(() => {
    stopAutoScroll();

    if (count <= 1) return;

    timerRef.current = setInterval(() => {
      const next = (currentIndexRef.current + 1) % count;
      currentIndexRef.current = next;
      setCurrentIndex(next);

      scrollRef.current?.scrollTo({
        x: next * width,
        animated: true,
      });
    }, 4500);
  }, [count, stopAutoScroll, width]);

  useEffect(() => {
    startAutoScroll();
    return () => stopAutoScroll();
  }, [startAutoScroll, stopAutoScroll]);

  const handleScrollBeginDrag = useCallback(() => {
    stopAutoScroll();
  }, [stopAutoScroll]);

  const handleMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
      // Ensure we don't go out of bounds
      const clampedIndex = Math.max(0, Math.min(newIndex, count - 1));
      
      currentIndexRef.current = clampedIndex;
      setCurrentIndex(clampedIndex);
      startAutoScroll();
    },
    [width, count, startAutoScroll]
  );

  // If 0 images, show placeholder
  if (count === 0) {
    return (
      <View style={[styles.container, style, { width, height }]}>
        <Image
          source={require('../../assets/placeholder.png')}
          style={styles.image}
          contentFit="cover"
        />
      </View>
    );
  }

  // If 1 image, show just the image (no ScrollView, no pagination)
  if (count === 1) {
    return (
      <View style={[styles.container, style, { width, height }]}>
        <Image
          source={{ uri: getFullImageUrl(displayImages[0]) }}
          style={styles.image}
          contentFit="cover"
          transition={Platform.OS === 'ios' ? 180 : 0}
          cachePolicy="memory-disk"
        />
      </View>
    );
  }

  // Multiple images: Carousel
  return (
    <View style={[styles.container, style, { width, height }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScrollBeginDrag={handleScrollBeginDrag}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        // Force the ScrollView to claim touches so parent AnimatedPressable doesn't eat horizontal swipes
        onStartShouldSetResponder={() => true}
        onStartShouldSetResponderCapture={() => true}
        // Improve performance and touch handling
        scrollEventThrottle={16}
        decelerationRate="fast"
      >
        {displayImages.map((item, index) => (
          <View key={index} style={[styles.slide, { width, height }]}>
            <Image
              source={{ uri: getFullImageUrl(item) }}
              style={styles.image}
              contentFit="cover"
              transition={Platform.OS === 'ios' ? 180 : 0}
              cachePolicy="memory-disk"
            />
          </View>
        ))}
      </ScrollView>

      <View style={styles.pagination}>
        {displayImages.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index === currentIndex ? styles.activeDot : styles.inactiveDot,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  slide: {
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  pagination: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  activeDot: {
    backgroundColor: '#fff',
  },
  inactiveDot: {
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
});