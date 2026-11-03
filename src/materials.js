import * as THREE from 'three';

// One place to make surface materials for the room.
//
// The room used to use MeshStandardMaterial (physically based shading), which works out
// roughness and metal reflections for every lamp on every pixel. With several coloured lamps
// that is the single biggest cost on laptop graphics chips. Lambert shading looks almost the
// same on matte plaster, wood and cloth and is far cheaper. Shiny gold trim gets Phong so it
// still catches the light.
export function mat({ roughness, metalness = 0, ...opts } = {}) {
  if (metalness >= 0.5) {
    return new THREE.MeshPhongMaterial({ ...opts, shininess: 70, specular: '#8a6a2a' });
  }
  return new THREE.MeshLambertMaterial(opts);
}
