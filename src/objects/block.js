// block.js - Object definition for a block

import * as THREE             from 'three' 
import {DynamicObject}        from './dynamic-object.js'
import {Assets}               from '../assets.js'
import {utils}                from '../utils.js'


const defaultDepth         = 60
const defaultWidth         = 15
const defaultHeight        = 70
const defaultZPosition     = 40

export class Block extends DynamicObject {
  constructor(app, opts) {
    super(app, opts)

    this.width      = opts.width  || defaultWidth
    this.height     = opts.height || defaultHeight
    this.depth      = opts.depth  || defaultDepth
    this.color      = opts.color  || "#f0e6d6"
    this.edgeRadius = opts.edgeRadius || 3
    this.friction   = opts.friction || 0.2
    this.uis        = app.ui.getUiSelection();

    this.configParams = this.initConfigParams([
      {name: 'width',  type: 'numberRange', min: 5, max: 80, step: 5, label: 'Width'},
      {name: 'height', type: 'numberRange', min: 5, max: 80, step: 5, label: 'Height'},
      {name: "rotation", type: "numberRange", min: 0, max: 3.14, step: 0.05, eventLabels: ["rotation"], label: "Rotation"},      
      // We can only enable this if we match the same shape in planck
      //{name: 'edgeRadius', type: 'text', label: 'Edge Radius'},
      {name: 'friction',  type: 'text', label: 'Friction (0-1)'},
      {name: 'color',  type: 'color', label: 'Color'},
      {name: "forceTopic", type: "boolean", label: "Force Topic", eventLabels: ["topic"], title: "Use the configured topic when going through a portal"},
      {name: "topic", type: "text", width: 50, label: "Topic", eventLabels: ["topic"], title: "If Force Topic is true, this topic is used when going through a portal"},
      {name: "x", type: "hidden", eventLabels: ["position"]},
      {name: "y", type: "hidden", eventLabels: ["position"]},
    ]);

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

    // Create the geometry for the ball
    //const geometry = new THREE.BoxGeometry(this.width, this.height, this.depth);
    const geometry = utils.createRoundedBoxGeometry(this.width, this.height, this.depth, this.edgeRadius, 8);

    // Create the material
    const material = new THREE.MeshStandardMaterial({
      roughnessMap:      Assets.textures.stainlessSteelTexture.rough,
      color:             this.color,
      metalness:         0.1,
      roughness:         1,
    });

    // Create the mesh
    this.mesh = new THREE.Mesh(geometry, material);

    // Move the ball away from the back a bit
    this.mesh.position.z = defaultZPosition;

    // If useShadows is true, then cast and receive shadows
    this.mesh.castShadow    = this.useShadows;
    this.mesh.receiveShadow = this.useShadows;

    // Add the mesh to the dynamic group
    this.group.add(this.mesh);

    // Do the same for the physics engine
    this.createPhysicsBody();

    // Register with the selection manager
    this.uis.registerObject(this.mesh, {
      moveable: true,
      selectable: true,
      //selectedMaterial: new THREE.MeshStandardMaterial({color: 0x00ff00}),
      onMove: (obj, pos, info) => this.onMove(obj, pos, info),
      onDown: (obj, pos, info) => this.onDown(obj, pos, info),
      onUp:   (obj, pos, info) => this.onUp(obj, pos, info),
      onSelected: (obj) => obj.material = new THREE.MeshStandardMaterial({color: 0xf0e686, emissive: 0x333308}),
      onUnselected: (obj) => obj.material = new THREE.MeshStandardMaterial({color: 0xf0e6d6, emissive: 0x000000}),
      onDelete: (obj) => this.removeFromWorld(),
      configForm: {
        save: (form) => this.saveConfigForm(form),
        obj: this,
        fields: this.configParams
      }
    });

  }

  destroy() {
    super.destroy();
  }

  createPhysicsBody() {
    // Create the physics body
    this.body = this.app.getPhysicsEngine().createBox(this, this.x, -this.y, this.width, this.height, {angle: -this.rotation, restitution: 0.1, friction: this.friction, inertia: 0});
    this.mesh.userData.physicsBody = this.body;
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

  saveConfigForm(form) {
    this.setValues(form);
    this.destroy();
    this.create();
    this.saveableConfigChanged();
  }
}