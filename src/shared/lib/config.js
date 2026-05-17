export const CONFIG = {
  BRAND_NAME: import.meta.env.VITE_BRAND_NAME || 'SmartOdisha',
  SUPPORT_WHATSAPP: (import.meta.env.VITE_SUPPORT_WHATSAPP || '919827058262').replace(/\D/g, ''),
  SUPPORT_PHONE_DISPLAY: import.meta.env.VITE_SUPPORT_PHONE_DISPLAY || '+91 98270 58262',
  SUPPORT_EMAIL: import.meta.env.VITE_SUPPORT_EMAIL || 'support@smartodisha.in',
  HERO_TITLE_LINE1: import.meta.env.VITE_HERO_TITLE_LINE1 || '',
  HERO_TITLE_LINE2: import.meta.env.VITE_HERO_TITLE_LINE2 || '',
  HERO_SUBHEAD:
    import.meta.env.VITE_HERO_SUBHEAD ||
    'SMART CHOICE, SMART LIFE'
}
