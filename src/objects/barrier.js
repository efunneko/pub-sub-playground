// barrier.js - This is a wooden barrier that will be user configurable to block objects

import * as THREE      from 'three';
import {StaticObject}  from './static-object.js';
import {Assets}        from '../assets.js'

const defaultBarrierWidth  = 20;
const defaultBarrierDepth  = 100;

export class Barrier extends StaticObject {
  constructor(app, opts) {
    super(app, opts, [
      {name: "points", type: "hidden"},
    ])

    // The snap grid size
    this.snapSize = opts.snapSize || 10;

    // Barriers are made up of a list of 2d points
    this.points = opts.points || [{x: 0, y: 0}, {x: 100, y: 0}];

    // Snap all points to the grid
    this.points = this.points.map(p => this.snapToGridVec2(p));

    // Get the UI Selection Manager
    this.uis = this.app.ui.getUiSelection();

    // Set to false until we are destroyed
    this.destroyed = false;

    // Set to true if a new barrier is being created during a drag
    this.creatingBarrier = false;

    // Sanity check to remove any duplicate points
    this.removeDuplicatePoints();

    // Now create the barrier
    this.create()

  }

  create() {
    super.create();
    this.createBarrier();
  }

  destroy() {
    super.destroy();    
    this.destroyed = true;
  }

  // Create a shape from the points
  createBarrier() {

    // First create the material with a wood texture
    const material = new THREE.MeshStandardMaterial({
      map:          Assets.textures.woodTexture.albedo,
      normalMap:    Assets.textures.woodTexture.normal,
      roughnessMap: Assets.textures.woodTexture.rough,
      normalScale:  new THREE.Vector2( 1, - 1 ), 
      metalness:    0,
      roughness:    1,
    });

    // If barrier is selected, then add an emissive color
    if (this.barrierSelected) {
      material.emissive = new THREE.Color(0x333308);
    }

    // Selection properties for all objects in the barrier
    const uisInfo = {
      moveable:          true,
      rotatable:         false,
      selectable:        true,
      onDown:            (obj, pos, info) => this.onDownBarrier(obj, pos, info),
      onMove:            (obj, pos, info) => this.onMoveBarrier(obj, pos, info),
      onUp:              (obj, pos, info) => this.onUpBarrier(obj, pos, info),
      onSelected:        (obj) => this.onSelectedBarrier(obj),
      onUnselected:      (obj) => this.onUnselectedBarrier(obj),
      onDelete:          (obj) => this.onDeleteBarrier(obj),
      hoverCursor:       "grab",
      moveCursor:        "grabbing",
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
      this.uis.registerMesh(mesh, uisInfo);

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

  createCylinder(p, material, uisInfo) {
    const cylinderDepth = defaultBarrierDepth*1.005;
    let cylinder    = new THREE.CylinderGeometry(defaultBarrierWidth/2, defaultBarrierWidth/2, cylinderDepth, 16);
    let mesh        = new THREE.Mesh(cylinder, material);

    mesh.position.x = p.x;
    mesh.position.y = p.y;
    mesh.position.z = cylinderDepth / 2;
    mesh.rotation.x = Math.PI / 2;

    mesh.receiveShadow = this.useShadows;
    mesh.castShadow    = this.useShadows;

    this.group.add(mesh);

    mesh.userData.physicsBody = this.app.getPhysicsEngine().createCircle(this, p.x, -p.y, defaultBarrierWidth/2, {isStatic: true, friction: 0.9, restitution: 0.2});
    mesh.userData.type        = "barrier";

    // Register the object with the UI Selection Manager
    this.uis.registerMesh(mesh, uisInfo);

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
      selectedMaterial:  new THREE.MeshPhongMaterial({color: 0xbbbb55, specular: 0x111111, shininess: 200}),
      onDown:            (obj, pos, info) => this.onDownScrewHead(screwHead, pos, info),
      onMove:            (obj, pos, info) => this.onMoveScrewHead(screwHead, pos, info),
      onUp:              (obj, pos, info) => this.onUpScrewHead(screwHead, pos, info),
      onDelete:          (obj) => this.onDeleteScrewHead(screwHead),
    };

    // Register the object with the UI Selection Manager
    this.uis.registerMesh(screwHead, uisInfo);

    // Return the screw head
    return pivot

  }

  onSelectedBarrier(obj) {
    // Change the materials of all the barrier pieces
    this.barrierSelected = true;
    this.recreateBarrier();
  }

  onUnselectedBarrier(obj) {
    // Change the materials of all the barrier pieces
    this.barrierSelected = false;
    if (!this.destroyed) {
      this.recreateBarrier();
    }
  }

  onDeleteBarrier(obj) {
    this.removeFromWorld();
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
    this.recreateBarrier();
  }

  onUpScrewHead(screwHead, pos, info) {

    if (!info.persistentSelected) {
      this.removeDuplicatePoints();
      this.recreateBarrier();
    }

    this.saveableConfigChanged();
  }

  onDeleteScrewHead(screwHead) {
    // Remove the point from the array
    this.points.splice(screwHead.parent.userData.index, 1);
    this.recreateBarrier();
    this.saveableConfigChanged();
  }

  onDownBarrier(obj, pos, info) {
    // Save all the current point locations
    this.startPoints       = this.points.map(p => p.clone());
    this.creatingDuplicate = false;
  }

  onMoveBarrier(obj, pos, info) {

    // If the CTRL key is down and we haven't already duplicated the barrier, then duplicate it
    if (info.ctrlKey && !this.creatingDuplicate) {
      this.creatingDuplicate = true;
      this.duplicate = this.app.world.addObject("barrier", {points: this.startPoints.map(p => p.clone())});
    }

    // If we are creating a duplicate, but the CTRL key is no longer down, then stop creating the duplicate
    if (!info.ctrlKey && this.creatingDuplicate) {
      this.creatingDuplicate = false;
      this.app.world.removeObject(this.duplicate);
      this.duplicate = null;
    }

    // Update the points for the new position of the barrier and redraw the barrier
    this.points.forEach((point, i) => {
      point.x = this.startPoints[i].x + this.snapToGridSingle(pos.x - info.posAtMouseDown.x);
      point.y = this.startPoints[i].y + this.snapToGridSingle(pos.y - info.posAtMouseDown.y);
    });

    this.recreateBarrier();

  }    

  onUpBarrier(obj, pos, info) {
    this.saveableConfigChanged();
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
    this.uis.selectMesh(obj);
    this.recreateBarrier();
  }

  removeDuplicatePoints() {
    // Filter the points to remove any consecutive duplicates
    this.points = this.points.filter((p, i) => {
      if (i === 0) {
        return true;
      }
      return !p.equals(this.points[i-1]);
    });
  }

  snapToGrid(x, y) {
    return [Math.round(x / this.snapSize) * this.snapSize, Math.round(y / this.snapSize) * this.snapSize];
  }

  snapToGridSingle(val) {
    return Math.round(val / this.snapSize) * this.snapSize;
  }

  snapToGridVec2(v) {
    return new THREE.Vector2(Math.round(v.x / this.snapSize) * this.snapSize, Math.round(v.y / this.snapSize) * this.snapSize);
  }

  recreateBarrier() { 
    this.destroy()
    this.create()
  }
 
}