// ball.js - Object definition for a ball

import * as THREE             from 'three' 
import {DynamicObject}        from './dynamic-object.js'
import {Assets}               from '../assets.js'


const defaultRadius        = 20
const defaultZPosition     = 50

export class Ball extends DynamicObject {
  constructor(app, opts) {
    super(app, opts)

    this.radius = opts.radius || defaultRadius
    this.uis    = app.ui.getUiSelection();

    this.create()

  }

  create() {

    // Create the geometry for the ball
    const geometry = new THREE.SphereGeometry(this.radius, 32, 32);

    // Create the material
    const material = new THREE.MeshStandardMaterial({
      map:               Assets.textures.stainlessSteelTexture.albedo,
      roughnessMap:      Assets.textures.stainlessSteelTexture.rough,
      metalness:         0.1,
      roughness:         1,
    });

    // Create the mesh
    const mesh = new THREE.Mesh(geometry, material);

    // Move the ball away from the back a bit
    mesh.position.z = defaultZPosition;

    // If useShadows is true, then cast and receive shadows
    mesh.castShadow    = this.useShadows;
    mesh.receiveShadow = this.useShadows;

    // Add the mesh to the dynamic group
    this.group.add(mesh);

    // Do the same for the physics engine
    this.createPhysicsBody();

    // Register with the selection manager
    this.uis.registerObject(mesh, {
      moveable: true,
      onMove: (obj, pos, info) => this.onMove(obj, pos, info),
      onDown: (obj, pos, info) => this.onDown(obj, pos, info),
      onUp:   (obj, pos, info) => this.onUp(obj, pos, info),
    });

  }

  createPhysicsBody() {
    // Create the physics body
    this.body = this.app.getPhysicsEngine().createCircle(this, this.x, -this.y, this.radius, {restitution: 0.4, friction: 0.8, inertia: 0});
  }

  onMove(obj, pos, info) {
    // Change the position of the physics body
    this.app.getPhysicsEngine().setPosition(this.body, pos.x, -pos.y);
  }

  onDown(obj, pos, info) {
    this.body.setStatic();
  }

  onUp(obj, pos, info) {
    this.body.setDynamic();
  }
}