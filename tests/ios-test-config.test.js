import {it,expect} from 'vitest';
import {validateIosTestConfig} from '../scripts/ios-test-config.mjs';
const config='VITE_SUPABASE_URL=https://example.supabase.co\nVITE_GAME_WEB_URL=https://example.com\nVITE_SUPABASE_ANON_KEY=sb_publishable_fixture\n';
it('keeps the manual iOS build on public configuration with no commentary endpoint',()=>{
 const result=validateIosTestConfig(config+'VITE_COMMENTARY_URL=https://voice.example.com\n');
 expect(result.VITE_COMMENTARY_URL).toBe('');
 expect(result.VITE_PUBLIC_BASE).toBe('/');
 expect(()=>validateIosTestConfig(config+'ANTHROPIC_API_KEY=fixture')).toThrow(/public/);
 const privateJwt='header.'+Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url')+'.signature';
 expect(()=>validateIosTestConfig(config.replace('sb_publishable_fixture',privateJwt))).toThrow(/public anon/);
 expect(()=>validateIosTestConfig(config.replace('https://example.supabase.co','http://example.supabase.co'))).toThrow(/HTTPS/);
});
