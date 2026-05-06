export type LegalSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export const LAST_UPDATED_FR: string;
export const LAST_UPDATED_EN: string;

export const CONTACT: {
  email: string;
  whatsapp: string;
  address: string;
};

export const PRIVACY_FR: LegalSection[];
export const PRIVACY_EN: LegalSection[];
export const TERMS_FR: LegalSection[];
export const TERMS_EN: LegalSection[];
