// base-object.js - Base class for all objects

// This class (along with specialization in sub-classes) will handle both the interaction with the physics engine
// and the 3D rendering engine

import {ObjectParams}     from './object-params.js'
import * as THREE         from 'three';

const BBOX_COLOR            = 0xffff00;
const BBOX_COLOR_IN_GROUP   = 0xaaddff;
const BBOX_OPACITY          = 0.7;
const BBOX_OPACITY_IN_GROUP = 0.3;

export class BaseObject {
  constructor(app, opts, params, uisInfo) {
    this.app  = app
    this.opts = Object.assign({}, opts)

    // Add an object parameter for the objectGroupId and id
    params.push({name: "objectGroupId", type: "hidden", default: 0});
    params.push({name: "id",            type: "hidden", default: 0});

    // The object parameters
    this.objectParams = new ObjectParams(this, params, opts);
//this.objectGroupId = 0;
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

    // Give this object a unique id
    this.id = opts.id || this.app.getNewObjectId();

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

  destroy(opts = {}) {

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

    if (!opts.keepBoundingBox) {
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

  setConfig(config) {
    let changed = this.objectParams.setValues(this, config);
    if (changed) {
      this.redraw();
    }
  }

  getBeforeMoveConfig() {
    let config = this.getConfig();
    config.x = this.startMoveX;
    config.y = this.startMoveY;
    return config;
  }

  getMesh() {
    return this.group;
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

  getBoundingBox() {
    const bbox = new THREE.Box3().setFromObject(this.group);
    return bbox;
  }

  addBoundingBox() {
    if (this.boundingBox) {
      return;
    }
    const bbox      = this.getBoundingBox();

    // Add 10 pixels to the width and height
    const padding = 10;
    bbox.expandByScalar(padding);

    bbox.min.z = 10;

    const boxHelper = new THREE.Box3Helper(bbox, BBOX_COLOR);

    // Make the box3helper 50% transparent
    boxHelper.material.transparent = true;
    boxHelper.material.opacity     = this.objectGroupId ? BBOX_OPACITY_IN_GROUP : BBOX_OPACITY;
    boxHelper.material.color.setHex(this.objectGroupId ? BBOX_COLOR_IN_GROUP : BBOX_COLOR);

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
    this.destroy({keepBoundingBox: true});
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

  setObjectGroup(group) {
    this.objectGroup   = group;
    this.objectGroupId = group ? group.id : 0;
    // If this is going into a group, make the bounding box mostly transparent
    if (this.boundingBox) {
      this.boundingBox.material.opacity     = this.objectGroupId ? BBOX_OPACITY_IN_GROUP : BBOX_OPACITY;
      this.boundingBox.material.color.setHex(this.objectGroupId ? BBOX_COLOR_IN_GROUP : BBOX_COLOR);
    }
  }

  getObjectGroup() {
    if (this.objectGroupId && !this.objectGroup) {
      this.objectGroup = this.app.getWorld().getObjectById(this.objectGroupId);
    }
    return this.objectGroup;
  }

  getMinX() {
    const bbox = this.getBoundingBox();
    return bbox.min.x;
  }

  getMaxX() {
    const bbox = this.getBoundingBox();
    return bbox.max.x;
  }

  getMinY() {
    const bbox = this.getBoundingBox();
    return bbox.min.y;
  }

  getMaxY() {
    const bbox = this.getBoundingBox();
    return bbox.max.y;
  }

  getWidth() {
    return this.getMaxX() - this.getMinX();
  }

  getHeight() {
    return this.getMaxY() - this.getMinY();
  }

  getCenter() {
    const bbox = this.getBoundingBox();
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

  setPosWithDelta(dx, dy) {
    this.setPos(this.x + dx, this.y + dy);
  }

  setMinX(x) {
    const dx = x - this.getMinX();
    this.setPosWithDelta(dx, 0);
  }

  setMaxX(x) {
    const dx = x - this.getMaxX();
    this.setPosWithDelta(dx, 0);
  }

  setMinY(y) {
    const dy = y - this.getMinY();
    this.setPosWithDelta(0, dy);
  }

  setMaxY(y) {
    const dy = y - this.getMaxY();
    this.setPosWithDelta(0, dy);
  }



}