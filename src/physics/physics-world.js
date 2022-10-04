// physics-world.js - Top level class for the physics engine

// This class will handle the interaction with the physics engine
// and the 3D rendering engine


export class PhysicsWorld {
  constructor(app, opts) {
    this.app        = app
    this.opts       = Object.assign({}, opts)
    this.objectRefs = {};
    this.collisionHandlers = {};

  }


  addBody(object, body) {
    World.add(this.world, body)
    this.objectRefs[body.id] = object
    return body
  }

  removeBody(body) {
    if (this.collisionHandlers[body.id]) {
      delete(this.collisionHandlers[body.id]);
    }
    World.remove(this.world, body);
  }


}