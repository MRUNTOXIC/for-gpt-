import React, { useImperativeHandle, forwardRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export const Marker = (props: any) => null;
export const UrlTile = (props: any) => null;

const CustomMapView = forwardRef((props: any, ref: any) => {
  useImperativeHandle(ref, () => ({
    animateCamera: () => {},
    animateToRegion: () => {},
  }));

  return (
    <View style={[StyleSheet.absoluteFill, styles.webMapContainer]}>
      <Text style={styles.webMapText}>
        Map View is supported on mobile devices.
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  webMapContainer: {
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webMapText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
});

export default CustomMapView;
