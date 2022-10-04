// portal.js - Object definition for a portal

import * as THREE             from 'three' 
import {StaticObject}         from './static-object.js'


const backgroundTextureUrl = "images/textures/..."
const torusRadius          = 1
const torusTubeRadius      = 0.15
const backTubeLength       = 2
const defaultColor         = 0x0000ff
const defaultRotation      = 0


export class Portal extends StaticObject {
  constructor(app, opts) {
    super(app, opts)

    this.radius   = opts.radius   || defaultRadius
    this.color    = opts.color    || defaultColor
    this.rotation = opts.rotation || defaultRotation

    this.create()

  }

  create() {

    const loader = new THREE.TextureLoader();

    this.woodTexture = {};
    
    this.woodTexture.albedo = loader.load("images/textures/TexturesCom_Wood_Rough_1K_albedo.png");
    this.woodTexture.normal = loader.load("images/textures/TexturesCom_Wood_Rough_1K_normal.png");
    this.woodTexture.rough  = loader.load("images/textures/TexturesCom_Wood_Rough_1K_roughness.png");

    this.createTorus();
    this.createPointLight();
    this.createMist();
    this.createTube();
    this.createBack();
    
    this.group.position.set(this.x, this.y, 0);
    this.group.rotation.z = this.rotation;

  }

  createTorus() {

    // Create the geometry
    const geometry = new THREE.TorusGeometry(this.app.scale(torusRadius), this.app.scale(torusTubeRadius), 8, 32);
    console.log("geometry", geometry)

    // Create the material
    const material = new THREE.MeshPhysicalMaterial({
      clearcoat: 1,
      clearcoatRoughness: 0,
      metalness: 0.5,
      roughness: 0.5,
      emissive: this.color,
      emissiveIntensity: 1.5,
      reflectivity: 0.5,
      transmission: 0.5,
      transparent: true,
      opacity: 0.8,
      attenuationColor: 0xffffff,
      attenuationDistance: 0.5,

    });

    // Create the mesh
    this.mesh = new THREE.Mesh(geometry, material);

    // If useShadows is true, then cast and receive shadows
    this.mesh.castShadow    = this.useShadows;
    this.mesh.receiveShadow = this.useShadows;

    // Position the mesh
    this.mesh.position.x = 0;
    this.mesh.position.y = 0;
    this.mesh.position.z = this.app.scale(torusRadius);

    this.mesh.rotation.x = Math.PI/2;
    this.mesh.rotation.y = Math.PI/2;

    // Add the mesh to the scene
    this.group.add(this.mesh);

  }

  createPointLight() {
    const pointLight = new THREE.PointLight(this.color, 3.3, this.app.scale(4));
    //const pointLight = new THREE.PointLight(this.color, 1.3, 500);
    pointLight.position.set(this.app.scale(0.5), 0, this.app.scale(torusRadius/2));
    pointLight.decay = 2
    this.group.add(pointLight);
  }

  createMist() {

    const tr = this.app.scale(torusRadius)
    const geometry = new THREE.CylinderGeometry(tr, tr, tr, 8, 1, false);
    //const geometry = new THREE.SphereGeometry(1, torusRadius, 32);
    console.log("geometry", geometry)
    const material = new THREE.MeshPhysicalMaterial( { 
      color: 0x000000, 
      attenuationColor: 0xffffff,
      attenuationDistance: 0.1,
      transparent: true,
      transmission: 0.5,
      opacity: 0.8,
      side: THREE.DoubleSide } );
    const mesh = new THREE.Mesh( geometry, material );

    mesh.position.set(-tr/2, 0, tr);
    mesh.rotation.x = Math.PI/2;
    mesh.rotation.z = Math.PI/2;
    mesh.castShadow    = this.useShadows;

    //mesh.rotation.y = -Math.PI/2;

    this.group.add( mesh ); 
    console.log("mesh", mesh)
  }

  createTube() {

    const tr = this.app.scale(torusRadius)
    const btl = this.app.scale(backTubeLength)

    // Create a path for the tube
    const path = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(btl, 0, 0),
    ]);

    const geometry = new THREE.TubeGeometry(path, 3, tr+this.app.scale(0.1), 32, false);

    const material = new THREE.MeshStandardMaterial( { 
      map: this.woodTexture.albedo,
      normalMap: this.woodTexture.normal,
      roughnessMap: this.woodTexture.rough,
      roughness: 0.5,
      metalness: 0,
      //side: THREE.DoubleSide 
    });
    const mesh = new THREE.Mesh( geometry, material );

    mesh.position.set(-btl, 0, tr);
    mesh.castShadow    = this.useShadows;
    mesh.receiveShadow = this.useShadows;

    this.group.add( mesh ); 

  }

  createBack() {

    const tr = this.app.scale(torusRadius)
    const size = this.app.scale(torusRadius*2+0.2)
    const btl = this.app.scale(backTubeLength)

    const geometry = new THREE.BoxGeometry(size/8, size, size);

    const material = new THREE.MeshStandardMaterial( { 
      map: this.woodTexture.albedo,
      normalMap: this.woodTexture.normal,
      roughnessMap: this.woodTexture.rough,
      roughness: 0.5,
      metalness: 0,
      //side: THREE.DoubleSide 
    });
    const mesh = new THREE.Mesh( geometry, material );

    mesh.position.set(-btl-0.25, 0, tr);
    mesh.castShadow    = this.useShadows;
    mesh.receiveShadow = this.useShadows;

    this.group.add( mesh ); 


  }

}