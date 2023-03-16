import {jst}                   from "jayesstee";
import {Body}                  from "./body";
import {UI}                    from "./ui";
import {World}                 from "./world.js"
import {Platform}              from "./platform.js"
import {Sessions}              from "./sessions.js"
import {ObjectParams}          from "./objects/object-params.js"
import * as LZString           from "lz-string";

const DEBUG_MODE = true;

const GLOBAL_PARAMS = [
  {name: "name",           type: "text",        label: "Name", default: "New board", title: "Name of the board"},
  {name: "quality",        type: "select",      label: "Graphics Quality", default: "medium", options: [{label: "Low", value: "low"}, {label: "Medium", value: "medium"}, {label: "High", value: "high"}]},
  {name: "volume",         type: "numberRange", label: "Volume", default: 5, min: 1, max: 10, step: 1},
  {name: "dynamicGravity", type: "boolean",     label: "Dynamic Gravity", title: "On mobile devices, use the device's orientation as the direction of gravity", default: true},      
  {name: "maxCopies",      type: "numberRange", label: "Max Copies", default: 10, min: 1, max: 50, step: 1, title: "The maximum number of copies of each object that can be created"},
  {name: "cameraX",        type: "hidden",      default: 0},
  {name: "cameraY",        type: "hidden",      default: 0},
];

export class App extends jst.Component {
  constructor(specs) {
    super();

    // This will be initialized after the persistent data is loaded
    this.globalParams       = null;
    
    this.title              = "Pub-Sub Playground";
    this.alerts             = [];
    this.brokers            = [];
          
    this.width              = window.innerWidth;
    this.height             = window.innerHeight;

    this.debug              = DEBUG_MODE;
 
    this.scaleFactor        = 50;

    this.loadConfig();

    this.platform           = new Platform();

    this.ui                 = new UI(this, {});

    this.body               = new Body(this, this.width, this.height, this.fontScale);

    this.world              = new World(this, {ui: this.ui})

    this.sessions           = new Sessions(this);
    this.sessions.loadSessions();

    this.pendingSave        = false

    // Experimental locking of orientation
    if (this.platform.isMobile &&  screen.orientation && screen.orientation.lock) {
      screen.orientation.lock("landscape");
    }

    this.eventListeners      = {
      play:  [],
      pause: [],
      reset: [],
    }
    
    // Listen for window resize events
    window.onresize = e => this.resize();

  }
 
  render() {
    return jst.$div(
      {id: "app"},
      this.ui,
      this.body,
    );
  }

  resize() {
    // Need a small timeout for iOS or the dimensions are wrong
    setTimeout(() => {
      this.width        = window.innerWidth;
      this.height       = window.innerHeight;
      this.body.resize(this.width, this.height);
      this.refresh();
      this.world.resize();
    }, 100);
  }

  reset() {
    this.world.reset();
    this.eventListeners.reset.forEach(handler => handler());
  }
  
  // Get all the config from the world and save it in local storage
  getConfigForSave() {
    return {
      version:          1,
      world:            this.world.getConfig(),
      globalSettings:   this.globalParams.getConfig(this),
    };
  }

  saveConfig() {
    let config = this.getConfigForSave();

    // Get the JSON string of the config
    const json = JSON.stringify(config);

    localStorage.setItem("config", JSON.stringify(config));

    // Compress the JSON string and get a URI safe string
    const compressed = LZString.compressToEncodedURIComponent(json);

    // Update the browser location with the new config
    const url = window.location.origin + window.location.pathname + "?config=" + compressed;
    if (history.pushState) {
      history.pushState({}, null, url);
    }
    this.setPendingSave(false);
  }

  onSettingsChange(data) {
    this.globalParams.setValues(this, data);
    this.setPendingSave(true);

    if (this.world) {
      this.world.setMaxCopies(this.maxCopies);
    }
  }

  // Load the config from local storage
  loadConfig() {

    // If there is a config in the URL, use that
    const urlParams = new URLSearchParams(window.location.search);
    let config = urlParams.get('config');
    if (config) {
      config = LZString.decompressFromEncodedURIComponent(config);
      config = JSON.parse(config);
    }
    else {
      config = localStorage.getItem("config");
      if (config) {
        config = JSON.parse(config);
      }  
    }

    let globalSettings = {};
    if (config) {

      if (config.globalSettings) {
        globalSettings = config.globalSettings;
      }
    }

    this.globalParams = new ObjectParams(this, GLOBAL_PARAMS, globalSettings);

    this.config = config;

  }

  // Apply the config to the world, which will create all the objects
  applyConfig() {
    if (this.config) {
      this.world.setConfig(this.config.world);
    }
    else {
      this.world.setConfig(undefined);
    }
    this.world.setMaxCopies(this.maxCopies);
    this.setPendingSave(false);
  }

  getGlobalParams() {
    return this.globalParams.getParams();
  }

  setPendingSave(val) {
    if (val && this.autoSave) {
      this.saveConfig();
    } else {
      this.ui.setPendingSave(val);
    }
    this.saveUndo();
  }

  play() {
    //this.physicsEngine.play();
    this.world.play();
    if (this.eventListeners.play) {
      this.eventListeners.play.forEach(handler => handler());
    }
  }

  pause() {
    //this.physicsEngine.pause();
    this.world.pause();
    if (this.eventListeners.pause) {
      this.eventListeners.pause.forEach(handler => handler());
    }
  }

  undo() {
    let config = this.sessions.getNextUndo();
    if (config) {
      // Tell the world to do the undo
      this.world.undo(config);
    }
  }

  saveUndo() {
    // If not already running, set a timer to update the undo stack
    // This is to accumulate a bunch of changes into a single undo step
    if (!this.undoTimer) {
      this.undoTimer = setTimeout(() => {
        this.undoTimer = null;
        // Get the current state of the world and add it to the undo stack
        let config = this.world.getConfig()
        this.sessions.addToUndoStack(config);
      }, 100);
    }
  }

  setPhysicsEngine(physics) {
    this.physicsEngine = physics;
  } 

  getPhysicsEngine() {
    return this.physicsEngine;
  }

  getWorld() {
    return this.world;
  }

  scale(...args) {
    if (args.length == 1) {
      return args[0] * this.scaleFactor;
    } else {
      return args.map(a => a * this.scaleFactor);
    }
  }

  getBrokerByName(name) {
    const brokers = this.world.getBrokers();
    for (let broker of brokers) {
      if (broker.getName() == name) {
        return broker;
      }
    }
    return null;
  }

  getBrokerById(id) {
    const brokers = this.world.getBrokers();
    for (let broker of brokers) {
      if (broker.id == id) {
        return broker;
      }
    }
    return null;
  }

  getBrokers() {
    return this.world.getBrokers();
  }

  getNewBrokerId() {
    const brokers = this.world.getBrokers();

    // Look for the first unused broker id by finding the largest id and adding 1
    let maxId = 0;
    brokers.forEach(broker => {
      if (broker.id > maxId) {
        maxId = broker.id;
      }
    });

    return maxId + 1;

  }

  // Return a new unique object id
  getNewObjectId() {
    // If we don't already have a next id, find it. The next ID is saved so that
    // we don't have to search for it every time we create a new object.
    if (!this.nextObjectId) {
      const objects = this.world.getObjects();
      // Look for the first unused object id by finding the largest id and adding 1
      let maxId = 0;
      objects.forEach(obj => {
        if (obj.object.id > maxId) {
          maxId = obj.object.id;
        }
      });
      this.nextObjectId = maxId + 1;
    }
    return this.nextObjectId++;
  }

  createObjectGroup(objects) {
    return this.world.createObjectGroup(objects);
  }

  destroyObjectGroup(group) {
    this.world.destroyObjectGroup(group);
  }
  
  getPortalsUsingBroker(broker) {
    return this.world.getPortalsUsingBroker(broker);
  }

  isEditMode() {
    return this.ui.isEditMode();
  }

  addEventListener(event, handler) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].push(handler);
    }
  }

  getAppState() {
    return this.ui.state
  }

  getPlatform() {
    return this.platform
  }

  getValue(paramName) {
    return this.globalParams.getValue(this, paramName);
  }

  getAnimateSeqNum() {
    return this.world.getAnimateSeqNum();
  }

  moveCamera(deltaX, deltaY) {
    this.world.moveCamera(deltaX, deltaY);
  }

}

