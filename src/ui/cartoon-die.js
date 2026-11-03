const spots={1:[[16,16]],2:[[9,9],[23,23]],3:[[9,9],[16,16],[23,23]],4:[[9,9],[23,9],[9,23],[23,23]],5:[[9,9],[23,9],[16,16],[9,23],[23,23]],6:[[9,8],[23,8],[9,16],[23,16],[9,24],[23,24]]};
export function cartoonDie(face){
 return `<svg class="cartoon-die" viewBox="0 0 36 38" aria-hidden="true" focusable="false"><path d="M6 5L30 3Q34 3 34 8L33 31Q33 35 29 36L7 35Q3 35 3 30L2 10Q2 6 6 5Z" fill="#271b38"/><rect x="2" y="2" width="30" height="30" rx="6" fill="#fff0d2" stroke="#271b38" stroke-width="2"/><path d="M7 5H26" stroke="#fffdf4" stroke-width="2" stroke-linecap="round"/>${(spots[face]||spots[1]).map(([x,y])=>`<circle cx="${x}" cy="${y}" r="2.5" fill="#271b38"/>`).join('')}</svg>`;
}
