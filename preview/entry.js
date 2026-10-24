// Secure UUIDs for LAN HTTP, before importing any application dependencies.
import {installLabUuid} from '../lab/uuid.js';
installLabUuid();
await import('../src/bootstrap.js');
