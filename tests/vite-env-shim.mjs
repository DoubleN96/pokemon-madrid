// Hook de carga para Node: src/config.js usa import.meta.env (propio de Vite),
// que en Node no existe y rompería el import. Este hook lo sustituye por un
// objeto vacío para que config.js caiga en sus valores por defecto.
// Solo se usa en tests; el juego en navegador no pasa por aquí.
export async function load(url, context, nextLoad) {
  const result = await nextLoad(url, context);
  if (!url.endsWith('/src/config.js') || result.source == null) return result;
  const text = typeof result.source === 'string'
    ? result.source
    : Buffer.from(result.source).toString('utf8');
  const source = text.replaceAll('import.meta.env', '(globalThis.__VITE_ENV__ ?? {})');
  return { ...result, source };
}
