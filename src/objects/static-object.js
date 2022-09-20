// static-object.js - base class for objects that are not dynamic and are not part of the physics simulation

import {BaseObject}  from './base-object.js'

export class StaticObject extends BaseObject {
  constructor(app, opts) {
    super(app, opts)

    this.x       = opts.x || 0
    this.y       = opts.y || 0

  }
}