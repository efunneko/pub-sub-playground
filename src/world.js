// world.js - Top level file for handing the 3d world. This is where the scene, camera and basic lighting exist

import * as THREE     from 'three' 
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import {Board}        from './objects/board.js'
import {Ball}         from './objects/ball.js'
import {Portal}       from './objects/portal.js'

const useShadows = true;

export class World {
  constructor(app, opts) {
    this.app = app
    this.el  = opts.el

    this.create()
  }

  // Create the World
  async create() {

    this.scene  = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 1000 )

    this.renderer = new THREE.WebGLRenderer()
    this.renderer.setSize( window.innerWidth, window.innerHeight )


    document.body.appendChild(this.renderer.domElement)

    this.camera.position.z = 28

    //const light = new THREE.PointLight( 0xff0000, 1, 100 );
    //light.position.set( 10, 0, 50 );
    //this.scene.add( light );    

    let dirLight = new THREE.DirectionalLight( 0xffffff, 0.8 );
    dirLight.position.set(10, 10, 20);
    this.scene.add( dirLight );

    //await this.loadRGBEnvMap()

    
    // Ambient Light
    this.scene.add(new THREE.AmbientLight(0xffffff,0.40));

    // Optionally enable shadows
    if (useShadows) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.shadowMap.renderSingleSided = false
      dirLight.castShadow = true;
      dirLight.shadow.mapSize.width = 512;
      dirLight.shadow.mapSize.height = 512;
      dirLight.shadow.camera.near = -5.5;
      dirLight.shadow.camera.far = 50;
      dirLight.shadow.blurSamples = 4;
      dirLight.shadow.radius      = 1.5;
      dirLight.shadow.camera.right = 20;
			dirLight.shadow.camera.left = - 20;
			dirLight.shadow.camera.top	= 20;
			dirLight.shadow.camera.bottom = - 20;

      if (false) {
        const cameraHelper = new THREE.CameraHelper(dirLight.shadow.camera);
        this.scene.add(cameraHelper);
      }
    }
         
    // Also create the board
    this.board = new Board(this.app, {scene: this.scene, x1: -10, y1: -10, x2: 10, y2: 2, useShadows: useShadows});
    this.animate()

    // Temp create a ball
    let ball = new Ball(this.app, {scene: this.scene, x: -1, y: -2, radius: 0.5, useShadows: useShadows});

    // Temp create a portal
    let portal1 = new Portal(this.app, {scene: this.scene, x: -2, y: 0, radius: 0.5, useShadows: useShadows, color: 0x0000ff, rotation: 0});
    let portal2 = new Portal(this.app, {scene: this.scene, x:  4, y: 0, radius: 0.5, useShadows: useShadows, color: 0xffab00, rotation: Math.PI});
    let portal3 = new Portal(this.app, {scene: this.scene, x:  5, y: -4, radius: 0.5, useShadows: useShadows, color: 0x00ffff, rotation: Math.PI});

  }

  loadRGBEnvMap() {
    //let env = "studio_small_08_2k.hdr";
    let env = "studio_country_hall_2k.hdr";

    return new Promise((resolve, reject) => {  
      new RGBELoader()
      .setPath( 'images/textures/' )
      .load(env, (texture) => {

        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.flipY = true;

        this.scene.background = new THREE.Color(0xccccaa);
        this.renderer.setClearColor(0xccccaa, 1);
        this.scene.environment = texture;

        console.log("Loaded env map")
        resolve();

      });
    });

  }


  animate() {
    requestAnimationFrame(() => this.animate())
    this.renderer.render(this.scene, this.camera)
  }

}