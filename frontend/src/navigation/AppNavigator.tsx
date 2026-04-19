import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, MainTabParamList } from '../types';
import { Colors } from '../theme/colors';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import LibraryScreen from '../screens/LibraryScreen';
import NowPlayingScreen from '../screens/NowPlayingScreen';
import PlaylistScreen from '../screens/PlaylistScreen';
import CacheScreen from '../screens/CacheScreen';
import ErrorScreen from '../screens/ErrorScreen';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.divider,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 4,
          height: 64,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.iconInactive,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Search') {
            iconName = focused ? 'search' : 'search-outline';
          } else {
            iconName = focused ? 'library' : 'library-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Library" component={LibraryScreen} />
    </Tab.Navigator>
  );
}

interface Props {
  isAuthenticated: boolean;
}

export default function AppNavigator({ isAuthenticated }: Props) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: Colors.background },
      }}
    >
      {!isAuthenticated ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen
            name="NowPlaying"
            component={NowPlayingScreen}
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen name="Playlist" component={PlaylistScreen} />
          <Stack.Screen name="Cache" component={CacheScreen} />
          <Stack.Screen name="Error" component={ErrorScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
