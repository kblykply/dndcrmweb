import en from "./en";
import tr from "./tr";

export const messages = {
  tr,
  en,
};

export type AppLocale = keyof typeof messages;