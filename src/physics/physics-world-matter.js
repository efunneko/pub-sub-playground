// physics-world.js - Top level class for the physics engine

// This class will handle the interaction with the physics engine
// and the 3D rendering engine

import {PhysicsWorld} from './physics-world.js';
import {
  Engine, 
  World, 
  Body, 
  Bodies, 
  Composite, 
  Events }            from 'matter-js';

export class PhysicsWorldMatter extends PhysicsWorld {
  constructor(app, opts) {
    super(app, opts)
    this.objectRefs = {};
    this.collisionHandlers = {};

    this.init()

  }

  // Initialize the Planck physics engine
  initPlanck() {
    this.engine = planck.World({
      gravity: planck.Vec2(0, -10)
    });

    // Get collision events
    this.engine.on('begin-contact', (contact) => this.collision(contact));

  }

  // Initialize the physics engine
  init() {

    // Create the physics engine
    this.engine = Engine.create();

    // Create the physics world
    this.world = this.engine.world;

    // Set the gravity
    this.engine.gravity.y     = 1;

    Events.on(this.engine, "collisionStart", (e) => this.collision(e));

  }

  start() {
  }

  doPhysics(time) {

    let delta = (time - this.lastTime) || 16;
    if (delta > 200) {
      delta = 16;
    }

    try {      
      Engine.update(this.engine, delta);
      let bodies = Composite.allBodies(this.engine.world);
      bodies.forEach(body => {
        // Call into threejs to update the position of the object
        const object = this.objectRefs[body.id];
        if (object) {
          if (Math.abs(body.position.x) > 10000 || Math.abs(body.position.y) > 10000) {
            object.destroy();
          }
          else {
            object.update(body);
          }
        }
      });

    }
    catch(e) {
      console.log("Error:", e)
    }

    this.lastTime = time;

  }

  collision(e) {
    e.pairs.forEach(pair => {
      ['bodyA', 'bodyB'].forEach(body => {
        if (this.collisionHandlers[pair[body].id]) {
          if (body === 'bodyA') {
            this.collisionHandlers[pair[body].id](pair[body], pair.bodyB, this.renderBodies[pair.bodyB.id]);
          }
          else {
            this.collisionHandlers[pair[body].id](pair[body], pair.bodyA, this.renderBodies[pair.bodyA.id]);
          }
        }
      })
    })
  }

  // Create functions
  createBox(object, x, y, width, height, opts) {
    console.log("createBox", x, y, width, height, opts, this.fixCreateOpts(opts))
    return this.addBody(object, Bodies.rectangle(x, y, width, height, this.fixCreateOpts(opts)));
  }

  createCircle(object, x, y, radius, opts) {
    console.log("createCircle", x, y, radius, opts)
    return this.addBody(object, Bodies.circle(x, y, radius, this.fixCreateOpts(opts)));
  }

  createPolygon(object, x, y, sides, radius, opts) {
    return this.addBody(object, Bodies.polygon(x, y, sides, radius, this.fixCreateOpts(opts)));
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

  fixCreateOpts(opts) {
    if (!opts) {
      opts = {};
    }
    if (!opts.friction) {
      opts.friction = 0.01;
    }
    if (!opts.frictionAir) {
      opts.frictionAir = 0.01;
    }
    if (!opts.restitution) {
      opts.restitution = 0.5;
    }
    if (!opts.density) {
      opts.density = 0.001;
    }
    return opts;
  }


}