// @vitest-environment jsdom
import {it,expect,beforeEach} from 'vitest';
import {MIDNIGHT_LOCATIONS,MIDNIGHT_PRESETS,renderMidnightCity,renderMidnightPortrait} from '../src/ui/midnight-art.js';
import {readMidnight,saveMidnight,initializeMidnight} from '../src/ui/midnight-profile.js';
beforeEach(()=>localStorage.clear());
it('persists chosen city, preset and mute while rejecting unsupported artwork identifiers',()=>{
 expect(readMidnight().muted).toBe(true);saveMidnight({location:'tokyo',avatar:'character-4',muted:false});expect(readMidnight()).toEqual({location:'tokyo',avatar:'character-4',muted:false});expect(()=>saveMidnight({location:'monte-carlo'})).toThrow();expect(()=>saveMidnight({avatar:'https://other.test/photo'})).toThrow();
 localStorage.setItem('dice-clubhouse:midnight-preferences:v1','bad JSON');expect(readMidnight().avatar).toBe('character-1');
});
it('retains an explicit theme preference while selecting the new default only for an unset device',()=>{
 initializeMidnight();expect(localStorage.getItem('yz_theme')).toBe('dark');localStorage.setItem('yz_theme','light');saveMidnight({location:'sydney'});initializeMidnight();expect(localStorage.getItem('yz_theme')).toBe('light');expect(document.documentElement.dataset.location).toBe('sydney');
});
it('supplies four distinct original self-contained city illustrations and four preset portraits',()=>{
 const cities=MIDNIGHT_LOCATIONS.map(c=>renderMidnightCity(c.id));expect(new Set(cities).size).toBe(4);expect(new Set(MIDNIGHT_PRESETS.map(renderMidnightPortrait)).size).toBe(4);
 document.body.innerHTML=cities.join('')+MIDNIGHT_PRESETS.map(renderMidnightPortrait).join('');expect(document.querySelectorAll('svg')).toHaveLength(8);expect(document.querySelector('script,image,foreignObject')).toBeNull();expect(document.body.innerHTML).not.toContain('http');
});
