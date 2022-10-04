// barrier.js - This is a wooden barrier that will be user configurable to block objects

import * as THREE      from 'three';
import {StaticObject}  from './static-object.js';
import {Assets}        from '../assets.js'

const defaultBarrierWidth  = 20;
const defaultBarrierDepth  = 100;

export class Barrier extends StaticObject {
  constructor(app, opts) {
    super(app, opts)

    // Barriers are made up of a list of 2d points
    // We will render them as an extruded shape
    // We will put a screw head model at each point
    this.points = opts.points || []

    this.create()

  }

  create() {

    // Create the barrier
    this.createBarrier();

  }

  // Create a shape from the points
  createBarrier() {

    // First create the material with a wood texture
    const material = new THREE.MeshStandardMaterial({
      map:          Assets.textures.woodTexture.albedo,
      normalMap:    Assets.textures.woodTexture.normal,
      normalScale:  new THREE.Vector2( 1, - 1 ), 
      roughnessMap: Assets.textures.woodTexture.rough,
      metalness:    0,
      roughness:    1,
    });

  
    // For each pair of points, draw a box between them
    // The box will be centered on the center point between the two points
    // and rotated to be parallel to the line between the two points
    // and it will have the thinkness of defaultBarrierThickness
    let prevPoint = this.points[0];
    for (let i = 1; i < this.points.length; i++) {

      let p1          = prevPoint;
      let p2          = this.points[i];

      // Draw the box
      let center      = new THREE.Vector2((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
      let angle       = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      let length      = p1.distanceTo(p2);
      let box         = new THREE.BoxGeometry(length, defaultBarrierWidth, defaultBarrierDepth);
      let mesh        = new THREE.Mesh(box, material);
      mesh.position.x = center.x;
      mesh.position.y = center.y;
      mesh.position.z = defaultBarrierDepth / 2;
      mesh.rotation.z = angle;
      mesh.receiveShadow = this.useShadows;
      mesh.castShadow    = this.useShadows;
      this.group.add(mesh);

      // And add the physics block too
      mesh.userData.physicsBody = this.app.getPhysicsEngine().createBox(this, center.x, -center.y, length, defaultBarrierWidth, {isStatic: true, angle: -angle, friction: 0.9, restitution: 0.2});
      this.addBarrierMouseHandlers(mesh);
      // Draw a cylinder on each point
      this.createCylinder(p1, material);
      
      prevPoint = p2;
    }
    this.createCylinder(prevPoint, material);

    // Add a screw head at each point
    this.points.forEach((point, i) => {
      let screwHead = this.createScrewHead();
      screwHead.position.x = point.x;
      screwHead.position.y = point.y;
      screwHead.position.z = 100;
      screwHead.userData.index = i;
      this.group.add(screwHead);
    });

  }

  destroyBarrier() {
    this.group.children.forEach(child => {
      if (child.userData.physicsBody !== undefined) {
        this.app.getPhysicsEngine().removeBody(child.userData.physicsBody);
      }
    });

    this.group.remove(...this.group.children);

  }

  createCylinder(p, material) {
    let cylinder    = new THREE.CylinderGeometry(defaultBarrierWidth/2, defaultBarrierWidth/2, defaultBarrierDepth, 8);
    let mesh        = new THREE.Mesh(cylinder, material);
    mesh.position.x = p.x;
    mesh.position.y = p.y;
    mesh.position.z = defaultBarrierDepth / 2;
    mesh.rotation.x = Math.PI / 2;
    mesh.receiveShadow = this.useShadows;
    mesh.castShadow    = this.useShadows;
    this.group.add(mesh);

    mesh.userData.physicsBody = this.app.getPhysicsEngine().createCircle(this, p.x, -p.y, defaultBarrierWidth/2, {isStatic: true, friction: 0.9, restitution: 0.2});
    this.addBarrierMouseHandlers(mesh);
  }

  createScrewHead() {

    // Clone the screw head
    let screwHead = Assets.models.screwHead.clone();

    // Scale the screw head
    screwHead.scale.set(1, 1, 1);
    screwHead.rotation.x = Math.PI / 2;
    //screwHead.rotation.y = Math.random() * Math.PI * 2;
    screwHead.material = new THREE.MeshPhongMaterial({color: 0x999999, specular: 0x111111, shininess: 200});

    const pivot = new THREE.Group()

    screwHead.position.set(-19.5, 15, 1)
    
    // Cast a shadow
    screwHead.receiveShadow = this.useShadows;
    screwHead.castShadow    = this.useShadows;

    pivot.add(screwHead)
    pivot.rotation.z = -0.5 + Math.random()

    // Add some mouse handlers
    this.addScrewMouseHandlers(screwHead);

    // Return the screw head
    return pivot

  }

  addBarrierMouseHandlers(obj) {

    let userData = obj.userData;

    userData.pointerEvent = {};

    userData.pointerEvent.down = (e, intersect) => {
      this.app.ui.registerPointerEvent("up", (e) => {
        userData.isDragging = false;
      });

      this.app.ui.registerPointerEvent("move", (e) => {
        if (userData.isDragging) {
          this.moveBarrier(obj, e);
        }
      });

      let pos = this.app.ui.getMousePosGivenZ(e, intersect.point.z);
      obj.userData.isDragging = true;
      obj.userData.dragStartX = pos.x;
      obj.userData.dragStartY = pos.y;
      obj.userData.dragStartZ = intersect.point.z;

      // Clone all the points
      this.startPoints = this.points.map(p => p.clone());
    }
  }



  addScrewMouseHandlers(screwHead) {

    // Get the userdata for the screw head
    let userData = screwHead.userData;

    userData.pointerEvent = {};

    userData.pointerEvent.down = (e, intersect) => {
      this.app.ui.registerPointerEvent("up", (e) => {
        screwHead.userData.isDragging = false;
      });

      this.app.ui.registerPointerEvent("move", (e) => {
        if (screwHead.userData.isDragging) {
          this.moveScrewHead(screwHead, e);
        }
      });

      let pos = this.app.ui.getMousePosGivenZ(e, intersect.point.z);
      screwHead.userData.isDragging = true;
      screwHead.userData.dragStartX = pos.x;
      screwHead.userData.dragStartY = pos.y;
      screwHead.userData.dragStartZ = intersect.point.z;
      screwHead.material = new THREE.MeshPhongMaterial({color: 0x99ff99, specular: 0xffffff, shininess: 200});

    }

  }

  moveScrewHead(screwHead, e) {
    let pos = this.app.ui.getMousePosGivenZ(e, screwHead.userData.dragStartZ);

    // Update the points for the new position of the screw head and redraw the barrier
    this.points[screwHead.parent.userData.index].x = pos.x;
    this.points[screwHead.parent.userData.index].y = pos.y;
    this.destroyBarrier();
    this.createBarrier();
  }

  moveBarrier(obj, e) {
    let pos = this.app.ui.getMousePosGivenZ(e, obj.userData.dragStartZ);

    // Update the points for the new position of the barrier and redraw the barrier
    this.points.forEach((point, i) => {
      point.x = this.startPoints[i].x + (pos.x - obj.userData.dragStartX);
      point.y = this.startPoints[i].y + (pos.y - obj.userData.dragStartY);
    });
    this.destroyBarrier();
    this.createBarrier();

  }    

 
}