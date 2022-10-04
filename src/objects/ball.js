// ball.js - Object definition for a ball

import * as THREE             from 'three' 
import {DynamicObject}        from './dynamic-object.js'


const backgroundTextureUrl = "images/textures/..."
const defaultRadius        = 20
const defaultZPosition     = 50

export class Ball extends DynamicObject {
  constructor(app, opts) {
    super(app, opts)

    this.radius = opts.radius || defaultRadius

    this.create()

  }

  create() {

    // Get all the textures
    this.loadTextures();

    // Create the geometry for the ball
    const geometry = new THREE.SphereGeometry(this.radius, 32, 32);

    // Create the material
    const material = new THREE.MeshStandardMaterial({
      map:               this.texture.albedo,
      roughnessMap:      this.texture.rough,
      //emissive:          0x006600,
      //emissiveIntensity: 1.1,
      metalness:         0.1,
      roughness:         1,
    });

    // Create the mesh
    const mesh = new THREE.Mesh(geometry, material);

    mesh.position.z = defaultZPosition;

    // If useShadows is true, then cast and receive shadows
    mesh.castShadow    = this.useShadows;
    mesh.receiveShadow = this.useShadows;

    // Add the mesh to the dynamic group
    this.group.add(mesh);

    // Do the same for the physics engine
    this.createPhysicsBody();

  }

  createPhysicsBody() {

    // Create the physics body
    this.body = this.app.getPhysicsEngine().createCircle(this, this.x, -this.y, this.radius, {restitution: 0.4, friction: 0.8, inertia: 0});
    
  }

  loadTextures() {
      
      const loader = new THREE.TextureLoader();
  
      this.texture = {};
      
      this.texture.albedo = loader.load("images/textures/used-stainless-steel2_small_albedo.png");
      this.texture.rough  = loader.load("images/textures/used-stainless-steel2_small_roughness.png");
  
    }


}