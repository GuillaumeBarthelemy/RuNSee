import { useContext } from "react";
import { UserPreferencesContext } from "../context/UserPreferencesContextBase.js";

export default function useUserPreferences() {
  return useContext(UserPreferencesContext);
}
