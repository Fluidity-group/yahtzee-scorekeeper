import {installLabUuid} from './uuid.js';
installLabUuid();
// Only this laboratory entry adds an HTTP-compatible UUID helper. Production entry is untouched.
import('../src/bootstrap.js').catch(error=>{delete document.documentElement.dataset.booting;document.body.textContent='The development game could not load: '+error.message;});
