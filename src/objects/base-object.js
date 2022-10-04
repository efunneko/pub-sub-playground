// base-object.js - Base class for all objects

// This class (along with specialization in sub-classes) will handle both the interaction with the physics engine
// and the 3D rendering engine

import * as THREE from 'three';


export class BaseObject {
  constructor(app, opts) {
    this.app  = app
    this.opts = Object.assign({}, opts)

    // Threejs scene for 3d rendering
    this.scene  = opts.scene;

    // Matterjs for physics stuff
    this.matter = opts.matter;

    // We can optionally have shadows
    this.useShadows = opts.useShadows;

    // Create a group to hold all the sub-meshes
    this.group = new THREE.Group();

    // Add the group to the scene
    this.scene.add(this.group);

  }

  static loadAssets() {
    return Promise.resolve();
  }

}