import{it,expect}from'vitest';
import{readFileSync}from'node:fs';
import buildInfo from'../build-info.json';
it('keeps the Settings identity consistent with both native package identities',()=>{
 const android=readFileSync(new URL('../android/app/build.gradle',import.meta.url),'utf8');
 const ios=readFileSync(new URL('../ios/App/App.xcodeproj/project.pbxproj',import.meta.url),'utf8');
 expect(buildInfo.version).toMatch(/^\d+\.\d+(?:\.\d+)?$/);expect(Number.isSafeInteger(buildInfo.build)&&buildInfo.build>0).toBe(true);
 expect(android.match(/versionName "([^"]+)"/)[1]).toBe(buildInfo.version);
 expect(Number(android.match(/versionCode (\d+)/)[1])).toBe(buildInfo.build);
 for(const match of ios.matchAll(/CURRENT_PROJECT_VERSION = (\d+);/g))expect(Number(match[1])).toBe(buildInfo.build);
 for(const match of ios.matchAll(/MARKETING_VERSION = ([^;]+);/g))expect(match[1]).toBe(buildInfo.version);
});
