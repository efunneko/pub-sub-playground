// block.js - Object definition for a block

import * as THREE             from 'three' 
import {DynamicObject}        from './dynamic-object.js'
import {Assets}               from '../assets.js'


const defaultDepth         = 60
const defaultWidth         = 15
const defaultHeight        = 70
const defaultZPosition     = 40

export class Block extends DynamicObject {
  constructor(app, opts) {
    super(app, opts)

    this.width  = opts.width  || defaultWidth
    this.height = opts.height || defaultHeight
    this.depth  = opts.depth  || defaultDepth
    this.uis    = app.ui.getUiSelection();

    this.create()

  }

  create() {

    // Create the geometry for the ball
    //const geometry = new THREE.BoxGeometry(this.width, this.height, this.depth);
    const geometry = this.createRoundedBoxGeometry(this.width, this.height, this.depth, 3, 8);

    // Create the material
    const material = new THREE.MeshStandardMaterial({
      roughnessMap:      Assets.textures.stainlessSteelTexture.rough,
      // ivory color
      color:             0xf0e6d6,
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
      onDelete: (obj) => this.destroy()
    });

  }

  destroy() {
    console.log("Destroying block");
    this.app.getPhysicsEngine().removeBody(this.body);
    this.group.remove(this.mesh);
    this.uis.unregisterObject(this.mesh);
  }

  createPhysicsBody() {
    // Create the physics body
    this.body = this.app.getPhysicsEngine().createBox(this, this.x, -this.y, this.width, this.height, {restitution: 0.1, friction: 0.2, inertia: 0});
  }

  createRoundedBoxGeometry(width, height, depth, radius0, smoothness) {
    let shape = new THREE.Shape();
    let eps = 0.00001;
    let radius = radius0 - eps;
    shape.absarc( eps, eps, eps, -Math.PI / 2, -Math.PI, true );
    shape.absarc( eps, height -  radius * 2, eps, Math.PI, Math.PI / 2, true );
    shape.absarc( width - radius * 2, height -  radius * 2, eps, Math.PI / 2, 0, true );
    shape.absarc( width - radius * 2, eps, eps, 0, -Math.PI / 2, true );
    let geometry = new THREE.ExtrudeGeometry( shape, {
      steps: 1,
      depth: depth - radius0 * 2,
      bevelEnabled: true,
      bevelSegments: smoothness * 2,
      bevelSize: radius,
      bevelThickness: radius0,
      curveSegments: smoothness
    });
    
    geometry.center();
    
    return geometry;
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
  }
}