// Vice Harbor — weapons: fists, pistol, SMG and shotgun with ammo, spread, range and police heat.
function weaponById(id) {
  for (const w of VH.weapons.list) if (w.id === id) return w;
  return VH.weapons.list[0];
}
function createLoadout() {
  return {
    current: 'fists',
    owned: { fists: true, pistol: true, smg: false, shotgun: false },
    ammo: { pistol: 48, smg: 0, shotgun: 0 },
    cooldown: 0
  };
}
function cycleWeapon(loadout) {
  const order = ['fists', 'pistol', 'smg', 'shotgun'];
  let i = order.indexOf(loadout.current);
  for (let n = 0; n < 4; n++) {
    i = (i + 1) % 4;
    if (loadout.owned[order[i]]) { loadout.current = order[i]; return loadout.current; }
  }
  return loadout.current;
}
function giveWeapon(loadout, id, ammo) {
  loadout.owned[id] = true;
  if (ammo) loadout.ammo[id] = (loadout.ammo[id] || 0) + ammo;
}
function fireWeapon(state, originX, originY, angle) {
  const loadout = state.loadout, w = weaponById(loadout.current);
  if (loadout.cooldown > 0) return null;
  if (w.id !== 'fists' && (loadout.ammo[w.id] || 0) <= 0) { VH.audio.blip(); loadout.cooldown = 0.25; return null; }
  loadout.cooldown = w.rate;
  if (w.id !== 'fists') loadout.ammo[w.id]--;
  if (w.id === 'shotgun') VH.audio.shotgun(); else if (w.id !== 'fists') VH.audio.shot();
  const shots = [];
  for (let i = 0; i < w.pellets; i++) {
    const a = angle + (Math.random() - 0.5) * w.spread * 2;
    shots.push({ x: originX + Math.cos(angle) * 16, y: originY + Math.sin(angle) * 16, vx: Math.cos(a) * w.speed, vy: Math.sin(a) * w.speed, life: w.range / w.speed, dmg: w.dmg, friendly: true });
  }
  VH.fx.muzzle(state.fx, originX + Math.cos(angle) * 18, originY + Math.sin(angle) * 18, angle);
  VH.wanted.addHeat(state, w.id === 'fists' ? 0 : 1, 'shots fired');
  return shots;
}
function meleeHit(state, peds, cars) {
  let hitSomething = false;
  for (const p of peds) {
    if (!p.dead && Math.hypot(p.x - state.player.x, p.y - state.player.y) < 34) {
      p.hp -= 34; p.flee = 2; hitSomething = true;
      VH.fx.burst(state.fx, p.x, p.y, '#ffd23f', 5, 90, 0.35, 3);
      if (p.hp <= 0) { p.dead = true; VH.wanted.addHeat(state, 2, 'assault'); }
    }
  }
  if (hitSomething) VH.audio.hit();
  return hitSomething;
}
function updateProjectiles(state, projectiles, dt) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const s = projectiles[i];
    s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
    let dead = s.life <= 0;
    if (VH.city.buildingAt(state.layout, s.x, s.y, 0)) { VH.fx.burst(state.fx, s.x, s.y, '#d8cfc0', 3, 70, 0.3, 2); dead = true; }
    if (!dead && s.friendly) {
      for (const p of state.peds) {
        if (!p.dead && Math.hypot(p.x - s.x, p.y - s.y) < 11) {
          p.hp -= s.dmg; p.flee = 2.5; VH.audio.hit();
          VH.fx.burst(state.fx, p.x, p.y, '#e84f3d', 5, 90, 0.35, 3);
          if (p.hp <= 0) { p.dead = true; VH.wanted.addHeat(state, 2, 'violence'); }
          dead = true; break;
        }
      }
      if (!dead) for (const c of state.policeCars) {
        if (Math.hypot(c.x - s.x, c.y - s.y) < 26) { c.hp -= s.dmg; VH.wanted.addHeat(state, 1, 'firing on police'); dead = true; break; }
      }
      if (!dead) for (const c of state.cars) {
        if (c.driver !== 'player' && Math.hypot(c.x - s.x, c.y - s.y) < 26) { c.hp -= s.dmg * 0.5; dead = true; break; }
      }
    }
    if (!dead && !s.friendly && state.player.mode === 'foot') {
      if (Math.hypot(state.player.x - s.x, state.player.y - s.y) < 11) { damagePlayer(state, s.dmg); dead = true; }
    }
    if (!dead && !s.friendly && state.player.car) {
      if (Math.hypot(state.player.car.x - s.x, state.player.car.y - s.y) < 28) { state.player.car.hp -= s.dmg * 0.6; damagePlayer(state, s.dmg * 0.3); dead = true; }
    }
    if (dead) projectiles.splice(i, 1);
  }
}
function damagePlayer(state, dmg) {
  state.player.hp -= dmg;
  state.fx.flashRed = 0.7;
  if (state.player.hp <= 0 && state.mode === 'playing') triggerWasted(state);
}
function triggerWasted(state) {
  state.mode = 'wasted'; state.deathT = 3.2; VH.audio.sirenStop(); VH.audio.engineSet(0, false);
}
window.VH = window.VH || {};
VH.weapons = {
  list: [
    { id: 'fists', name: 'Fists', dmg: 34, rate: 0.32, range: 36, speed: 1, spread: 0, pellets: 1 },
    { id: 'pistol', name: 'Pistol', dmg: 26, rate: 0.3, range: 330, speed: 720, spread: 0.02, pellets: 1 },
    { id: 'smg', name: 'SMG', dmg: 15, rate: 0.09, range: 300, speed: 760, spread: 0.06, pellets: 1 },
    { id: 'shotgun', name: 'Shotgun', dmg: 11, rate: 0.85, range: 190, speed: 640, spread: 0.14, pellets: 6 }
  ],
  byId: weaponById, createLoadout: createLoadout, cycle: cycleWeapon, give: giveWeapon,
  fire: fireWeapon, melee: meleeHit, updateProjectiles: updateProjectiles, damagePlayer: damagePlayer, wasted: triggerWasted
};
