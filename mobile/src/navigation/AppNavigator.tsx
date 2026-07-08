import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home, Search, MapPin, User, Plus } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { colorSchemes } from '../theme/colors';
import { useTranslation } from 'react-i18next';
import { View, StyleSheet } from 'react-native';

// Pages
import HomePage from '../pages/HomePage';
import ItemsPage from '../pages/ItemsPage';
import AddPage from '../pages/AddPage';
import AddManualPage from '../pages/AddManualPage';
import CropPage from '../pages/CropPage';
import LocationPage from '../pages/LocationPage';
import ProfilePage from '../pages/ProfilePage';
import SettingsPage from '../pages/SettingsPage';
import HelpPage from '../pages/HelpPage';
import AboutPage from '../pages/AboutPage';
import ItemDetailPage from '../pages/ItemDetailPage';
import WarrantyReminderPage from '../pages/WarrantyReminderPage';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// 获取主题色（从 colorSchemes 单一数据源派生）
function usePrimaryColor() {
  const { colorScheme } = useTheme();
  return colorSchemes[colorScheme].light.primary;
}

function TabNavigator() {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const primaryColor = usePrimaryColor();

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? 'rgba(20, 20, 30, 0.88)' : 'rgba(255, 255, 255, 0.78)',
          borderTopWidth: 0,
          elevation: 0,
          paddingBottom: 8,
          paddingTop: 8,
          height: 70,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
        },
        tabBarActiveTintColor: primaryColor,
        tabBarInactiveTintColor: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomePage}
        options={{
          tabBarLabel: t('nav.home'),
          tabBarIcon: ({ color, size }) => <Home color={color} size={size || 24} />,
        }}
      />
      <Tab.Screen
        name="Items"
        component={ItemsPage}
        options={{
          tabBarLabel: t('nav.items'),
          tabBarIcon: ({ color, size }) => <Search color={color} size={size || 24} />,
        }}
      />
      <Tab.Screen
        name="Add"
        component={AddPage}
        options={{
          tabBarLabel: '',
          tabBarIcon: ({ color, size }) => (
            <View style={[styles.addButton, { backgroundColor: primaryColor }]}>
              <Plus color="#FFFFFF" size={28} strokeWidth={2.5} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Location"
        component={LocationPage}
        options={{
          tabBarLabel: t('nav.locations'),
          tabBarIcon: ({ color, size }) => <MapPin color={color} size={size || 24} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfilePage}
        options={{
          tabBarLabel: t('nav.profile'),
          tabBarIcon: ({ color, size }) => <User color={color} size={size || 24} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen name="ItemDetail" component={ItemDetailPage} />
      <Stack.Screen name="AddManual" component={AddManualPage} />
      <Stack.Screen name="Crop" component={CropPage} />
      <Stack.Screen name="EditItem" component={AddManualPage} />
      <Stack.Screen name="Settings" component={SettingsPage} />
      <Stack.Screen name="Help" component={HelpPage} />
      <Stack.Screen name="About" component={AboutPage} />
      <Stack.Screen name="WarrantyReminder" component={WarrantyReminderPage} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -10,
  },
});