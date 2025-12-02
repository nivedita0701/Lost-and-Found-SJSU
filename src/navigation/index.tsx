import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "@/screens/LoginScreen";
import RegisterScreen from "@/screens/RegisterScreen";
import FeedScreen from "@/screens/FeedScreen";
import NewItemScreen from "@/screens/NewItemScreen";
import ItemDetailScreen from "@/screens/ItemDetailScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import MyItemsScreen from "@/screens/MyItemsScreen";
// import SavedSearchesScreen from "@/screens/SavedSearchesScreen";
import MapScreen from "@/screens/MapScreen";
import ProfileScreen from "@/screens/ProfileScreen";
import ChatScreen from "@/screens/ChatScreen";
import { useAuth } from "@/providers/AuthProvider";


const Stack = createNativeStackNavigator();

export default function RootNavigator() {
const { user, loading } = useAuth();

if (loading) return null;

return (
  <NavigationContainer>
    <Stack.Navigator>
      {user ? (
        <>
          <Stack.Screen name="Feed" component={FeedScreen} />
          <Stack.Screen name="Map" component={MapScreen} />
          <Stack.Screen name="ItemDetail" component={ItemDetailScreen} />
          <Stack.Screen name="NewItem" component={NewItemScreen} />
          <Stack.Screen name="MyItems" component={MyItemsScreen} />
          {/* <Stack.Screen name="SavedSearches" component={SavedSearchesScreen} /> */}
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      )}
    </Stack.Navigator>
  </NavigationContainer>
);
}
