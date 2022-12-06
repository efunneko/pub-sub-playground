// world.js - Top level file for handing the 3d world. This is where the scene, camera and basic lighting exist

import * as THREE           from 'three' 
import {RGBELoader}         from 'three/examples/jsm/loaders/RGBELoader.js';
import {Board}              from './objects/board.js'
import {Ball}               from './objects/ball.js'
import {Block}              from './objects/block.js'
import {Portal}             from './objects/portal.js'
import {Barrier}            from './objects/barrier.js'
import {Note}               from './objects/note.js'
import {Broker}             from './objects/broker.js'
import {Emitter}            from './objects/emitter.js'
import {PhysicsWorld}       from './physics/physics-world.js'
import {PhysicsWorldMatter} from './physics/physics-world-matter.js';
import {PhysicsWorldPlanck} from './physics/physics-world-planck.js';
import {Assets}             from './assets.js';
import {UI}                 from './ui.js';
import {utils}              from './utils.js';


const useShadows = true;
const usePlanck  = true;

const ObjectTypeToClass = {
  'board':   Board,
  'ball':    Ball,
  'block':   Block,
  'portal':  Portal,
  'barrier': Barrier,
  'note':    Note,
  'broker':  Broker,
  'emitter': Emitter,
};

export class World {
  constructor(app, opts) {
    this.app              = app
    this.el               = opts.el
    this.ui               = opts.ui
    this.doPhysics        = false
    this.objects          = []  
    this.ephemeralObjects = []  // Objects that are not saved in the world state

    // Stores reference counts for objects by guid
    this.objectsByGuid = {}    

    // Maximum number of allowed copies of an object
    // A copy can occur when an object is received from 2 or more portals
    this.maxCopies = 2

    this.create()
  }

  // Create the World
  async create() {

    // Load the assets for all the objects
    await Assets.loadAssets()

    // The physics world
    if (usePlanck) {
      this.physics = new PhysicsWorldPlanck(this.app);
    } else {
      this.physics = new PhysicsWorldMatter(this.app);
    }
    this.app.setPhysicsEngine(this.physics);

    // Create the scene, camera, renderer and lighting
    this.scene             = new THREE.Scene()

    this.camera            = new THREE.PerspectiveCamera( 30, window.innerWidth / window.innerHeight, 0.1, 2000 )
    this.camera.position.z = 1300

    this.renderer = new THREE.WebGLRenderer({antialias: false})
    //    this.renderer.setPixelRatio( window.devicePixelRatio * 0.8 )
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
      if (0) {
        dirLight.shadow.mapSize.width             = 1024
        dirLight.shadow.mapSize.height            = 1024
      }
      else {
        dirLight.shadow.mapSize.width             = 512
        dirLight.shadow.mapSize.height            = 512
      }
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

    /*
    // Temp create a ball
    this.addObject("ball", {x: -300, y: 250, radius: 20});
    this.addObject("ball", {x: -200, y: 180, radius: 21});
    this.addObject("block",  {x: 50, y: 230, rotation: 0, angle: 0});
    this.addObject("block",  {x: 0, y: 230, rotation: 0, angle: 0});
    this.addObject("block",  {x: -50, y: 230, rotation: 0, angle: 0});
    this.addObject("block",  {x: -100, y: 230, rotation: 0, angle: 0});
    this.addObject("note",   {x: 0, y: 0, rotation: 0, angle: 0, text: "Hello World\nIt is great to see you!"});
    this.addObject("broker", {x: 0, y: -300});

    this.addObject("barrier", {
      points: [
        new THREE.Vector2(-400, 200),
        new THREE.Vector2(100, 180),
        new THREE.Vector2(400, 75),
      ], 
    });

    this.addObject("barrier", {
      points: [
        new THREE.Vector2(480, 10),
        new THREE.Vector2(-200, -100),
        new THREE.Vector2(-400, -150),
        new THREE.Vector2(480, -150),
        new THREE.Vector2(480, 10),
      ], 
    });

    // Temp create a portal
    this.addObject("portal", {x: -200, y: 0, radius: 0.5, color: 0x0000ff, rotation: 0});
    this.addObject("portal", {x:  400, y: 0, radius: 0.5, color: 0xffab00, rotation: Math.PI});
    this.addObject("portal", {x:  500, y: -400, radius: 0.5, color: 0x00ffff, rotation: Math.PI});

    */
    // Set the camera and scene in the UI
    this.ui.setCamera(this.camera)
    this.ui.setScene(this.scene)

    // Finally, add the pointer events
    this.ui.addPointerEvents(this.renderer.domElement);

    this.app.loadConfig();

  }

  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize( window.innerWidth, window.innerHeight );
  }

  addObject(type, opts, guid, ephemeral) {

    if (!guid) {
      guid = utils.guid();
    }

    const cls = ObjectTypeToClass[type];

    if (!cls) {
      console.error("Unknown object type", type);
      return;
    }
    
    opts.scene = this.scene;
    opts.useShadows = useShadows;

    let obj = new cls(this.app, opts);
    obj.guid = guid;

    // Put it on our list of objects
    if (!ephemeral) {
      this.objects.push({type: type, object: obj});
    }
    else {
      this.ephemeralObjects.push({type: type, object: obj});
    }

    return obj;
  }

  addObjectFromMessage(messagePayload, topic) {

    const guid = messagePayload.guid;

    // If we prevent duplicates, then check if we already have this object
    if (this.objectsByGuid[guid] && this.objectsByGuid[guid] >= this.maxCopies) {
      return;
    }

    console.log("Adding object", messagePayload, topic);
    let obj = this.addObject(messagePayload.type, messagePayload, guid, true);
    obj.topic = topic;

    this.objectsByGuid[guid] = this.objectsByGuid[guid] ? this.objectsByGuid[guid]++ : 1;

    return obj;
  }

  addEphemeralObject(type, opts) {
    return this.addObject(type, opts, undefined, true);
  }

  removeObject(obj) {
    // Remove it from our list of objects
    obj.destroy();
    this.objects = this.objects.filter(o => o.object !== obj);

    // Remove it from our list of objects by guid
    if (obj.guid) {
      this.objectsByGuid[obj.guid]--;
      if (this.objectsByGuid[obj.guid] <= 0) {
        delete this.objectsByGuid[obj.guid];
      }
    }
  }

  play() {
    this.paused = false;
  }

  pause() {
    this.paused = true;
  }

  reset() {
    this.objects.forEach(o => {
      this.removeObject(o.object)
    });
    this.ephemeralObjects.forEach(o => {
      this.removeObject(o.object)
    });
    this.app.loadConfig();

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

  // Return all the configuration for all the objects
  getConfig() {
    let config = {
      objects: [],
    }

    for (let obj of this.objects) {
      const cfg = obj.object.getConfig() || {};
      cfg.type  = obj.type;
      config.objects.push(cfg);
    }

    return config;
  }

  // Set the configuration for all the objects
  setConfig(config) {
    let count = 0;
    for (let obj of config.objects) {
      if (count++ < 20) {
        this.addObject(obj.type, obj);
      }
    }
  }

}