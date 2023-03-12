// group.js - implements a group of objects that can be moved together
//

import * as THREE         from 'three'
import {StaticObject}     from './static-object.js'
import {ObjectParams}     from './object-params.js'

// A Group is just a holder of other objects. It doesn't have a location, instead
// it simply forwards on changes to the underlying objects. The objects are 
// kept in an array, but the objects themselves also have a reference to the group
export class Group extends StaticObject {
  constructor(app, opts) {
    super(app, opts, [
      {type: 'hidden', name: 'objectIds', default: []}
    ],
    {
      onMove: (obj, pos, info) => this.onMove(obj, pos, info),
      onUp:   (obj, pos, info) => this.onHandler('onUp', obj, pos, info),
      onDown: (obj, pos, info) => this.onHandler('onDown', obj, pos, info),
      onSelected: (obj) => this.onSelected(obj),
      onUnselected: (obj) => this.onUnselected(obj),
      onDelete: (obj) => this.onDelete(obj),
      selectable: true,
      moveable: true,
    });

    // The objects in the group - will learn the actual objects later
    this.objects = []
  }

  // Destroy the group - note that this does not destroy the objects in the group, it just
  // disbands the group
  destroy() {
    this.getObjects().forEach(obj => {
      obj.setObjectGroup(null);
    })
    this.objects = [];
    this.app.setPendingSave(true)
  }

  // Add an object to the group
  addObject(obj) {
    this.objects.push(obj);
    this.objectIds.push(obj.id);
    obj.setObjectGroup(this);
    this.app.setPendingSave(true)
  }

  // Remove an object from the group
  removeObject(obj) {
    this.objects = this.objects.filter(o => o !== obj);
    obj.setObjectGroup(null);
    this.app.setPendingSave(true)
  }

  // Get the objects in the group
  getObjects() {
    if (this.objects.length == 0 && this.objectIds.length > 0) {
      this.objects = this.objectIds.map(id => this.app.getWorld().getObjectById(id));
    }
    return this.objects;
  }

  // Get the bounding box of the group
  getBoundingBox() {
    const box = new THREE.Box3();
    this.getObjects().forEach(obj => {
      box.union(obj.getBoundingBox());
    })
    return box;
  }

  onHandler(type, obj, pos, info) {
    this.getObjects().forEach(obj => {
      let mesh = obj.getMesh();
      if (mesh.userData && mesh.userData.uisInfo) {
        const uisInfo = mesh.userData.uisInfo;
        if (uisInfo[type]) {
          uisInfo[type](uisInfo.object, pos, info);
        }
      }
    })
  }

  onMove(obj, pos, info) {
    this.onHandler('onMove', obj, pos, info);
    this.adjustBoundingBox();
  }

  onDelete(obj) {
    this.onHandler('onDelete', obj);    
    // Destroy the group too
    this.destroy();
  }

  onSelected(obj) {
    this.onHandler('onSelected', obj);
    // Make all sub-objects add their bounding boxes 
    this.getObjects().forEach(obj => {
      obj.addBoundingBox();
    })
  }

  onUnselected(obj) {
    this.onHandler('onUnselected', obj);
    // Make all sub-objects remove their bounding boxes 
    this.getObjects().forEach(obj => {
      obj.removeBoundingBox();
    })
  }

  setPosWithDelta(dx, dy) {
    this.getObjects().forEach(obj => {
      obj.setPosWithDelta(dx, dy);
    })
    this.adjustBoundingBox();
  }

}

