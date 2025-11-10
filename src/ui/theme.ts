// Approx SJSU palette (close to Spartan Blue & Gold)
export const colors = {
  blue: "#0055A2",
  gold: "#FFC72A",
  blueDark: "#003E7E",
  blueMuted: "#E6EEF7",
  red: "#B00020",
  text: "#0B1221",
  textMuted: "#667085",
  border: "#E5E7EB",
  bg: "#FFFFFF",
  card: "#FFFFFF",
  shadow: "rgba(0,0,0,0.08)",
};

export const radius = { xs: 6, sm: 10, md: 14, lg: 20 };
export const spacing = { xs: 6, sm: 10, md: 14, lg: 20, xl: 28 };

export const typography = {
  // scale roughly to device size without a lib:
  scale: (size: number) => size, // you can swap with react-native-size-matters later
  h1: 24,
  h2: 20,
  body: 16,
  small: 13,
};
