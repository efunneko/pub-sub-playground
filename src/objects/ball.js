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
    this.color  = opts.color || 0xffffff
    this.uis    = app.ui.getUiSelection();

    this.configParams = this.initConfigParams([
      {name: "x", type: "hidden", eventLabels: ["position"]},
      {name: "y", type: "hidden", eventLabels: ["position"]},
      {name: "rotation", type: "hidden", eventLabels: ["rotation"]},      
      {name: "radius", type: "text", width: 5, label: "Radius", eventLabels: ["appearance"]},
      {name: "color", type: "color", label: "Color", eventLabels: ["appearance"]},
      {name: "forceTopic", type: "boolean", label: "Force Topic", eventLabels: ["topic"], title: "Use the configured topic when going through a portal"},
      {name: "topic", type: "text", width: 50, label: "Topic", eventLabels: ["topic"], title: "If Force Topic is true, this topic is used when going through a portal"},
    ])

    this.create()

    // This is necessary to run in the case when physics is disabled
    this.setValues({
      x: this.x,
      y: this.y,
      rotation: this.rotation,
    })

    this.setInitialVelocity(opts)

  }

  create() {
    super.create();

    console.log('Ball.create', this, this.x, this.y);

    // Create the geometry for the ball
    const geometry = new THREE.SphereGeometry(this.radius, 32, 32);

    // Create the material
    const material = new THREE.MeshStandardMaterial({
      map:               Assets.textures.stainlessSteelTexture.albedo,
      roughnessMap:      Assets.textures.stainlessSteelTexture.rough,
      metalness:         0.1,
      roughness:         1,
    });

    if (this.color) {
      // set the emissive color to the color of the ball
      material.emissive = new THREE.Color(this.color);
      material.emissiveIntensity = 0.1;
      material.color.set(this.color);      
    }

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
    mesh.userData.physicsBodies = [this.createPhysicsBody()];

    // Register with the selection manager
    this.uis.registerObject(mesh, {
      moveable: true,
      selectable: true,
      onMove:   (obj, pos, info) => this.onMove(obj, pos, info),
      onDown:   (obj, pos, info) => this.onDown(obj, pos, info),
      onUp:     (obj, pos, info) => this.onUp(obj, pos, info),
      onDelete: (obj) => this.removeFromWorld(),
      configForm: {
        save: (form) => this.saveConfigForm(form),
        obj: this,
        fields: this.configParams
      }
    });

  }

  createPhysicsBody() {
    // Create the physics body
    this.body = this.app.getPhysicsEngine().createCircle(this, this.x, -this.y, this.radius, {restitution: 0.4, friction: 0.8, inertia: 0});
    return this.body;
  }

  onMove(obj, pos, info) {
    // Change the position of the physics body
    this.group.position.x += info.deltaPos.x;
    this.group.position.y += info.deltaPos.y;

    this.app.getPhysicsEngine().setPosition(this.body, this.group.position.x, -this.group.position.y);
  }

  onDown(obj, pos, info) {
    this.body.setStatic();
  }

  onUp(obj, pos, info) {
    this.body.setDynamic();
    this.saveableConfigChanged();
  }
}