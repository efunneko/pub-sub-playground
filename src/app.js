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
    }, 100);
  }

  reset() {
    this.world.reset();
  }
  
  // Get all the config from the world and save it in local storage
  saveConfig() {
    let config = {};
    config.world = this.world.getConfig();
    const json = JSON.stringify(config);
    localStorage.setItem("config", JSON.stringify(config));
    console.log("EDE saveConfig", json.length, json);
    const compressed = LZString.compressToEncodedURIComponent(json);
    console.log("EDE saveConfig compressed", compressed.length, compressed);
    console.log("URL for page:", window.location.href + "?config=" + compressed)
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
  }

  pause() {
    //this.physicsEngine.pause();
    this.world.pause();
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

  registerBroker(broker) {
    // Check if we already have this broker
    if (this.brokers.indexOf(broker) == -1) {
      this.brokers.push(broker);
    }
  }

  unregisterBroker(broker) {
    let index = this.brokers.indexOf(broker);
    if (index != -1) {
      this.brokers.splice(index, 1);
    }
  }

  getBrokerByName(name) {
    for (let broker of this.brokers) {
      if (broker.getName() == name) {
        return broker;
      }
    }
    return null;
  }

  getBrokers() {
    return this.brokers;
  }

  isEditMode() {
    return this.ui.isEditMode();
  }

}

