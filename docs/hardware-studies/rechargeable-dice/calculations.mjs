// HW-009 scenarios, not measurements or a validated battery-life prediction.
const capacityMah = 29, nominalV = 3.7, usableFraction = 0.7;
const dailyMah = 4 * 0.2 + 20 * 0.005;
const energyMwh = capacityMah * nominalV;
console.log(JSON.stringify({
  assumptions: {capacityMah, nominalV, usableFraction, playHours: 4, playMa: 0.2, sleepHours: 20, sleepMa: 0.005},
  continuousPlayHours: [0.05, 0.2, 0.5].map(currentMa => ({currentMa, hours: capacityMah * usableFraction / currentMa})),
  dailyMah, dailyMwh: dailyMah * nominalV, daysWithReserve: capacityMah * usableFraction / dailyMah,
  chargeHoursIdealAt10Ma: capacityMah / 10,
  energyMwh,
  harvestingRequiredMw: {continuous: dailyMah * nominalV / 24, duringFourHoursOnly: dailyMah * nominalV / 4},
  emptyToFullHoursAtNetStoredPower: [0.01, 0.1, 1, 10].map(mw => ({mw, hours: energyMwh / mw})),
  solarScenario: {faceMm: 18, powerDensityUwCm2: 22, litHours: 8, netEfficiency: 0.7, singleFaceGrossUw: 3.24 * 22, dailyStoredMwh: 3.24 * 22 * 8 * 0.7 / 1000},
  internalCubeMmAtWall1_2: [16, 18, 20].map(edgeMm => ({edgeMm, insideMm: edgeMm - 2.4, volumeRelativeTo16: (edgeMm / 16) ** 3})),
  dropScenario: {massKg: 0.01, heightM: 0.2, availableMj: 0.01 * 9.81 * 0.2 * 1000, atAssumedTenPercentMj: 0.01 * 9.81 * 0.2 * 100}
}, null, 2));
