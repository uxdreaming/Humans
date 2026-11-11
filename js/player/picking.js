// Click picking: raycasts NPC meshes and resolves the agent via userData.npcId.

import * as THREE from 'three';

export function pickAgent(camera, clientX, clientY, agents, renderer) {
  const rect = renderer.domElement.getBoundingClientRect();
  const ndc = new THREE.Vector2(
    ((clientX - rect.left) / rect.width) * 2 - 1,
    -((clientY - rect.top) / rect.height) * 2 + 1,
  );
  const ray = new THREE.Raycaster();
  ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(agents.map((a) => a.group), true);
  for (const h of hits) {
    let o = h.object;
    while (o && o.userData.npcId === undefined) o = o.parent;
    if (o) return agents.find((a) => a.id === o.userData.npcId) || null;
  }
  return null;
}
