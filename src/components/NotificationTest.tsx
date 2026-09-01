import React from 'react';
import { View, Button, StyleSheet, Alert } from 'react-native';
import { getRandomSampleNotification, sendLocalNotification } from '../services/notifications';
import { saveNotification } from '../screens/NotificationScreen';

export default function NotificationTest() {
  const scheduleNotification = async () => {
    const notif = getRandomSampleNotification();
    await saveNotification(notif);
    await sendLocalNotification(notif.title, notif.body, { type: notif.type });
    Alert.alert('Notification Generated', `"${notif.title}" was added!`);
  };

  return (
    <View style={styles.container}>
      <Button title="Test Local Notification" onPress={scheduleNotification} color="#c0392b" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

