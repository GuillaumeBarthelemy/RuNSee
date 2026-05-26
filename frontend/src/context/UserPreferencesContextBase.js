import { createContext } from "react";

export const UserPreferencesContext = createContext({
  theme: "light",
  units: "metric",
  density: "comfort",
  setPreferences: () => {},
});
