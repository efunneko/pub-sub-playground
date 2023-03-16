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
    super(app, opts, [
      {name: 'width',  type: 'numberRange', min: 5, max: 80, step: 5, label: 'Width', default: defaultWidth},
      {name: 'height', type: 'numberRange', min: 5, max: 80, step: 5, label: 'Height', default: defaultHeight},
      {name: "rotation", type: "numberRange", min: 0, max: 3.14, step: 0.05, eventLabels: ["rotation"], label: "Rotation", default: 0},
      {name: 'friction',  type: 'text', label: 'Friction (0-1)', default: 0.2},
      {name: 'color',  type: 'color', label: 'Color', default: '#f0e6d6'},
      {name: "forceTopic", type: "boolean", label: "Force Topic", title: "Use the configured topic when going through a portal", default: false},
      {name: "topic", type: "text", width: 50, label: "Topic", title: "If Force Topic is true, this topic is used when going through a portal", default: ""},
      {name: "x", type: "hidden", eventLabels: ["position"]},
      {name: "y", type: "hidden", eventLabels: ["position"]},
    ],
    // UI Selection parameters
    {
      moveable: true,
      selectable: true,
      onMove: (obj, pos, info) => this.onMove(obj, pos, info),
      onDown: (obj, pos, info) => this.onDown(obj, pos, info),
      onUp:   (obj, pos, info) => this.onUp(obj, pos, info),
      onSelected: (obj) => obj.material = new THREE.MeshStandardMaterial({color: 0xf0e686, emissive: 0x333308}),
      onUnselected: (obj) => obj.material = new THREE.MeshStandardMaterial({color: 0xf0e6d6, emissive: 0x000000}),
      onDelete: (obj) => this.removeFromWorld(),
    })

    this.type        = "block"

    this.isSubObject = opts.isSubObject || false
    this.depth       = defaultDepth;
    this.edgeRadius  = 3;
    this.uis         = app.ui.getUiSelection();

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

  onAppearanceChange() {
    if (this.colors.length > 0) {
      this.color = this.colors[0];      
    }
    super.onAppearanceChange();
  }

}