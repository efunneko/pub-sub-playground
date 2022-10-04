// dynamic-object.js = Base class for any objects that are taking part in the physics simulation

import * as THREE     from 'three' 
import {BaseObject}   from './base-object.js'

export class DynamicObject extends BaseObject {
  constructor(app, opts) {
    super(app, opts)

    // All dynamic objects have a x, y and rotation
    this.x        = opts.x        || 0
    this.y        = opts.y        || 0
    this.rotation = opts.rotation || 0

    // The physics engine
    this.physics  = this.app.getPhysicsEngine()

  }

  // Register this object with the physics engine
  registerWithPhysics(body) {
    this.body = body
    this.physics.addBody(body)
  }

  // Called from the physics engine to update the position of the object
  update(body) {
    this.group.position.x = body.position.x
    this.group.position.y = -body.position.y
    this.group.rotation.z = -body.angle
    //console.log("update", this.group.position.x, this.group.position.y, body.angle)
  }

  // Called when the object is destroyed
  destroy() {
    this.physics.removeBody(this.body)
  }

}