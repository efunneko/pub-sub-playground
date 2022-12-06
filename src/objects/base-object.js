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

    // The physics engine
    this.physics  = this.app.getPhysicsEngine()

    // We can optionally have shadows
    this.useShadows = opts.useShadows;

    // Create a group to hold all the sub-meshes
    this.group = new THREE.Group();

    // Our config parameters
    this.configParams = null;

    // Keep list of event handlers for parameter type changes
    this.paramEventLabels = {};

    // Keep the creation time
    this.creationTime = Date.now();

    // Keep track if we moved the object
    this.didMove = false;

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
      else if (child.userData.physicsBodies) {
        child.userData.physicsBodies.forEach(body => {
          this.app.getPhysicsEngine().removeBody(body);
        })
      }
      this.group.remove(child);
    });

    this.scene.remove(this.group);
  }

  initConfigParams(params) {

    // Add the object type to the config params
    //params.push({name: 'type', type: 'hidden', value: this.constructor.name.toLowerCase()});

    // Adjust each of the config params
    params.forEach(param => {

      param.value = this[param.name];
       
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
    console.log("paramEventLabels = ", this.paramEventLabels);
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
        if (param.type == "subObject") {
          config[param.name] = this[param.name].getConfig();
        }
        else {
          config[param.name] = this[param.name];
        }
      });
      return config;
    }
  }

  getValue(paramName) {
    console.log(`getValue(${paramName}) = `, this[paramName]);
    return this[paramName];
  }

  setValues(params) {

    const eventLabels = {};
    Object.keys(params).forEach(paramName => {
      const value = params[paramName];

      // If the param is a subObject, then set the values on the subObject
      if (this.configParams) {
        const param = this.configParams.find(param => param.name == paramName);
        if (param && param.type == "subObject") {
          this[paramName].setValues(value);
          return;
        }
      }

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
    if (this.didMove) {
      this.saveableConfigChanged();
      this.didMove = false;
    }
  }

  onMove(obj, pos, info) {
    this.x += info.deltaPos.x;
    this.y += info.deltaPos.y;
    this.group.position.set(this.x, this.y, this.z);
    this.didMove = true;
    if (this.redrawOnMove) {
      this.reDraw();
    }
  }

  onAppearanceChange() {
    this.reDraw();
  }

  reDraw() {
    this.destroy();
    this.create();
  }

  saveConfigForm(form) {
    console.warn("saveConfigForm")
    this.setValues(form);
    this.saveableConfigChanged();
  }

  saveableConfigChanged() {
    console.warn("saveableConfigChanged")
    this.app.setPendingSave(true)
  }

  removeFromWorld() {
    this.app.getWorld().removeObject(this);
    this.saveableConfigChanged();
  }

}