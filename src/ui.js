// ui.js - Handles the mouse, keyboard and touch events. It also creates the 
//         basic UI around the canvas.


import * as THREE           from 'three' 
import {jst}                from "jayesstee";

export class UI extends jst.Component {
  constructor(app, opts) {
    super();
    this.app           = app;
    this.camera        = opts.camera;
    this.scene         = opts.scene;
    this.eventId       = 0;
    this.eventHandlers = {
      down: {},
      up: {},
      move: {},
    };
  }

  cssGlobal() {
    return {
      body: {
        fontFamily:      '"Helvetica Neue", Helvetica, Arial, sans-serif',
        padding$px:      0,
        margin$px:       0
      },
    
    };
  }

  render() {
    return jst.$div(
      {
        id: "ui",
        events: {
        },
      },
      
    );
  }

  setScene(scene) {
    this.scene = scene;
  }

  setCamera(camera) {
    this.camera = camera;
  }
  
  // Pass in the 3d context element for pointer events
  addPointerEvents(el) {
    // Register all the pointer events
    el.addEventListener("pointerdown", (e) => this.onPointerEvent(e, 'down'));
    el.addEventListener("pointerup",   (e) => this.onPointerEvent(e, 'up'));
    el.addEventListener("pointermove", (e) => this.onPointerEvent(e, 'move'));
  }
  
  // Register for specific pointer events
  // These should come and go objects are being interacted with
  registerPointerEvent(type, callback) {
    this.eventId++;
    this.eventHandlers[type][this.eventId] = callback;
    return this.eventId;
  }

  unregisterPointerEvent(type, id) {
    delete this.eventHandlers[type][id];
  }
  
  // Pointer events
  onPointerEvent(e, type) {
    const intersect = this.getFirstIntersect(e);
    if (intersect) {
      const obj = intersect.object;
      if (obj.userData && obj.userData.pointerEvent && obj.userData.pointerEvent[type]) {
        obj.userData.pointerEvent[type](e, intersect, type);
      }
    }

    // Call all the registered callbacks
    for (let id in this.eventHandlers[type]) {
      this.eventHandlers[type][id](e);
    }      

  }


  getFirstIntersect(event) {
    // Get the mouse position
    let mouse = new THREE.Vector2();
    mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

    // Create a raycaster
    let raycaster = new THREE.Raycaster();
    raycaster.setFromCamera( mouse, this.camera );

    // Get the first intersect
    let intersects = raycaster.intersectObjects( this.scene.children, true );
    if (intersects.length > 0) {
      return intersects[0];
    }
    
    return null;

  }

  // This will return the x,y position of the mouse in 3d space given the z
  // It does not use an intersect, but rather a raycast from the camera
  getMousePosGivenZ(event, targetZ) {
    let vec = new THREE.Vector3();
    let pos = new THREE.Vector3();
    
    vec.set(
        ( event.clientX / window.innerWidth ) * 2 - 1,
        - ( event.clientY / window.innerHeight ) * 2 + 1,
        0.5 );
    
    vec.unproject( this.camera );
    
    vec.sub( this.camera.position ).normalize();
    
    var distance = (targetZ - this.camera.position.z) / vec.z;
    
    pos.copy( this.camera.position ).add( vec.multiplyScalar( distance ) );    
    return pos;
  }


}
