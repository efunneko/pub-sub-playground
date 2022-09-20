// dynamic-object.js = Base class for any objects that are taking part in the physics simulation

import * as THREE     from 'three' 
import {BaseObject}   from './base-object.js'

export class DynamicObject extends BaseObject {
  constructor(app, opts) {
    super(app, opts)

    // All dynamic objects have a x, y and rotation
    this.x        = opts.x || 0
    this.y        = opts.y || 0
    this.rotation = opts.rotation || 0


  }

}