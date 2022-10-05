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
      //map:               Assets.textures.stainlessSteelTexture.albedo,
      roughnessMap:      Assets.textures.stainlessSteelTexture.rough,
      // ivory color
      color:             0xf0e6d6,
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
    this.app.getPhysicsEngine().setPosition(this.body, pos.x, -pos.y);
  }

  onDown(obj, pos, info) {
    this.body.setStatic();
  }

  onUp(obj, pos, info) {
    this.body.setDynamic();
  }
}