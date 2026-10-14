import {it,expect,vi} from 'vitest';
import {wifiProfile,applyWifi} from '../device/pi/network-setup.js';
it('validates Wi-Fi fields and escapes keyfile values without shell interpolation',()=>{
 expect(()=>wifiProfile({ssid:'bad\n[wifi]',password:'password123'})).toThrow('SSID');
 expect(()=>wifiProfile({ssid:'home',password:'short'})).toThrow('passphrase');
 const p=wifiProfile({ssid:'My Home',password:'a b\\12345'});expect(p.text).toContain('ssid=My\\sHome');expect(p.text).toContain('psk=a\\sb\\\\12345');
 const ap=wifiProfile({ssid:'Dice-Setup',password:'testpassword',hotspot:true});expect(ap.text).toContain('method=shared');expect(ap.text).toContain('autoconnect=false');
});
it('writes secrets to a private file adapter and restores setup on connection failure',async()=>{
 const write=vi.fn(),run=vi.fn().mockResolvedValueOnce({}).mockRejectedValueOnce(Error('failed')).mockResolvedValueOnce({});
 await expect(applyWifi({ssid:'home',password:'password123'},{write,run,fallbackId:'setup-id'})).rejects.toThrow('Rejoin');
 expect(write).toHaveBeenCalledOnce();expect(run.mock.calls.flat(2).join(' ')).not.toContain('password123');expect(run.mock.calls.at(-1)[0]).toEqual(['connection','up','uuid','setup-id']);
});
