// Vice Harbor — the five districts of the city: golden-hour palettes, names and ground rules.
function districtAtPoint(x, y) {
  for (const d of VH.districts.list) {
    if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d;
  }
  return VH.districts.list[0];
}
function districtNameAt(x, y) { return districtAtPoint(x, y).name; }
function isWaterPoint(x, y) {
  return x >= VH.world.WATER_X || y >= VH.world.H - 260;
}
function isBeachPoint(x, y) {
  return (x >= VH.world.WATER_X - 130 && x < VH.world.WATER_X) || (y >= VH.world.H - 390 && y < VH.world.H - 260);
}
function listDistricts() { return VH.districts.list; }
window.VH = window.VH || {};
VH.world = { W: 3400, H: 2600, WATER_X: 2620, ROAD: 92, BLOCK: 340 };
VH.districts = {
  list: [
    { id: 'downtown', name: 'Downtown Solmar', x: 0, y: 0, w: 1240, h: 1180, ground: '#c9a06b', road: '#5d564e', walk: '#e8cf9f', roofA: '#b5533c', roofB: '#e07a4a', accent: '#ffcf5c' },
    { id: 'boardwalk', name: 'Coral Boardwalk', x: 1240, y: 0, w: 1380, h: 1180, ground: '#dcb57e', road: '#6a5c4e', walk: '#f2dda6', roofA: '#2e8f86', roofB: '#f2a65a', accent: '#ff6b9d' },
    { id: 'marina', name: 'Marina Azul', x: 1240, y: 1180, w: 1380, h: 1160, ground: '#cbb27f', road: '#5d564e', walk: '#ecd9a8', roofA: '#3a7ca5', roofB: '#e8e3d5', accent: '#35c4d8' },
    { id: 'docks', name: 'Ironhook Docks', x: 0, y: 1180, w: 1240, h: 1160, ground: '#a99a7d', road: '#4e4a44', walk: '#cbbfa0', roofA: '#7a6a53', roofB: '#a33f2e', accent: '#ffb347' },
    { id: 'gardens', name: 'Palmera Gardens', x: 0, y: 2340, w: 2620, h: 260, ground: '#a8bf6e', road: '#5d564e', walk: '#e6d9a4', roofA: '#5d8a4a', roofB: '#d9c27a', accent: '#8fd14f' }
  ],
  at: districtAtPoint, nameAt: districtNameAt, isWater: isWaterPoint, isBeach: isBeachPoint, listAll: listDistricts
};
