export type CountryDetail = {
  country: string;
  nationality: string;
  iso2: string;
  lat: number;
  lon: number;
};

export const COUNTRY_DETAILS: CountryDetail[] = [
  { country: "Australia", nationality: "Australian", iso2: "AU", lat: -25.2744, lon: 133.7751 },
  { country: "Azerbaijan", nationality: "Azerbaijani", iso2: "AZ", lat: 40.1431, lon: 47.5769 },
  { country: "Belarus", nationality: "Belarusian", iso2: "BY", lat: 53.7098, lon: 27.9534 },
  { country: "British Virgin Islands", nationality: "British Virgin Islander", iso2: "VG", lat: 18.4207, lon: -64.64 },
  { country: "Bulgaria", nationality: "Bulgarian", iso2: "BG", lat: 42.7339, lon: 25.4858 },
  { country: "Canada", nationality: "Canadian", iso2: "CA", lat: 56.1304, lon: -106.3468 },
  { country: "Cyprus", nationality: "Cypriot", iso2: "CY", lat: 35.1264, lon: 33.4299 },
  { country: "Czechia", nationality: "Czech", iso2: "CZ", lat: 49.8175, lon: 15.473 },
  { country: "Estonia", nationality: "Estonian", iso2: "EE", lat: 58.5953, lon: 25.0136 },
  { country: "Finland", nationality: "Finnish", iso2: "FI", lat: 61.9241, lon: 25.7482 },
  { country: "France", nationality: "French", iso2: "FR", lat: 46.2276, lon: 2.2137 },
  { country: "Germany", nationality: "German", iso2: "DE", lat: 51.1657, lon: 10.4515 },
  { country: "Hungary", nationality: "Hungarian", iso2: "HU", lat: 47.1625, lon: 19.5033 },
  { country: "Iran", nationality: "Iranian", iso2: "IR", lat: 32.4279, lon: 53.688 },
  { country: "Iraq", nationality: "Iraqi", iso2: "IQ", lat: 33.2232, lon: 43.6793 },
  { country: "Israel", nationality: "Israeli", iso2: "IL", lat: 31.0461, lon: 34.8516 },
  { country: "Kazakhstan", nationality: "Kazakh", iso2: "KZ", lat: 48.0196, lon: 66.9237 },
  { country: "Lithuania", nationality: "Lithuanian", iso2: "LT", lat: 55.1694, lon: 23.8813 },
  { country: "Moldova", nationality: "Moldovan", iso2: "MD", lat: 47.4116, lon: 28.3699 },
  { country: "Montenegro", nationality: "Montenegrin", iso2: "ME", lat: 42.7087, lon: 19.3744 },
  { country: "Netherlands", nationality: "Dutch", iso2: "NL", lat: 52.1326, lon: 5.2913 },
  { country: "Northern Cyprus", nationality: "Turkish Cypriot", iso2: "KKTC", lat: 35.2401, lon: 33.3145 },
  { country: "Norway", nationality: "Norwegian", iso2: "NO", lat: 60.472, lon: 8.4689 },
  { country: "Poland", nationality: "Polish", iso2: "PL", lat: 51.9194, lon: 19.1451 },
  { country: "Romania", nationality: "Romanian", iso2: "RO", lat: 45.9432, lon: 24.9668 },
  { country: "Russia", nationality: "Russian", iso2: "RU", lat: 61.524, lon: 105.3188 },
  { country: "Saudi Arabia", nationality: "Saudi", iso2: "SA", lat: 23.8859, lon: 45.0792 },
  { country: "Spain", nationality: "Spanish", iso2: "ES", lat: 40.4637, lon: -3.7492 },
  { country: "Turkey", nationality: "Turkish", iso2: "TR", lat: 38.9637, lon: 35.2433 },
  { country: "Ukraine", nationality: "Ukrainian", iso2: "UA", lat: 48.3794, lon: 31.1656 },
  { country: "United Arab Emirates", nationality: "Emirati", iso2: "AE", lat: 23.4241, lon: 53.8478 },
  { country: "United Kingdom", nationality: "British", iso2: "GB", lat: 55.3781, lon: -3.436 },
  { country: "United States", nationality: "American", iso2: "US", lat: 37.0902, lon: -95.7129 },
].sort((a, b) => a.country.localeCompare(b.country));

export const COUNTRIES = COUNTRY_DETAILS.map((item) => item.country);

export const NATIONALITY_BY_COUNTRY: Record<string, string> = Object.fromEntries(
  COUNTRY_DETAILS.map((item) => [item.country, item.nationality]),
);
