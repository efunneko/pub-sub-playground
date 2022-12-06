// dynamic-object.js = Base class for any objects that are taking part in the physics simulation

import * as THREE     from 'three' 
import {BaseObject}   from './base-object.js'

const defaultCooldown = 500;

export class DynamicObject extends BaseObject {
  constructor(app, opts) {
    super(app, opts)

    // All dynamic objects have a x, y and rotation
    this.x            = opts.x            || 0
    this.y            = opts.y            || 0
    this.rotation     = opts.rotation     || 0
    this.coolDownTime = opts.coolDownTime || defaultCooldown

  }

  isStatic() {
    return false
  }

  // Return true if the object is in cool-down mode
  isCoolingDown() {
    const now = Date.now()
    return (now - this.creationTime) < this.coolDownTime
  }

  // Called from the physics engine to update the position of the object
  update(body) {
    //console.log("update", this.group.position.x, this.group.position.y, body.angle)
    this.setValues({
      x:        body.position.x,
      y:        -body.position.y,
      rotation: -body.angle,
    })
  }

  // Event handler for position changes
  onPositionChange() {
    this.group.position.x = this.x
    this.group.position.y = this.y
  }

  // Event handler for rotation changes
  onRotationChange() {
    this.group.rotation.z = this.rotation
  }

  setInitialVelocity(opts) {
    if (opts.velocity) {
      this.body.setLinearVelocity(opts.velocity);
    }

    if (opts.angularVelocity) {
      this.body.setAngularVelocity(opts.angularVelocity);
    }
  }

  setFromPortal(portal) {
    this.fromPortal = portal;
  }

  getFromPortal() {
    return this.fromPortal;
  }
  

}