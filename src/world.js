// world.js - Top level file for handing the 3d world. This is where the scene, camera and basic lighting exist

import * as THREE           from 'three' 
import {RGBELoader}         from 'three/examples/jsm/loaders/RGBELoader.js';
import {Board}              from './objects/board.js'
import {Ball}               from './objects/ball.js'
import {Block}              from './objects/block.js'
import {Portal}             from './objects/portal.js'
import {Barrier}            from './objects/barrier.js'
import {PhysicsWorld}       from './physics/physics-world.js'
import {PhysicsWorldMatter} from './physics/physics-world-matter.js';
import {PhysicsWorldPlanck} from './physics/physics-world-planck.js';
import {Assets}             from './assets.js';
import {UI}                 from './ui.js';


const useShadows = true;
const usePlanck  = true;

export class World {
  constructor(app, opts) {
    this.app       = app
    this.el        = opts.el
    this.ui        = opts.ui
    this.doPhysics = false
    this.objects   = []

    this.create()
  }

  // Create the World
  async create() {

    // Load the assets for all the objects
    await Assets.loadAssets()

    // The physics world
    if (usePlanck) {
      this.physics = new PhysicsWorldPlanck(this.app);
      console.log("Using Planck physics engine", this.physicsWorld)
    } else {
      this.physics = new PhysicsWorldMatter(this.app);
    }
    this.app.setPhysicsEngine(this.physics);

    // Create the scene, camera, renderer and lighting
    this.scene             = new THREE.Scene()

    this.camera            = new THREE.PerspectiveCamera( 30, window.innerWidth / window.innerHeight, 0.1, 2000 )
    this.camera.position.z = 1300

    this.renderer = new THREE.WebGLRenderer({antialias: false})
    this.renderer.setPixelRatio( window.devicePixelRatio * 0.8 )
    this.renderer.setSize( window.innerWidth, window.innerHeight )

    document.body.appendChild(this.renderer.domElement)

    // Lighting
    let dirLight = new THREE.DirectionalLight( 0xffffff, 0.8 );
    dirLight.position.set(1000, 1000, 1500)
    this.scene.add( dirLight );
    this.scene.add(new THREE.AmbientLight(0xffffff,0.40));

    // Optionally enable shadows
    if (useShadows) {
      this.renderer.shadowMap.enabled           = true;
      this.renderer.shadowMap.type              = THREE.PCFSoftShadowMap;
      this.renderer.shadowMap.renderSingleSided = true
      dirLight.castShadow                       = true;
      dirLight.shadow.mapSize.width             = 1024
      dirLight.shadow.mapSize.height            = 1024
      dirLight.shadow.camera.near               = -5.5
      dirLight.shadow.camera.far                = 3000
      dirLight.shadow.blurSamples               = 8;
      dirLight.shadow.radius                    = 0.5
      dirLight.shadow.camera.right              = 500
			dirLight.shadow.camera.left               = -500
			dirLight.shadow.camera.top	              = 500
			dirLight.shadow.camera.bottom             = -500

      if (false) {
        const cameraHelper = new THREE.CameraHelper(dirLight.shadow.camera);
        this.scene.add(cameraHelper);
      }
    }
         
    // Also create the board
    this.board = new Board(this.app, {scene: this.scene, x1: -500, y1: -300, x2: 500, y2: 300, useShadows: useShadows});
    this.animate()

    // Temp create a ball
    let ball = new Ball(this.app, {scene: this.scene, x: -300, y: 250, radius: 20, useShadows: useShadows});
    new Ball(this.app, {scene: this.scene, x: -200, y: 180, radius: 21, useShadows: useShadows});
    new Block(this.app, {scene: this.scene, x: 50, y: 230, rotation: 0, angle: 0, useShadows: useShadows});
    new Block(this.app, {scene: this.scene, x: 0, y: 230, rotation: 0, angle: 0, useShadows: useShadows});
    new Block(this.app, {scene: this.scene, x: -50, y: 230, rotation: 0, angle: 0, useShadows: useShadows});
    new Block(this.app, {scene: this.scene, x: -100, y: 230, rotation: 0, angle: 0, useShadows: useShadows});
    //new Ball(this.app, {scene: this.scene, x: -200, y: 200, radius: 0.5, useShadows: useShadows});
    new Barrier(this.app, {
      scene: this.scene, 
      points: [
        new THREE.Vector2(-400, 200),
        new THREE.Vector2(100, 180),
        new THREE.Vector2(400, 75),
      ], 
      useShadows: useShadows
    });

    new Barrier(this.app, {
      scene: this.scene, 
      points: [
        new THREE.Vector2(480, 10),
        new THREE.Vector2(-200, -100),
        new THREE.Vector2(-400, -150),
        new THREE.Vector2(480, -150),
        new THREE.Vector2(480, 10),
      ], 
      useShadows: useShadows
    });
    // Temp create a portal
    let portal1 = new Portal(this.app, {scene: this.scene, x: -200, y: 0, radius: 0.5, useShadows: useShadows, color: 0x0000ff, rotation: 0});
    let portal2 = new Portal(this.app, {scene: this.scene, x:  400, y: 0, radius: 0.5, useShadows: useShadows, color: 0xffab00, rotation: Math.PI});
    let portal3 = new Portal(this.app, {scene: this.scene, x:  500, y: -400, radius: 0.5, useShadows: useShadows, color: 0x00ffff, rotation: Math.PI});

    // Set the camera and scene in the UI
    this.ui.setCamera(this.camera)
    this.ui.setScene(this.scene)

    // Finally, add the pointer events
    this.ui.addPointerEvents(this.renderer.domElement);

  }

  addObject(type, opts) {
    const typeToClass = {
      ball: Ball,
      block: Block,
      barrier: Barrier,
      portal: Portal,
    }

    opts.scene = this.scene;
    opts.useShadows = useShadows;

    let obj = new typeToClass[type](this.app, opts);

    // Put it on our list of objects
    this.objects.push(obj);

    return obj;
  }

  removeObject(obj) {
    // Remove it from our list of objects
    obj.destroy();
    this.objects = this.objects.filter(o => o !== obj);
  }

  play() {
    this.paused = false;
  }

  pause() {
    this.paused = true;
  }

  animate() {
    this.animationFrameId = requestAnimationFrame((time) => {
      this.animate()
      if (1 || this.doPhysics) {
        if (!this.paused) {
          this.app.getPhysicsEngine().doPhysics(time)
        }
      }
      else {
        this.lastTime = this.lastTime || time
        let dt = (time - this.lastTime) / 1000
        //console.log("dt", dt, time, this.lastTime)
        if (dt > 4) {
          this.doPhysics = true
        }
        //this.lastTime = time
      }
    }) 
    this.renderer.render(this.scene, this.camera)
  }

}