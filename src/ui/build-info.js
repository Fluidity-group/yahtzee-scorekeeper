const bundled=typeof __YAHTZ_BUILD__==='undefined'?null:__YAHTZ_BUILD__;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderBuildInfo({identity=bundled,nativeInfo=null,game=null}={}) {
  const row=(label,value)=>`<p><strong>${label}</strong><br><code style="overflow-wrap:anywhere">${esc(value)}</code></p>`;
  return '<h2>About this build</h2>'+(identity?
    row('Source commit',identity.commit)+row('Source state',identity.sourceState)+row('Source fingerprint',identity.sourceSha256)+row('Build profile',identity.profile):
    '<p>Development preview · packaged build identity unavailable.</p>')+
    (nativeInfo?row('Installed app',`${nativeInfo.version} · build ${nativeInfo.build}`):'')+
    (game?row('Current game rules',`${game.mode} · version ${game.rules?.version??'unknown'}`):'')+
    '<p class="core-muted">Build identity helps compare versions. It does not establish feature completeness or game acceptance.</p><button class="all-scores" data-action="close">Done</button>';
}
