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

    // The snap grid size
    this.snapSize = opts.snapSize || 10;

    // Information about an object being dragged
    this.dragInfo = {
      obj: null,
      start: null,
      selectedInfo: null,
      isDragging: false,
    };

    // Get the UI Selection Manager
    this.uis = this.app.ui.getUiSelection();

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

    // Selection properties for all objects in the barrier
    const uisInfo = {
      moveable:          true,
      rotatable:         false,
      selectable:        false,
      onDown:            (obj, pos, info) => this.onDownBarrier(obj, pos, info),
      onMove:            (obj, pos, info) => this.onMoveBarrier(obj, pos, info),
    };
  
    // For each pair of points, draw a box between them
    // The box will be centered on the center point between the two points
    // and rotated to be parallel to the line between the two points
    // and it will have the thinkness of defaultBarrierThickness
    let prevPoint = this.points[0];
    for (let i = 1; i < this.points.length; i++) {

      let p1          = prevPoint;
      let p2          = this.points[i];

      // Draw the box
      let center         = new THREE.Vector2((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
      let angle          = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      let length         = p1.distanceTo(p2);
      let box            = new THREE.BoxGeometry(length, defaultBarrierWidth, defaultBarrierDepth);
      let mesh           = new THREE.Mesh(box, material);

      // Set the position and rotation
      mesh.position.x    = center.x;
      mesh.position.y    = center.y;
      mesh.position.z    = defaultBarrierDepth / 2;
      mesh.rotation.z    = angle;
      mesh.receiveShadow = this.useShadows;
      mesh.castShadow    = this.useShadows;

      mesh.userData.type = "barrier";

      // Add the mesh to the group
      this.group.add(mesh);

      // And add the physics block too
      mesh.userData.physicsBody = this.app.getPhysicsEngine().createBox(this, center.x, -center.y, length, defaultBarrierWidth, {isStatic: true, angle: -angle, friction: 0.9, restitution: 0.2});

      // Register the object with the UI Selection Manager
      this.uis.registerObject(mesh, uisInfo);

      // Draw a cylinder on each point
      this.createCylinder(p1, material, uisInfo);
      
      prevPoint = p2;
    }

    this.createCylinder(prevPoint, material, uisInfo);

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

  createCylinder(p, material, uisInfo) {
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
    mesh.userData.type        = "barrier";

    // Register the object with the UI Selection Manager
    this.uis.registerObject(mesh, uisInfo);

  }

  createScrewHead() {

    // Clone the screw head
    let screwHead = Assets.models.screwHead.clone();

    // Scale the screw head
    screwHead.scale.set(1, 1, 1);
    screwHead.rotation.x = Math.PI / 2;
    screwHead.material = new THREE.MeshPhongMaterial({color: 0x999999, specular: 0x111111, shininess: 200});

    const pivot = new THREE.Group()

    screwHead.position.set(-19.5, 15, 1)
    
    // Cast a shadow
    screwHead.receiveShadow = this.useShadows;
    screwHead.castShadow    = this.useShadows;

    pivot.add(screwHead)
    // If we want this, then we need to keep track of it so when we recreate the barrier, we can give the same angle
    //pivot.rotation.z = -0.5 + Math.random()

    // Selection properties for a screw head
    const uisInfo = {
      moveable:          true,
      rotatable:         false,
      selectable:        true,
      selectedMaterial:  new THREE.MeshPhongMaterial({color: 0x66ff66, specular: 0x111111, shininess: 200}),
      onDown:            (obj, pos, info) => this.onDownScrewHead(screwHead, pos, info),
      onMove:            (obj, pos, info) => this.onMoveScrewHead(screwHead, pos, info),
      onDelete:          (obj) => this.onDeleteScrewHead(screwHead),
    };

    // Register the object with the UI Selection Manager
    this.uis.registerObject(screwHead, uisInfo);

    // Return the screw head
    return pivot

  }


  onDownScrewHead(screwHead, pos, info) {
  }

  onMoveScrewHead(screwHead, pos, info) {

    const [x, y] = this.snapToGrid(pos.x, pos.y);

    // If this screwhead was not previously selected and it was the first or last screwhead, then we will add a new point
    if (!info.persistentSelected && (screwHead.parent.userData.index === 0 || screwHead.parent.userData.index === this.points.length - 1)) {
      this.addPoint(screwHead, screwHead.parent.userData.index, x, y);
    }

    // Update the points for the new position of the screw head and redraw the barrier
    this.points[screwHead.parent.userData.index].x = x;
    this.points[screwHead.parent.userData.index].y = y;
    this.destroyBarrier();
    this.createBarrier();
  }

  onDeleteScrewHead(screwHead) {
    // Remove the point from the array
    this.points.splice(screwHead.parent.userData.index, 1);
    this.destroyBarrier();
    this.createBarrier();
  }

  onDownBarrier(obj, pos, info) {
    // Save all the current point locations
    this.startPoints = this.points.map(p => p.clone());
  }

  onMoveBarrier(obj, pos, info) {

    // Update the points for the new position of the barrier and redraw the barrier
    this.points.forEach((point, i) => {
      point.x = this.startPoints[i].x + (pos.x - info.posAtMouseDown.x);
      point.y = this.startPoints[i].y + (pos.y - info.posAtMouseDown.y);
    });
    this.destroyBarrier();
    this.createBarrier();

  }    

  addPoint(obj, index, x, y) {

    [x,y] = this.snapToGrid(x, y);

    // Adding a point on either the start or end
    //  - Add a new point to the points array
    //  - If we are adding the last point, then we have to change the last screw head to be the new last screw head
    if (index === 0) {
      this.points.unshift(new THREE.Vector2(x, y));
    }
    else {
      this.points.push(new THREE.Vector2(x, y));
      obj.parent.userData.index = this.points.length - 1;
    }

    // Need to mark the new screw head as selected
    this.uis.selectObject(obj);

    this.destroyBarrier();
    this.createBarrier();
  }

  snapToGrid(x, y) {
    return [Math.round(x / this.snapSize) * this.snapSize, Math.round(y / this.snapSize) * this.snapSize];
  }
 
}