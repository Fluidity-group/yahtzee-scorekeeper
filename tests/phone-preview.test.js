import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {rewritePreviewEntry} from '../preview/html.js';
it('protects initial and timestamped bootstrap URLs before application imports',()=>{
 for(const url of ['/src/bootstrap.js','/src/bootstrap.js?t=123'])expect(rewritePreviewEntry(`<script type="module" src="${url}"></script>`)).toContain('src="/preview/entry.js"');
 expect(rewritePreviewEntry('<script src="/other.js"></script>')).toBe('<script src="/other.js"></script>');
 const entry=readFileSync(new URL('../preview/entry.js',import.meta.url),'utf8');
 expect(entry.indexOf('installLabUuid();')).toBeLessThan(entry.indexOf("await import('../src/bootstrap.js')"));expect(entry).not.toContain('homePreview');
});
