import credits from "../../assets/courts/credits.json";

// Real photographs of Indian courts (Wikimedia Commons, CC BY-SA 4.0). Each is credited on the
// Photo credits screen, as the licence requires.
export const courts = {
  supremeCourt: require("../../assets/courts/supreme-court.jpg"),
  supremeCourtWide: require("../../assets/courts/supreme-court-2.jpg"),
  bombayHighCourtStreet: require("../../assets/courts/bombay-high-court-2.jpg"),
  madrasHighCourt: require("../../assets/courts/madras-high-court.jpg"),
  calcuttaHighCourt: require("../../assets/courts/calcutta-high-court.jpg"),
  uttarakhandHighCourt: require("../../assets/courts/uttarakhand-high-court.jpg"),
};

export const courtNames: Record<string, string> = {
  "supreme-court.jpg": "Supreme Court of India, New Delhi",
  "supreme-court-2.jpg": "Supreme Court of India, New Delhi",
  "bombay-high-court-2.jpg": "Bombay High Court, Mumbai",
  "madras-high-court.jpg": "Madras High Court, Chennai",
  "calcutta-high-court.jpg": "Calcutta High Court, Kolkata",
  "uttarakhand-high-court.jpg": "High Court of Uttarakhand, Nainital",
};

export type Credit = { file: string; title: string; author: string; license: string; licenseUrl: string; source: string; changes: string };
export const photoCredits = credits as Credit[];
