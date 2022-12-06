import {jst}                   from "jayesstee";
import {Body}                  from "./body";
import {UI}                    from "./ui";
import {World}                 from "./world.js"
import {Messaging}             from "./messaging/messaging.js";
import * as LZString           from "lz-string";

const DEBUG_MODE = true;

export class App extends jst.Component {
  constructor(specs) {
    super();
    
    this.title              = "Solly Goldberg";
    this.alerts             = [];
    this.brokers            = [];
          
    this.width              = window.innerWidth;
    this.height             = window.innerHeight;

    this.debug              = DEBUG_MODE;
 
    this.scaleFactor        = 50;

    this.ui                 = new UI(this, {});

    this.body               = new Body(this, this.width, this.height, this.fontScale);

    this.world              = new World(this, {ui: this.ui})

    this.pendingSave        = false

    this.eventListeners      = {
      play: [],
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
  saveConfig() {
    let config = {};
    config.world = this.world.getConfig();
    const json = JSON.stringify(config);
    localStorage.setItem("config", JSON.stringify(config));
    const compressed = LZString.compressToEncodedURIComponent(json);
    const url = window.location.origin + window.location.pathname + "?config=" + compressed;
    console.log("URL: " + url);
    if (history.pushState) {
      history.pushState({}, null, url);
    }
    this.setPendingSave(false);
  }

  // Load the config from local storage
  loadConfig() {
    // If there is a config in the URL, use that
    const urlParams = new URLSearchParams(window.location.search);
    let config = urlParams.get('config');
    if (config) {
      config = LZString.decompressFromEncodedURIComponent(config);
      config = JSON.parse(config);
      this.world.setConfig(config.world);
      this.setPendingSave(false);
      return;
    }

    // Otherwise, load from local storage
    config = localStorage.getItem("config");
    if (config) {
      config = JSON.parse(config);
      this.world.setConfig(config.world);
      this.setPendingSave(false);
    }
  }

  setPendingSave(val) {
    if (val && this.autoSave) {
      this.saveConfig();
    } else {
      this.ui.setPendingSave(val);
    }
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

  getBrokers() {
    return this.world.getBrokers();
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

}

