// base-object.js - Base class for all objects

// This class (along with specialization in sub-classes) will handle both the interaction with the physics engine
// and the 3D rendering engine

import {ObjectParams}     from './object-params.js'
import * as THREE         from 'three';


export class BaseObject {
  constructor(app, opts, params, uisInfo) {
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

    // Get the UI Selection Manager
    this.uis = this.app.ui.getUiSelection();

    // If we have uisInfo, then register this object with the UI Selection Manager
    if (uisInfo && !opts.isSubObject) {
      uisInfo.object     = this;

      // Are there any config params that aren't hidden?
      if (params.filter(param => param.type !== "hidden").length > 0) {
        uisInfo.configForm = {
          save:   (form) => this.saveConfigForm(form),
          obj:    this,
          fields: this.getObjectParams(),
        };
      }
  
      this.uis.registerObject(this.group, uisInfo);
    }

  }

  create() {
    this.scene.add(this.group);
    if (!this.group.userData) {
      this.group.userData = {};
    }
    this.group.userData.object = this;
    this.group.userData.type   = this.type;
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

    if (this.boundingBox) {
      console.log("Removing bounding box");
      this.removeBoundingBox();
    }
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
    else {
      this.adjustBoundingBox();
    }
  }

  onAppearanceChange() {
    this.redraw();
  }

  addBoundingBox() {
    const bbox      = new THREE.Box3().setFromObject(this.group);

    // Add 10 pixels to the width and height
    const padding = 10;
    bbox.expandByScalar(padding);

    const boxHelper = new THREE.Box3Helper(bbox, 0xffff00);

    //mesh.position.set(center.x, center.y, center.z);
    this.scene.add(boxHelper);
    this.boundingBox = boxHelper;
  }

  removeBoundingBox() {
    if (this.boundingBox) {
      this.scene.remove(this.boundingBox);
      this.boundingBox = null;
    }
  }

  adjustBoundingBox() {
    if (this.boundingBox) {
      this.removeBoundingBox();
      this.addBoundingBox();
    }
  }

  redraw() {
    this.destroy();
    this.create();    
    this.adjustBoundingBox();
  }

  saveConfigForm(form) {
    this.setValues(form);
    this.saveableConfigChanged();
  }

  saveableConfigChanged() {
    this.app.setPendingSave(true)
  }

  removeFromWorld() {
    this.app.getWorld().removeObject(this);
    this.saveableConfigChanged();
  }

  getMinX() {
    const bbox = new THREE.Box3().setFromObject(this.group);
    return bbox.min.x;
  }

  getMaxX() {
    const bbox = new THREE.Box3().setFromObject(this.group);
    return bbox.max.x;
  }

  getMinY() {
    const bbox = new THREE.Box3().setFromObject(this.group);
    return bbox.min.y;
  }

  getMaxY() {
    const bbox = new THREE.Box3().setFromObject(this.group);
    return bbox.max.y;
  }

  getWidth() {
    return this.getMaxX() - this.getMinX();
  }

  getHeight() {
    return this.getMaxY() - this.getMinY();
  }

  getCenter() {
    const bbox = new THREE.Box3().setFromObject(this.group);
    return bbox.getCenter();
  }

  setPos(x, y) {
    this.x = x;
    this.y = y;
    this.group.position.set(this.x, this.y, this.z);
    if (this.redrawOnMove) {
      this.redraw();
    }
    else {
      this.adjustBoundingBox();
    }
  }

  setMinX(x) {
    const dx = x - this.getMinX();
    this.setPos(this.x + dx, this.y);
  }

  setMaxX(x) {
    const dx = x - this.getMaxX();
    this.setPos(this.x + dx, this.y);
  }

  setMinY(y) {
    const dy = y - this.getMinY();
    this.setPos(this.x, this.y + dy);
  }

  setMaxY(y) {
    const dy = y - this.getMaxY();
    this.setPos(this.x, this.y + dy);
  }



}