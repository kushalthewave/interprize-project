// Pasted into the browser console by the QA pass. Walks the player around each
// hazard, trying several vantage points, and reports any hazard that cannot be
// flagged from ANY sensible angle. Kept in the repo so the check is repeatable.
window.__qaRun = async function (envId, difficulty) {
  const B = window.BTH, G = B.game, H = G.hazards, P = B.player, cam = B.engine.camera;
  B.profile.markTrainComplete(envId);
  await G.loadEnvironment(envId, difficulty, 'test');
  G.start('test');

  const ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];
  const DISTS = [3.0, 5.0, 7.5];
  const log = [];

  for (const inst of [...H.instances]) {
    const c = inst.center;
    let flagged = false, tried = 0;
    outer:
    for (const d of DISTS) {
      for (const a of ANGLES) {
        const rad = (a * Math.PI) / 180;
        P.teleport(c.x + Math.sin(rad) * d, c.z + Math.cos(rad) * d, 0);
        const dx = c.x - cam.position.x, dy = c.y - cam.position.y, dz = c.z - cam.position.z;
        P.yaw = Math.atan2(-dx, -dz);
        P.pitch = Math.atan2(dy, Math.hypot(dx, dz));
        P._applyCamera();
        cam.updateMatrixWorld(true);
        H.update(0.016, 1);
        tried++;
        if (H.current === inst) {
          const before = H.progress.found;
          G.flag();
          if (H.progress.found > before) { flagged = true; break outer; }
        }
      }
    }
    log.push({ id: inst.id, flagged, tried });
  }

  const s = G.lastSummary;
  return {
    env: envId,
    difficulty,
    total: H.instances.length,
    flagged: log.filter(r => r.flagged).length,
    unreachable: log.filter(r => !r.flagged).map(r => r.id),
    state: G.state,
    score: s?.score ?? G.score?.score,
    rank: s?.rank?.id,
  };
};
