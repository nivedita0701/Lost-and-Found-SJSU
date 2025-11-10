import React from "react";
import { View, TextInput, Button } from "react-native";

export default function FilterBar({ value, onChange, onClear }: { value: string; onChange: (v:string)=>void; onClear: ()=>void; }) {
  return (
    <View style={{ gap: 8, padding: 8, backgroundColor: "#f6f6f6", borderRadius: 12 }}>
      <TextInput
        placeholder="Filter by category or building (e.g., Electronics, Library)"
        value={value}
        onChangeText={onChange}
        style={{ borderWidth: 1, borderColor: "#ddd", padding: 8, borderRadius: 8 }}
      />
      <Button title="Clear filters" onPress={onClear} />
    </View>
  );
}
