import {jst}                   from "jayesstee";
import {Body}                  from "./body";
import {UI}                    from "./ui";
import {World}                 from "./world.js"

const DEBUG_MODE = true;

export class App extends jst.Component {
  constructor(specs) {
    super();
    
    this.title              = "Solly Goldberg";
    this.alerts             = [];
          
    this.width              = window.innerWidth;
    this.height             = window.innerHeight;

    this.debug              = DEBUG_MODE;
 
    this.scaleFactor        = 50;

    this.body               = new Body(this, this.width, this.height, this.fontScale);

    this.ui                 = new UI(this, {});

    this.world              = new World(this, {ui: this.ui})



    // Listen for window resize events
    window.onresize = e => this.resize();

  }
 
  render() {
    return jst.$div(
      {id: "app"},
      this.ui,
      this.body,
    );
  }

  resize() {
    // Need a small timeout for iOS or the dimensions are wrong
    setTimeout(() => {
      this.width        = window.innerWidth;
      this.height       = window.innerHeight;
      this.body.resize(this.width, this.height);
      this.refresh();
    }, 100);
  }

  setPhysicsEngine(physics) {
    this.physicsEngine = physics;
  } 

  getPhysicsEngine() {
    return this.physicsEngine;
  }

  scale(...args) {
    if (args.length == 1) {
      console.log("scale", args[0], this.scaleFactor);
      return args[0] * this.scaleFactor;

    } else {
      return args.map(a => a * this.scaleFactor);
    }
  }
}

