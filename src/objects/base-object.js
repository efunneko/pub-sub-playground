// base-object.js - Base class for all objects

// This class (along with specialization in sub-classes) will handle both the interaction with the physics engine
// and the 3D rendering engine

import * as THREE from 'three';


export class BaseObject {
  constructor(app, opts) {
    this.app  = app
    this.opts = Object.assign({}, opts)

    // Threejs scene for 3d rendering
    this.scene  = opts.scene;

    // Matterjs for physics stuff
    this.matter = opts.matter;

    // We can optionally have shadows
    this.useShadows = opts.useShadows;

    // Create a group to hold all the sub-meshes
    this.group = new THREE.Group();

    // Our config parameters
    this.configParams = null;

    // Keep list of event handlers for parameter type changes
    this.paramEventLabels = {};

  }

  create() {
    this.scene.add(this.group);
  }

  destroy() {

    // Clone the children array so we can iterate over it
    const children = this.group.children.slice(0);
    children.forEach(child => {
      if (child.userData.physicsBody !== undefined) {
        this.app.getPhysicsEngine().removeBody(child.userData.physicsBody);
      }
      this.group.remove(child);
    });

    this.scene.remove(this.group);
  }

  initConfigParams(params) {
    params.forEach(param => {
      // Handle the initial value
      if (Array.isArray(this[param.name])) {
        param.initialValue = this[param.name].slice(0);
      } 
      else if (typeof this[param.name] === "object") {
        param.initialValue = Object.assign({}, this[param.name]);
      } 
      else {
        param.initialValue = this[param.name];
      }

      // Handle event handlers
      if (param.eventLabels) {
        console.log("Adding event labels for " + param.name);
        this.paramEventLabels[param.name] = [];
        param.eventLabels.forEach(label => {
          // Capitalize the first letter
          const handlerName = "on" + label.charAt(0).toUpperCase() + label.slice(1) + "Change";
          if (this[handlerName]) {
            this.paramEventLabels[param.name].push(handlerName);
          }
          else {
            console.warn(`No handler found for ${handlerName} which is referenced in ${param.name}`);
          }
        });
      }
    });
    console.log("PEL", this.paramEventLabels);

    return params;
  }

  resetConfig() {
    this.configParams.forEach(param => {
      if (Array.isArray(this[param.name])) {
        this[param.name] = param.initialValue.slice(0);
      }
      else if (typeof this[param.name] === "object") {
        this[param.name] = Object.assign({}, param.initialValue);
      }
      else {
        this[param.name] = param.initialValue;
      }
    });
    this.reDraw();
  } 

  getConfig() {
    if (this.configParams) {
      const config = {};
      this.configParams.forEach(param => {
        config[param.name] = this[param.name];
      });
      return config;
    }
  }

  getValue(paramName) {
    return this[paramName];
  }

  setValues(params) {

    const eventLabels = {};
    Object.keys(params).forEach(paramName => {
      const value = params[paramName];
      this[paramName] = value;
      if (this.paramEventLabels[paramName]) {
        this.paramEventLabels[paramName].forEach(label => {
          eventLabels[label] = true;
        });
      }
    });

    // Call the event handlers
    Object.keys(eventLabels).forEach(label => {

      if (typeof(this[label]) === "function") {
        this[label]();
      }
    });

    // TBD - should we force a redraw here?
    // this.reDraw();
  }

  static loadAssets() {
    return Promise.resolve();
  }

  onDown(obj, pos, info) {
  }

  onUp(obj, pos, info) {
    this.saveableConfigChanged();
  }

  onMove(obj, pos, info) {
    this.x += info.deltaPos.x;
    this.y += info.deltaPos.y;
    this.group.position.set(this.x, this.y, this.z);
  }

  onAppearanceChange() {
    this.reDraw();
  }

  reDraw() {
    this.destroy();
    this.create();
  }

  saveConfigForm(form) {
    console.log('saveConfigForm', form);
    this.setValues(form);
  }

  saveableConfigChanged() {
    this.app.setPendingSave(true)
  }

  removeFromWorld() {
    this.app.getWorld().removeObject(this);
    this.saveableConfigChanged();
  }

}