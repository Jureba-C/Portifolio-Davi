import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

let cliente = null;

export function nuvemConfigurada() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export async function obterCliente() {
  if (!nuvemConfigurada()) return null;
  if (!cliente) {
    const { createClient } = await import('./vendor/supabase.js');
    cliente = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return cliente;
}
