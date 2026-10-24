/** Server lease projection MUST use one authoritative clock reading inside its transaction. */
export function projectLeaseClock(lease,serverNowMs){
 if(!Number.isFinite(serverNowMs)||!Number.isFinite(lease?.expiresAt)||!Number.isSafeInteger(lease?.epoch)||lease.epoch<1)throw Error('Authoritative lease timing required');
 return {...lease,serverNowMs,remainingMs:Math.max(0,lease.expiresAt-serverNowMs)};
}
/** Anchor BEFORE dispatch on a monotonic clock. Subtracting full RTT is conservative:
 * server time is sampled after dispatch; a late response cannot extend ownership.
 * Wall-clock Date.now is never an input. Server checks still fence every operation.
 */
export function conservativeLeaseDeadline(projection,{sentAt,receivedAt,safetyMs=250,maxLeaseMs=15000}={}){
 if(![sentAt,receivedAt,safetyMs,maxLeaseMs].every(Number.isFinite)||receivedAt<sentAt||sentAt<0||safetyMs<0||maxLeaseMs<=0)throw Error('Monotonic bounded request timing required');
 if((!Number.isSafeInteger(projection?.epoch)||projection.epoch<1)||!Number.isFinite(projection?.serverNowMs)||!Number.isFinite(projection?.expiresAt)||!Number.isFinite(projection?.remainingMs)||projection.remainingMs<0)throw Error('Server lease projection required');
 const remaining=Math.max(0,projection.expiresAt-projection.serverNowMs);
 if(remaining!==projection.remainingMs||remaining>maxLeaseMs)throw Error('Inconsistent or excessive server lease window');
 const deadline=sentAt+Math.max(0,remaining-safetyMs);
 return {deadline,remainingMs:Math.max(0,deadline-receivedAt),expired:deadline<=receivedAt,epoch:projection.epoch};
}

