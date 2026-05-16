export const CONFIG = {
  BRAND_NAME: import.meta.env.VITE_BRAND_NAME || 'Click2Kart',
  SUPPORT_WHATSAPP: (import.meta.env.VITE_SUPPORT_WHATSAPP || '917978880244').replace(/\D/g, ''),
  SUPPORT_PHONE_DISPLAY: import.meta.env.VITE_SUPPORT_PHONE_DISPLAY || '+91 79788 80244',
  SUPPORT_EMAIL: import.meta.env.VITE_SUPPORT_EMAIL || 'support@click2kart.net',
  HERO_TITLE_LINE1: import.meta.env.VITE_HERO_TITLE_LINE1 || '',
  HERO_TITLE_LINE2: import.meta.env.VITE_HERO_TITLE_LINE2 || '',
  HERO_SUBHEAD:
    import.meta.env.VITE_HERO_SUBHEAD ||
    'Direct wholesale access to top-tier electronics. GST compliant billing, bulk-only pricing, and Pan-India logistics for modern enterprises.'
}
