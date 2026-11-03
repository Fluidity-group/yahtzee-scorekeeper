import {it,expect} from 'vitest';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {checkReportBrowser} from '../scripts/check-report-browser.mjs';

// fg-dev's AppArmor policy blocks unprivileged downloaded browsers. The existing
// hosted CI runner has installed Chrome with a supported native sandbox. Fail in
// CI if that browser cannot run; never disable its sandbox to pass the check.
it.skipIf(!process.env.CI)('qualifies real report layouts and controls in sandboxed Chrome at desktop and phone widths',async()=>{
 const path=resolve('docs/releases/SW-083-reporting-web-rollout.json');
 // Production is an explicit release check, not a moving dependency of routine CI.
 const release=process.env.REPORTS_LIVE_CHECK==='1'&&existsSync(path)?JSON.parse(readFileSync(path,'utf8')):null;
 const result=await checkReportBrowser(release?.published?{liveUrl:release.reportsUrl,expectedSource:release.sourceCommit}:{});expect(result.passed).toBe(true);expect(result.results.map(r=>r.width)).toEqual([320,390,1024]);expect(result.pageErrors).toEqual([]);
},90000);
