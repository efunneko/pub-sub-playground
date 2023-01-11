// base-object.js - Base class for all objects

// This class (along with specialization in sub-classes) will handle both the interaction with the physics engine
// and the 3D rendering engine

import {ObjectParams}     from './object-params.js'
import * as THREE         from 'three';


export class BaseObject {
  constructor(app, opts, params) {
    this.app  = app
    this.opts = Object.assign({}, opts)

    // The object parameters
    this.objectParams = new ObjectParams(this, params, opts);

    // Threejs scene for 3d rendering
    this.scene  = opts.scene;

    // The physics engine
    this.physics  = this.app.getPhysicsEngine()

    // We can optionally have shadows
    this.useShadows = opts.useShadows;

    // Create a group to hold all the sub-meshes
    this.group = new THREE.Group();

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
    return params;
  }

  getObjectParams() {
    return this.objectParams.getParams();
  }

  getConfig() {
    const config = this.objectParams.getConfig(this);
    config.type  = this.type;
    return config;
  }

  getBeforeMoveConfig() {
    let config = this.getConfig();
    config.x = this.startMoveX;
    config.y = this.startMoveY;
    return config;
  }

  getValue(paramName) {
    return this.objectParams.getValue(this, paramName);
  }

  setValues(params) {
    this.objectParams.setValues(this, params);
  }

  static loadAssets() {
    return Promise.resolve();
  }

  onDown(obj, pos, info) {
    this.startMoveX = this.x;
    this.startMoveY = this.y;    
  }

  onUp(obj, pos, info) {
    if (this.didMove) {
      this.saveableConfigChanged();
      this.didMove = false;
    }
    this.duplicate         = null;
    this.creatingDuplicate = false;
  }

  onMove(obj, pos, info) {
    this.x += info.deltaPos.x;
    this.y += info.deltaPos.y;
    this.group.position.set(this.x, this.y, this.z);
    this.didMove = true;

    if (info.ctrlKey && !this.creatingDuplicate) {
      this.creatingDuplicate = true;
      this.duplicate = this.app.world.cloneObject(this);
    }

    // If we are creating a duplicate, but the CTRL key is no longer down, then stop creating the duplicate
    else if (!info.ctrlKey && this.creatingDuplicate) {
      this.creatingDuplicate = false;
      this.app.world.removeObject(this.duplicate);
      this.duplicate = null;
    }


    if (this.redrawOnMove) {
      this.redraw();
    }
  }

  onAppearanceChange() {
    this.redraw();
  }

  redraw() {
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