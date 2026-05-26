import { useContext } from "react";
import { ToastContext } from "../context/ToastContextBase.js";

export default function useToast() {
  return useContext(ToastContext);
}
