import {installLabUuid} from './uuid.js';
// Install before evaluating ANY game/preview dependency, including during hot reloads.
async function boot(){
 installLabUuid();
 const [{setHomeAccountPreview},{homePreview}]=await Promise.all([import('../src/multiplayer/home-account.js'),import('./home-preview.js')]);
 setHomeAccountPreview(homePreview);
 await import('../src/bootstrap.js');
}
boot().catch(error=>{delete document.documentElement.dataset.booting;document.body.textContent='The development game could not load: '+error.message;});
