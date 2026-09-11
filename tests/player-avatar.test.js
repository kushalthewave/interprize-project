import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';

// The shared material library paints its textures on a <canvas>, which Node
// does not have. The figure only needs a stable material per name.
vi.mock('../src/environment/props/Materials.js', async (importOriginal) => {
  const real = await importOriginal();
  const { MeshStandardMaterial } = await import('three');
  const cache = {};
  const lib = new Proxy({}, { get: (_, k) => (cache[k] ??= new MeshStandardMaterial()) });
  return { ...real, materials: () => lib };
});
import { buildPlayerAvatar, AvatarRig } from '../src/player/PlayerAvatar.js';
import { PlayerController } from '../src/player/PlayerController.js';
import { AVATAR_ORDER } from '../src/data/avatars.js';
import { PLAYER } from '../src/data/config.js';

const meshes = (g) => {
  const out = [];
  g.traverse((o) => { if (o.isMesh) out.push(o); });
  return out;
};
const hasColour = (g, hex) => meshes(g).some((m) => m.visible && m.material.color?.getHex() === hex);

describe('Player avatar - the 3D figure', () => {
  it('builds every one of the five avatars', () => {
    for (const id of AVATAR_ORDER) {
      const g = buildPlayerAvatar(id);
      expect(g.userData.avatarId).toBe(id);
      expect(g.userData.isPlayer).toBe(true);
      expect(meshes(g).length).toBeGreaterThan(30);
    }
  });

  it('is to scale: about as tall as a person', () => {
    const box = new THREE.Box3().setFromObject(buildPlayerAvatar('sarah'));
    const h = box.max.y - box.min.y;
    expect(h).toBeGreaterThan(1.6);
    expect(h).toBeLessThan(2.0);
  });

  it('wears the hard hat colour of the chosen avatar', () => {
    expect(hasColour(buildPlayerAvatar('james'), 0xdc2626)).toBe(true); // red, fire warden
    expect(hasColour(buildPlayerAvatar('sarah'), 0x1e3a5f)).toBe(true); // navy
  });

  it('carries the kit of their role', () => {
    // Extinguisher and first-aid kit are red; the radio is dark with a lit screen.
    expect(hasColour(buildPlayerAvatar('james'), 0xdc2626)).toBe(true);
    expect(hasColour(buildPlayerAvatar('aisha'), 0xfde047)).toBe(true);
    expect(hasColour(buildPlayerAvatar('david'), 0x92400e)).toBe(true); // clipboard
  });

  it('covers the hair with a hijab for Aisha, and gives David his beard', () => {
    expect(hasColour(buildPlayerAvatar('aisha'), 0x1e2a4a)).toBe(true);
    expect(hasColour(buildPlayerAvatar('david'), 0x2a1d16)).toBe(true);
  });

  it('falls back to the default avatar for an unknown id', () => {
    expect(buildPlayerAvatar('nobody').userData.avatarId).toBe('sarah');
  });
});

describe('Player avatar - following the player', () => {
  const fakePlayer = (over = {}) => ({
    position: new THREE.Vector3(3, 0, -4),
    velocity: new THREE.Vector3(),
    yaw: 0.5,
    height: PLAYER.eyeHeight,
    ...over,
  });

  it('stands where the player stands, facing where they look', () => {
    const scene = new THREE.Scene();
    const rig = new AvatarRig(scene);
    rig.setAvatar('maria');
    rig.update(fakePlayer(), 0.016, true);
    expect(rig.model.visible).toBe(true);
    expect(rig.model.position.x).toBe(3);
    expect(rig.model.position.z).toBe(-4);
    expect(rig.model.rotation.y).toBeCloseTo(0.5 + Math.PI);
  });

  it('is hidden in first person', () => {
    const rig = new AvatarRig(new THREE.Scene());
    rig.setAvatar('maria');
    rig.update(fakePlayer(), 0.016, false);
    expect(rig.model.visible).toBe(false);
  });

  it('swaps the figure when another avatar is chosen, and keeps only one in the scene', () => {
    const scene = new THREE.Scene();
    const rig = new AvatarRig(scene);
    rig.setAvatar('sarah');
    rig.setAvatar('aisha');
    const players = scene.children.filter((c) => c.userData.isPlayer);
    expect(players).toHaveLength(1);
    expect(players[0].userData.avatarId).toBe('aisha');
  });

  it('crouches by bending the knees, not by squashing the figure', () => {
    const rig = new AvatarRig(new THREE.Scene());
    rig.setAvatar('david');
    rig.update(fakePlayer({ height: PLAYER.crouchHeight }), 0.016, true);
    const { hips, legs } = rig.model.userData.parts;
    expect(rig.model.scale.y).toBe(1);
    expect(hips.position.y).toBeLessThan(0.6);
    expect(legs[0].knee.rotation.x).toBeGreaterThan(1.5);
  });
});

describe('Third-person camera - it never goes through a wall', () => {
  const clear = (colliders, o, d) => PlayerController.prototype._boomClear.call({ colliders }, o, d);
  const eye = new THREE.Vector3(0, 1.68, 0);

  it('uses the whole boom in open space', () => {
    expect(clear([], eye, new THREE.Vector3(0.5, 0.2, 2.4))).toBe(1);
  });

  it('pulls in when racking is behind the player', () => {
    const rack = { cx: 0, cz: 1.5, hx: 2, hz: 0.3, h: 4 };
    const f = clear([rack], eye, new THREE.Vector3(0, 0.2, 2.4));
    expect(f).toBeLessThan(0.5);
    expect(f).toBeGreaterThan(0);
  });

  it('ignores low kerbs you can walk over', () => {
    const kerb = { cx: 0, cz: 1.5, hx: 2, hz: 0.3, h: 0.2 };
    expect(clear([kerb], eye, new THREE.Vector3(0, 0.2, 2.4))).toBe(1);
  });

  it('passes over a box that is lower than the camera', () => {
    const pallet = { cx: 0, cz: 1.5, hx: 0.6, hz: 0.6, h: 0.9 };
    expect(clear([pallet], eye, new THREE.Vector3(0, 0.2, 2.4))).toBe(1);
  });
});
