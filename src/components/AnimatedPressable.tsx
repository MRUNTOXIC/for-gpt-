import React, { useRef, useCallback } from 'react';
import { Animated, Pressable, StyleProp, ViewStyle } from 'react-native';

interface Props {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  scale?: number;
  disabled?: boolean;
  activeOpacity?: number;
}

/**
 * Drop-in animated pressable with scale spring on press.
 * Guards against double-fire: onPress can only execute once per 400ms.
 */
export default function AnimatedPressable({
  onPress,
  style,
  children,
  scale = 0.96,
  disabled = false,
  activeOpacity = 1,
}: Props) {
  const anim = useRef(new Animated.Value(1)).current;
  // Throttle guard — prevents the same press firing multiple times
  // (e.g. when the component re-renders during an animation or loading state)
  const lastPress = useRef<number>(0);

  const pressIn = useCallback(() => {
    Animated.spring(anim, {
      toValue: scale,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [anim, scale]);

  const pressOut = useCallback(() => {
    Animated.spring(anim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 6,
    }).start();
  }, [anim]);

  const handlePress = useCallback(() => {
    if (disabled || !onPress) return;
    const now = Date.now();
    if (now - lastPress.current < 400) return; // throttle 400ms
    lastPress.current = now;
    onPress();
  }, [disabled, onPress]);

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={disabled ? undefined : pressIn}
      onPressOut={disabled ? undefined : pressOut}
      disabled={disabled}
    >
      <Animated.View
        style={[
          style,
          {
            transform: [{ scale: anim }],
            opacity: disabled ? 0.5 : activeOpacity,
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}
