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
      version:          2,
      sessionConfig:    this.sessions.getFullConfig(),
      globalSettings:   this.globalParams.getConfig(this)
    };
  }

  getConfigForURL() {
    return {
      version:          2,
      sessionConfig:    this.sessions.getCurrentSessionConfig(),
      globalSettings:   this.globalParams.getConfig(this)
    };
  }

  // When saving the config, we will push the current config into the session manager and save that
  // We will also save the single session config into the URL along with the global settings
  saveConfig(name) {

    this.updateCurrentSession(name);

    let config = this.getConfigForSave();

    // Get the JSON string of the config
    let json = JSON.stringify(config);

    localStorage.setItem("config", json);

    // Get the URL config
    config = this.getConfigForURL();
    json = JSON.stringify(config);

    // Compress the JSON string and get a URI safe string
    const compressed = LZString.compressToEncodedURIComponent(json);

    // Update the browser location with the new config
    const url = window.location.origin + window.location.pathname + "?config=" + compressed;
    if (history.pushState) {
      history.pushState({}, null, url);
    }
    this.setPendingSave(false);
  }
  
  getConfig() {
    const config = this.getConfigForSave();
    return JSON.stringify(config);
  }

  getCurrentSessionConfig() {
    const config = this.getConfigForURL();
    return JSON.stringify(config);
  }

  updateCurrentSession(sessionName) {
    const worldConfig = this.world.getConfig();
    this.sessions.setCurrentSessionConfig(worldConfig, sessionName);
  }

  onSettingsChange(data) {
    this.globalParams.setValues(this, data);
    this.setPendingSave(true);

    if (this.world) {
      this.world.setMaxCopies(this.maxCopies);
    }
  }

  loadLocalStorageConfig() {
    let config = localStorage.getItem("config");
    if (config) {
      config = JSON.parse(config);
    }  
    return this.upgradeConfig(config);
  }

  loadURLConfig() {
    const urlParams = new URLSearchParams(window.location.search);
    let config = urlParams.get('config');
    if (config) {
      config = LZString.decompressFromEncodedURIComponent(config);
      config = JSON.parse(config);
    }
    return this.upgradeConfig(config);
  }

  upgradeConfig(config) {
    if (config && config.version == 1) {
      config.version = 2;
      config.world.name = "Unnamed";
      config.sessionConfig = {
        sessions: [config.world],
        currentSessionName: config.world.name,
      };
      delete config.world;
    }
    else if (config && config.version == 2) {
      if (config.sessions) {
        config.sessionConfig = config.sessions;
        delete config.sessions;
      }
    }
    return config;
  }

  mergeConfig(config1, config2) {
    if (!config1) {
      return config2;
    }
    if (!config2) {
      return config1;
    }
    // For each session in config1, see if there is a matching session in config2
    // If there is, check if the config is different
    // If it is, add a unique suffix to the name of the session in config2 and add it to the merged config
    // If there is not, add the session to the merged config
    const mergedConfig = {
      version: 2,
      sessionConfig: {
        sessions: [],
        currentSessionName: config1.sessionConfig.currentSessionName,
      },
      globalSettings: config1.globalSettings,
    };
    const sessionNames = {};
    const sessionNames2 = {};
    config1.sessionConfig.sessions.forEach(session => {
      sessionNames[session.name] = true;
      mergedConfig.sessionConfig.sessions.push(session);
    });
    config2.sessionConfig.sessions.forEach(session => {
      sessionNames2[session.name] = true;
    });
    config2.sessionConfig.sessions.forEach(session => {
      if (sessionNames[session.name]) {
        // check if the session is different
        const session1 = config1.sessionConfig.sessions.find(s => s.name == session.name);
        if (JSON.stringify(session1) != JSON.stringify(session)) {
          let suffix = 1;
          while (sessionNames[session.name + suffix] || sessionNames2[session.name + suffix]) {
            suffix++;
          }
          session.name = session.name + suffix;
          // Add the session to the merged config
          mergedConfig.sessionConfig.sessions.push(session);
        }
      } 
      else {
        // Add the session to the merged config
        mergedConfig.sessionConfig.sessions.push(session);
      }
    });

    return mergedConfig;

  }

  // Load the config from local storage
  loadConfig() {

    const urlConfig          = this.loadURLConfig();
    const localStorageConfig = this.loadLocalStorageConfig();

    let config = this.mergeConfig(urlConfig, localStorageConfig);

    let globalSettings = {};
    if (config && config.globalSettings) {
      globalSettings = config.globalSettings;
    }
    this.globalParams = new ObjectParams(this, GLOBAL_PARAMS, globalSettings);

    this.config = config;

    this.sessions = new Sessions(this, config.sessionConfig);

  }

  // Apply the config to the world, which will create all the objects
  applyConfig() {
    const session = this.sessions.getCurrentSession();
    if (session) {
      this.world.setConfig(session);
    }
    else {
      this.world.setConfig(undefined);
    }
    this.world.setMaxCopies(this.maxCopies);
    this.setPendingSave(false);
  }

  // Called to import new config that was loaded from a file
  importConfig(config) {

    // We will merge this into the current config
    const currentConfig = this.getConfigForSave();

    // Merge the sessions
    const mergedConfig = this.mergeConfig(currentConfig, config);

    // Save the merged config
    this.sessions.setFullConfig(mergedConfig.sessionConfig);

  }

  getGlobalParams() {
    return this.globalParams.getParams();
  }

  setPendingSave(val, skipUndo) {
    if (val && this.autoSave) {
      this.saveConfig();
    } else {
      this.ui.setPendingSave(val);
    }
    if (!skipUndo) {
      this.saveUndo();
    }
  }

  changeSessionName(name) {
    this.sessions.setCurrentSessionName(name);
    this.setPendingSave(true);
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
      this.setPendingSave(true, true);
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

  createSession(name) {
    const newSessionConfig = {
      name: name,
      objects: []
    };

    this.sessions.createSession(newSessionConfig);

    // Remove all the objects from the world
    this.world.clear();

    this.world.initSession();

    this.setPendingSave(true);
  }

  deleteCurrentSession() {
    this.sessions.deleteCurrentSession();

    // Now load the first session
    const firstSession = this.sessions.getSessionNames()[0];

    if (firstSession) {
      this.loadSession(firstSession);
    }
    else {
      // No sessions left, so create a new one
      this.createSession("Unnamed");
    }

    this.saveConfig();
  }

  loadSession(name) {
    // Remove all the objects from the world
    this.world.clear();

    // Load the session
    this.sessions.loadSession(name);

    // Apply the config to the world
    this.applyConfig();

    this.setPendingSave(false);

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

