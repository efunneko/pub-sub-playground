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
    this.destroyList       = [];
    this.worldScale        = opts && opts.worldScale || defaultWorldScale;
    this.nextBodyId        = 1;

    this.init()

  }

  // Initialize the Planck physics engine
  init() {
    this.world = planck.World({
      gravity: planck.Vec2(0, this.scale(-500))
    });

    // Get collision events
    this.world.on('begin-contact', (contact) => this.collision(contact));

  }


  start() {
  }

  pause() {
    // Loop over all bodies and put them to sleep
    let bodyList = this.world.getBodyList();
    for (let body = bodyList; body; body = body.getNext()) {
      body.setAwake(false);
    }
  }

  play() {
    // Loop over all bodies and wake them up
    let bodyList = this.world.getBodyList();
    for (let body = bodyList; body; body = body.getNext()) {
      body.setAwake(true);
    }
  }

  doPhysics(time) {

    // If there are pending destroy bodies, do it now
    if (this.destroyList.length > 0) {
      this.destroyList.forEach((body) => {
        this.world.destroyBody(body);
      });
      this.destroyList = [];
    }

    //console.warn("doPhysics", time) 
    let delta = (time - this.lastTime) || 16;
    if (delta > 50) {
      delta = 50;
    }

    try {      

      const velocityIterations = 4;
      const positionIterations = 8;
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
            obj.destroy();
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

  collision(contact) {
    let bodyA = contact.getFixtureA().getBody();
    let bodyB = contact.getFixtureB().getBody();

    if (this.collisionHandlers[bodyA.id]) {
      this.collisionHandlers[bodyA.id](bodyB, bodyB.getUserData());
    }
    if (this.collisionHandlers[bodyB.id]) {
      this.collisionHandlers[bodyB.id](bodyA, bodyA.getUserData());
    }

  }

  createBody(object, x, y, opts) {
    const body = this.world.createBody({
      type:     opts.isStatic ? 'static' : 'dynamic',
      position: planck.Vec2(this.scale(x), this.scale(-y)),
      angle:    -opts.angle || 0,
    })
    body.id = this.nextBodyId++;
    if (opts.onCollision) {
      this.collisionHandlers[body.id] = opts.onCollision;
    }
    return body
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
    this.destroyList.push(body)
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

  /*
  // Handle collisions
  handleCollision(contact, oldManifold) {
    //world.on('pre-solve', function(contact, oldManifold) {
      let worldManifold = contact.getWorldManifold();
  
      let bodyA = contact.getFixtureA().getBody();
      let bodyB = contact.getFixtureB().getBody();
  
      console.log("Collision", bodyA, bodyB);
  
      return;
    
      let state1 = []; // [PointState]
      let state2 = []; // [PointState]
      getPointStates(state1, state2, oldManifold, contact.getManifold());
    
      if (state2[0] === PointState.addState) {
        let bodyA = contact.getFixtureA().getBody();
        let bodyB = contact.getFixtureB().getBody();
        let point = worldManifold.points[0];
        let vA = bodyA.getLinearVelocityFromWorldPoint(point);
        let vB = bodyB.getLinearVelocityFromWorldPoint(point);
    
        let approachVelocity = Vec2.dot(vB -- vA, worldManifold.normal); //[todo]
    
        if (approachVelocity > 1) {
          myPlayCollisionSound();
        }
      }
    }
    //});  
  
*/

}