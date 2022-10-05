// physics-world.js - Top level class for the physics engine

// This class will handle the interaction with the physics engine
// and the 3D rendering engine

import {PhysicsWorld} from './physics-world.js';

const planck = require('planck-js');

// Some defaults
const defaultWorldScale = 1/25

export class PhysicsWorldPlanck extends PhysicsWorld {
  constructor(app, opts) {
    super(app, opts)
    this.objectRefs        = {};
    this.collisionHandlers = {};
    this.worldScale        = opts && opts.worldScale || defaultWorldScale;

    this.init()

  }

  // Initialize the Planck physics engine
  init() {
    this.world = planck.World({
      gravity: planck.Vec2(0, this.scale(-400))
    });

    // Get collision events
    this.world.on('begin-contact', (contact) => this.collision(contact));

  }


  start() {
  }

  doPhysics(time) {

    //console.warn("doPhysics", time) 
    let delta = (time - this.lastTime) || 16;
    if (delta > 50) {
      delta = 50;
    }

    try {      

      const velocityIterations = 4;
      const positionIterations = 4;
      let step = delta / 1000;
      //step = 1/60;
      //console.log("step", time, delta, step)
      this.world.step(step, velocityIterations, positionIterations);

      let bodyList = this.world.getBodyList();

      for (let body = bodyList; body; body = body.getNext()) {
        //console.log("body", body)
        let obj = body.getUserData();
        if (obj) {
          let pos = body.getPosition();
          if (Math.abs(pos.x) > 10000 || Math.abs(pos.y) > 10000) {
            object.destroy();
          }
          else {
            const bodyInfo = {
              position: {
                x: this.unscale(pos.x),
                y: this.unscale(-pos.y)
              },
              angle: -body.getAngle()
            }
            obj.update(bodyInfo);
          }
        }
      }
    }
    catch(e) {
      console.log("Error:", e)
    }

    this.lastTime = time;

  }

  collision(e) {
    // todo
  }

  createBody(object, x, y, opts) {
    return this.world.createBody({
      type:     opts.isStatic ? 'static' : 'dynamic',
      position: planck.Vec2(this.scale(x), this.scale(-y)),
      angle:    -opts.angle || 0,
    })
  }

  // Create functions
  createBox(object, x, y, width, height, opts) {
    //console.log("createBox", x, y, width, height, opts, this.fixCreateOpts(opts))
    let body = this.createBody(object, x, y, opts);
    opts = this.fixCreateOpts(opts)
    opts.shape = planck.Box(this.scale(width/2), this.scale(height/2))
    opts.density = 1.0
    let box = body.createFixture(opts);
    return this.addBody(object, body)

  }

  createCircle(object, x, y, radius, opts) {
    let body = this.createBody(object, x, y, opts)
    radius = this.scale(radius)
    opts.shape = planck.Circle(radius)
    opts.density = 1.0
    opts.inertia = 1.0
    opts = this.fixCreateOpts(opts)
    //console.log("createCircle", x, y, radius, opts)
    let circle = body.createFixture(opts)
    return this.addBody(object, body)
  }

  createPolygon(object, x, y, sides, radius, opts) {
    //return this.addBody(object, Bodies.polygon(x, y, sides, radius, this.fixCreateOpts(opts)));
  } 

  addBody(object, body) {
    body.setUserData(object);
    this.objectRefs[body.id] = object
    return body
  }

  removeBody(body) {
    if (this.collisionHandlers[body.id]) {
      delete(this.collisionHandlers[body.id]);
    }
    this.world.destroyBody(body);
  }

  fixCreateOpts(opts) {
    if (!opts) {
      opts = {};
    }
    if (opts.isStatic) {
      opts.type = 'static';
    }
    else {
      opts.type = 'dynamic';
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

  setPosition(body, x, y) {
    body.setPosition(planck.Vec2(this.scale(x), this.scale(-y)));
  }

  scale(val) {
    return val * this.worldScale;
  } 
  
  unscale(val) {
    return val / this.worldScale;
  } 


}