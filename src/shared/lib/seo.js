export function setSEO(title, description) {
  if (title) document.title = title;
  let meta = document.querySelector('meta[name="description"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'description');
    document.head.appendChild(meta);
  }
  if (description) meta.setAttribute('content', description);
}

export function injectJsonLd(json) {
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.text = JSON.stringify(json);
  document.head.appendChild(script);
  return () => {
    try { document.head.removeChild(script) } catch {}
  };
}
