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
import {Group}              from './objects/group.js'
import {PhysicsWorld}       from './physics/physics-world.js'
import {PhysicsWorldMatter} from './physics/physics-world-matter.js';
import {PhysicsWorldPlanck} from './physics/physics-world-planck.js';
import {Assets}             from './assets.js';
import {UI}                 from './ui.js';
import {utils}              from './utils.js';

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
  'group':   Group,
};

export class World {
  constructor(app, opts) {
    this.app              = app
    this.el               = opts.el
    this.ui               = opts.ui
    this.doPhysics        = false
    this.animateSeqNum    = 0
    this.objects          = []  
    this.ephemeralObjects = []  // Objects that are not saved in the world state

    // Stores reference counts for objects by guid
    this.objectsByGuid = {}    

    // Maximum number of allowed copies of an object
    // A copy can occur when an object is received from 2 or more portals
    this.maxCopies = opts.maxCopies || 5

    //this.initOrientationEvents()
    this.gravity = {x: 0, y: 0, z: 0}

    if (this.app.quality !== 'low') {
      this.useShadows = true
    }
    else {
      this.useShadows = false
    }

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

    this.camera            = new THREE.PerspectiveCamera( 30, window.innerWidth / window.innerHeight, 0.1, 3500 )
    this.camera.position.x = this.app.cameraX;
    this.camera.position.y = this.app.cameraY;
    this.camera.position.z = 2300

    this.renderer = new THREE.WebGLRenderer({antialias: this.app.quality == 'high'})
    //    this.renderer.setPixelRatio( window.devicePixelRatio * 0.8 )
    this.renderer.setSize( window.innerWidth, window.innerHeight )

    // Add the renderer to the DOM
    document.body.appendChild(this.renderer.domElement)

    // Lighting
    let dirLight = new THREE.DirectionalLight( 0xffffff, 0.8 );
    dirLight.position.set(1000, 1000, 1500)
    this.scene.add( dirLight );
    this.scene.add(new THREE.AmbientLight(0xffffff,0.40));

    // Optionally enable shadows
    if (this.useShadows) {
      this.renderer.shadowMap.enabled           = true;
      this.renderer.shadowMap.type              = THREE.PCFSoftShadowMap;
      this.renderer.shadowMap.renderSingleSided = true
      dirLight.castShadow                       = true;
      if (this.app.quality === 'high') {
        dirLight.shadow.mapSize.width             = 1024
        dirLight.shadow.mapSize.height            = 1024
      }
      else if (this.app.quality === 'medium') {
        dirLight.shadow.mapSize.width             = 512
        dirLight.shadow.mapSize.height            = 512
      }
      dirLight.shadow.camera.near               = -5.5
      dirLight.shadow.camera.far                = 3000
      dirLight.shadow.blurSamples               = 8;
      dirLight.shadow.radius                    = 0.5
      dirLight.shadow.camera.right              = 1500
			dirLight.shadow.camera.left               = -1500
			dirLight.shadow.camera.top	              = 1500
			dirLight.shadow.camera.bottom             = -1500

      if (false) {
        const cameraHelper = new THREE.CameraHelper(dirLight.shadow.camera);
        this.scene.add(cameraHelper);
      }
    }

    this.animate()

    // Set the camera and scene in the UI
    this.ui.setCamera(this.camera)
    this.ui.setScene(this.scene)

    // Finally, add the pointer events
    this.ui.addPointerEvents(this.renderer.domElement);

    this.app.applyConfig();

  }

  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize( window.innerWidth, window.innerHeight );
    
    if (window.matchMedia("(orientation: portrait)").matches) {
      this.camera.rotation.z = Math.PI/2;
    } 
    else if (window.matchMedia("(orientation: landscape)").matches) {
      this.camera.rotation.z = 0;
    }    
  }

  addObject(type, opts = {}, guid, ephemeral) {

    if (!guid) {
      guid = utils.guid();
    }

    const cls = ObjectTypeToClass[type];

    if (!cls) {
      console.error("Unknown object type", type);
      return;
    }
    
    opts.scene = this.scene;
    opts.useShadows = this.useShadows;

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

  cloneObject(obj, ephemeral) {
    // Get the config for this object
    let config = obj.getBeforeMoveConfig();

    // We don't want unique info
    delete config.id;
    delete config.objectGroupId;
    delete config.objectGroup;

    // Create a new object with the same config
    let newObj = this.addObject(config.type, config, null, ephemeral);
    return newObj;
  }

  addObjectFromMessage(messagePayload, topic) {

    const guid = messagePayload.guid;
    // If we prevent duplicates, then check if we already have this object
    if (this.objectsByGuid[guid] && this.objectsByGuid[guid] >= this.maxCopies) {
      return;
    }

    let obj = this.addObject(messagePayload.type, messagePayload, guid, true);

    if (obj) {
      obj.topic = topic;
      this.objectsByGuid[guid] = this.objectsByGuid[guid] ? (this.objectsByGuid[guid]+1) : 1;
    }
    return obj;
  }

  // This will create a new 'group' object that will contain all of the 
  // passed in objects
  createObjectGroup(objects) {
    let group = this.addObject('group', {});
    objects.forEach(o => {
      group.addObject(o);
    });
    return group;
  }

  destroyObjectGroup(group) {
    if (group instanceof Group) {
      group.destroy();
    }
  }

  removeObjectByGuid(guid) {
    if (this.objectsByGuid[guid]) {
      this.objectsByGuid[guid]--;
      if (this.objectsByGuid[guid] <= 0) {
        delete this.objectsByGuid[guid];
      }
    }
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
    this.app.applyConfig();

  }

  animate() {
    this.animationFrameId = requestAnimationFrame((time) => {
      this.animateSeqNum++;
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

    let foundBoard = false;
    if (config) {
      config.objects.forEach(obj => {
        if (obj.type === "grouptest") {
          return;
        }
        this.addObject(obj.type, obj);
        if (obj.type === "board") {
          foundBoard = true;
        }
      })
    }
    
    if (!foundBoard) {
      this.addObject("board", {x1: -500, y1: -300, x2: 500, y2: 300});
    }

  }

  // Undo changes based on the passed in state
  // This will intelligently find the differences between the current state
  // and the passed in state and undo the changes
  undo(undoConfig) {
    let config = this.getConfig();
    let objects = config.objects;
    let undoObjects = undoConfig.objects;

    // First, remove any objects that are in the current state but not in the undo state
    objects.forEach(obj => {
      let undoObj = undoObjects.find(o => o.id === obj.id);
      if (!undoObj) {
        let o = this.getObjectById(obj.id);
        if (o) {
          this.removeObject(o);
        }
      }
    })

    // Now, add any objects that are in the undo state but not in the current state
    undoObjects.forEach(obj => {
      let currentObj = objects.find(o => o.id === obj.id);
      if (!currentObj) {
        this.addObject(obj.type, obj);
      }
    })

    // Now, update any objects that are in both the current and undo states
    // but only ones that have changed.
    objects.forEach(obj => {
      let undoObj = undoObjects.find(o => o.id === obj.id);
      if (undoObj) {
        let o = this.getObjectById(obj.id);
        if (o) {
          o.setConfig(undoObj);
        }
      }
    })

  }

  setMaxCopies(maxCopies) {
    this.maxCopies = maxCopies;
  }

  getBrokers() {
    return this.objects.filter(o => o.type === "broker").map(o => o.object);
  }

  getObjects() {
    return this.objects;
  }

  getObjectById(id) {
    let entry = this.objects.find(o => o.object.id === id);
    if (entry) {
      return entry.object;
    }
    return null;
  }

  getPortalsUsingBroker(broker) {
    let portals = this.objects.filter(o => o.type === "portal" && `${o.object.getValue("brokerId")}` === `${broker.getValue("id")}`).map(o => o.object);
    if (portals.length === 0) {
      portals = this.objects.filter(o => o.type === "portal" && o.object.getValue("broker") === broker.getValue("name")).map(o => o.object);
    }
    return portals;
  }

  getAnimateSeqNum() {
    return this.animateSeqNum;
  }

  initOrientationEvents() {

    if (this.isMobile) {     
      // Request permission for iOS 13+ devices
      if (DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === "function") {
        DeviceMotionEvent.requestPermission();
      }

      if (DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === "function") {
        DeviceOrientationEvent.requestPermission();
      }
      
      window.addEventListener("devicemotion", (e) => this.handleMotion(e));
      window.addEventListener("deviceorientation", (e) => this.handleOrientation(e));
    }

  }

  handleOrientation(event) {

    // Convert the alpha, beta, gamma values to an x,y gravity vector
    const alpha = event.alpha;
    const beta  = event.beta;
    const gamma = event.gamma;

    const y = Math.sin(alpha * Math.PI / 180) * Math.cos(beta * Math.PI / 180);
    const x = -Math.sin(beta * Math.PI / 180);

  }
  
  handleMotion(event) {
    this.gravity = event.accelerationIncludingGravity;
    this.physics.setGravity(this.gravity.y, this.gravity.x);
    this.app.ui.refresh();
  }

  moveCamera(deltaX, deltaY) {
    this.camera.position.x += deltaX;
    this.camera.position.y += deltaY;
    this.app.cameraX = this.camera.position.x;
    this.app.cameraY = this.camera.position.y;
  }
  

}