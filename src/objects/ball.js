// ball.js - Object definition for a ball

import * as THREE             from 'three' 
import {DynamicObject}        from './dynamic-object.js'


const backgroundTextureUrl = "images/textures/..."
const defaultRadius        = 0.5

export class Ball extends DynamicObject {
  constructor(app, opts) {
    super(app, opts)

    this.radius = opts.radius || defaultRadius

    this.create()

  }

  create() {

    const loader = new THREE.TextureLoader();

    this.texture = {};
    
    this.texture.albedo = loader.load("images/textures/used-stainless-steel2_small_albedo.png");
    //this.texture.normal = loader.load("images/textures/fancy-diamond-metal_small_normal-ogl.png");
    this.texture.rough  = loader.load("images/textures/used-stainless-steel2_small_roughness.png");
    //this.texture.metal  = loader.load("images/textures/fancy-diamond-metal_small_metallic.png");
    //this.texture.ao     = loader.load("images/textures/fancy-diamond-metal_small_ao.png");
    //this.texture.height = loader.load("images/textures/fancy-diamond-metal_small_height.png");

    this.texture.albedo.repeat.set(2, 2);
    this.texture.albedo.wrapS = THREE.RepeatWrapping;
    this.texture.albedo.wrapT = THREE.RepeatWrapping;


    // Create the geometry
    const geometry = new THREE.SphereGeometry(this.radius, 32, 32);

    // Create the material
    const material = new THREE.MeshStandardMaterial({
      map:          this.texture.albedo,
      //normalMap:    this.texture.normal,
      normalScale:  new THREE.Vector2( 1, - 1 ),
      roughnessMap: this.texture.rough,
      emissive: 0x006600,
      emissiveIntensity: 1.1,

      //metalnessMap: this.texture.metal,
      //aoMap:        this.texture.ao,
      //displacementMap: this.texture.height,
      metalness:    0,
      roughness:    1,
    });

    console.log("useShadows", this.useShadows)

    // Create the mesh
    this.mesh = new THREE.Mesh(geometry, material);

    // If useShadows is true, then cast and receive shadows
    this.mesh.castShadow    = this.useShadows;
    this.mesh.receiveShadow = this.useShadows;

    // Position the mesh
    this.mesh.position.x = this.x;
    this.mesh.position.y = this.y;
    this.mesh.position.z = this.radius;

    // Add the mesh to the scene
    this.scene.add(this.mesh);


  }


}