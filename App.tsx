
import 'react-native-get-random-values';
import React from "react";
import { StatusBar } from "expo-status-bar";
import RootNavigator from "@/navigation";
import { AuthProvider } from "@/providers/AuthProvider";
import { ThemeProvider } from "@/ui/ThemeProvider";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <StatusBar style="auto" />
        <RootNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}
