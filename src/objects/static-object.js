// static-object.js - base class for objects that are not dynamic and are not part of the physics simulation

import {BaseObject}  from './base-object.js'

export class StaticObject extends BaseObject {
  constructor(app, opts, params, uisInfo) {
    super(app, opts, params, uisInfo)

    this.x       = opts.x || 0
    this.y       = opts.y || 0

  }

  // Called from the physics engine to update the position of the object but since this is a static object
  // we don't need to do anything
  update() {
  }

  isStatic() {
    return true
  }
  

  
}