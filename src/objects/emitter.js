// emitter.js - An object that will act like a ball gun

import * as THREE     from 'three'
import {StaticObject} from './static-object.js'
import {Assets}       from '../assets.js'
import {utils}        from '../utils.js'
import {Ball}         from './ball.js'

export class Emitter extends StaticObject {
  constructor(app, opts) {
    super(app, opts);

    this.uis    = app.ui.getUiSelection();

    this.configParams = this.initConfigParams([
      {name: "x", type: "hidden"},
      {name: "y", type: "hidden"},
      {name: "rotation", type: "hidden"},

    ])

    this.create();
  }

  create() {
    super.create();
    this.createEmitterBody();
    this.createButtons();
  }

  createEmitterBody() {

    // Create the geometry for the emitter
    const geometry = new THREE.BoxGeometry(1, 1, 1);

    // Create the material
    const material = new THREE.MeshStandardMaterial({
      map:               Assets.getTexture('emitter'),
      metalness:         0.1,
      roughness:         1,
    });

    // Create the mesh
    const mesh = new THREE.Mesh(geometry, material);

    // If useShadows is true, then cast and receive shadows
    mesh.castShadow    = this.useShadows;
    mesh.receiveShadow = this.useShadows;

    // Add the mesh to the group
    this.group.add(mesh);

  }

  createButtons() {

    // We have the following buttons:
    //   * Fire one ball
    //   * Start/Stop continuous firing

    this.createButton({
      x: -10,
      y: 0,
      texture: Assets.getTexture('singleShot'),
      onDown: (obj, pos, info) => this.singleShot(obj, pos, info),
    });

    this.createButton({
      x: 10,
      y: 0,
      texture: Assets.getTexture('play'),
      onDown: (obj, pos, info) => this.startStopShot(obj, pos, info),
      selectedTexture: Assets.getTexture('pause'),
    });

  }

  createButton(opts) {

    // UI selection info
    const uisInfo = {
      selectable:        true,
      selectedMaterial:  opts.selectedTexture ? new THREE.MeshStandardMaterial({map: opts.selectedTexture}) : undefined,
      onDown:            (obj, pos, info) => opts.onDown(obj, pos, info),
    };

    // Create the geometry for the button
    const geometry = new THREE.BoxGeometry(1, 1, 1);

    // Create the material
    const material = new THREE.MeshStandardMaterial({
      map:               opts.texture,
      metalness:         0.1,
      roughness:         1,
    });

    // Create the mesh
    const mesh = new THREE.Mesh(geometry, material);

    // If useShadows is true, then cast and receive shadows
    mesh.castShadow    = this.useShadows;
    mesh.receiveShadow = this.useShadows;

    // Add the mesh to the UI system
    this.uis.registerObject(mesh, uisInfo);

    // Move the mesh
    mesh.position.set(opts.x, opts.y, 0);

    // Add the mesh to the group
    this.group.add(mesh);

  }


  // Fire a ball from the emitter
  fireBall() {
    // Create a ball
    new Ball(this.app, {scene: this.scene, x: this.x, y: this.y, radius: 21, useShadows: this.useShadows, velocity: {x: 2, y: 0}});
  }
}
