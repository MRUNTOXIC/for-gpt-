import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const isExpoGo = Constants.appOwnership === 'expo';

export async function registerForPushNotificationsAsync() {
  if (isExpoGo) {
    return null;
  }
  try {
    let token;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      return null;
    }
    token = (await Notifications.getExpoPushTokenAsync()).data;
    return token;
  } catch (err) {
    return null;
  }
}

export async function sendLocalNotification(title, body, data = {}) {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      if (newStatus !== 'granted') return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
      },
      trigger: null,
    });
  } catch (err) {
    console.log('Error triggering local notification:', err);
  }
}

export const SAMPLE_NOTIFICATION_POOL = [
  {
    title: '🏷️ Price Drop Alert! (₹5 Lakhs Off)',
    body: '"3 BHK Luxury Apartment" in Kalawad Road, Rajkot dropped price from ₹65L to ₹60L.',
    type: 'price_drop',
    actionText: 'View Property',
    propertyId: 'p-1',
  },
  {
    title: '💬 New Buyer Inquiry Received',
    body: 'Priya Mehta asked: "Is this 3 BHK property available for immediate possession?"',
    type: 'inquiry',
    actionText: 'Reply Inquiry',
  },
  {
    title: '🏦 Home Loan Pre-Approved!',
    body: 'Great news! Your HDFC Home Loan application (#IVN-8924) of ₹45 Lakhs has been pre-approved at 8.35% p.a.',
    type: 'loan_update',
    actionText: 'Check Loan Details',
  },
  {
    title: '🏗️ New Luxury Project Launch',
    body: 'Shreeji Group launched "Ivanta Sky Villas" in University Road, Rajkot. Early bird 5% discount active!',
    type: 'builder_update',
    actionText: 'Explore Project',
    propertyId: 'p-4',
  },
  {
    title: '📅 Site Visit Scheduled Tomorrow',
    body: 'Confirmed: Site visit at 11:00 AM for "Commercial Space in 150 Feet Ring Road".',
    type: 'viewing_scheduled',
    actionText: 'View Schedule',
  },
  {
    title: '💰 New Purchase Offer Received',
    body: 'Buyer Mr. Patel submitted a buy offer of ₹72 Lakhs for your "3 BHK Flat in Mavdi".',
    type: 'offer_received',
    actionText: 'Review Offer',
  },
  {
    title: '🔍 3 New Matches Found',
    body: 'New listings matching your saved search "3 BHK under ₹65 Lakhs in Rajkot" are now available.',
    type: 'saved_search',
    actionText: 'View Matches',
  },
  {
    title: '✅ Listing Approved & Published',
    body: 'Your property "2 BHK Flat near Crystal Mall" is verified and live for 50,000+ buyers.',
    type: 'approved',
    actionText: 'View Listing',
  },
  {
    title: '🏠 Property Marked as Sold',
    body: '"4 BHK Penthouse" in 150 Ft Ring Road from your saved list was marked as Sold.',
    type: 'sold',
  },
  {
    title: '✨ Hot Property Alert',
    body: 'Exclusive 4 BHK Garden Facing Villa in Sadhu Vaswani Road just listed!',
    type: 'new_property',
    actionText: 'Check Property',
    propertyId: 'p-2',
  },
  {
    title: '🏦 SBI Interest Rate Cut Alert',
    body: 'State Bank of India reduced home loan interest rates to 8.25% p.a. Calculate your savings now.',
    type: 'loan_update',
    actionText: 'Loan Calculator',
  },
  {
    title: '📩 Message from Broker',
    body: 'Meet Jobanputra (Ivanta Realty): "I have 2 interested buyers for your commercial plot."',
    type: 'inquiry',
    actionText: 'View Message',
  },
];

export function getRandomSampleNotification() {
  const index = Math.floor(Math.random() * SAMPLE_NOTIFICATION_POOL.length);
  const sample = SAMPLE_NOTIFICATION_POOL[index];
  return {
    id: 'notif-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    title: sample.title,
    body: sample.body,
    type: sample.type,
    date: Date.now(),
    read: false,
    propertyId: sample.propertyId,
    actionText: sample.actionText,
  };
}

