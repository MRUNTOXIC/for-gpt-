import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  onPostPropertyPress?: () => void;
  title?: string;
  onSearchPress?: () => void;
}

export default function AppHeader({
  onPostPropertyPress,
  title,
}: Props) {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const { colors } = useTheme();

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top, backgroundColor: colors.headerBg }]}>
      <View style={styles.row}>

        {/* Left: Spacer (No Back Button) */}
        <View style={styles.iconBtn} />

        {/* Center: Logo or Title */}
        <View style={styles.center}>
          {title ? (
            <Text style={[styles.title, { color: colors.headerText }]}>{title}</Text>
          ) : (
            <Image
              source={require('../../assets/ivantalogo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          )}
        </View>

        {/* Right: Notifications & Post Property */}
        <View style={styles.rightGroup}>
          <TouchableOpacity
            onPress={() => nav.navigate('Notifications')}
            style={styles.bellBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.headerIcon} />
            <View style={[styles.badgeDot, { backgroundColor: colors.primary }]} />
          </TouchableOpacity>

          {onPostPropertyPress ? (
            <TouchableOpacity
              onPress={onPostPropertyPress}
              style={[styles.postBtn, { borderColor: colors.primary }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="add" size={14} color={colors.primary} />
              <Text style={[styles.postBtnText, { color: colors.primary }]}>Post</Text>
            </TouchableOpacity>
          ) : null}
        </View>

      </View>
      <View style={[styles.accentLine, { backgroundColor: colors.primary }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  iconBtn: { width: 36, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center' },
  logo: { height: 36, width: 140 },
  title: { fontSize: 16, fontWeight: '700' },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bellBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badgeDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  postBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  postBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  accentLine: { height: 2 },
});
