// board.js - Object definition for the main board in which all the action happens

import * as THREE     from 'three' 
import {StaticObject}         from './static-object.js'
import {Block}                from './block.js'
import {Assets}               from '../assets.js'


const edgeWidth            = 0.4
const edgeDepth            = 2

export class Board extends StaticObject {

  constructor(app, opts) {
    super(app, opts)

    // Dimensions of board are given with two corners
    this.x1       = opts.x1;
    this.y1       = opts.y1;
    this.x2       = opts.x2;
    this.y2       = opts.y2;

    // The board never rotates
    this.rotation = 0;

    // Get the UI Selection Manager
    this.uis = this.app.ui.getUiSelection();

    this.create()

  }

  create() {
    super.create();

    const ea = this.app.scale(edgeWidth) / 2

    this.createBack();
    this.createEdge(this.x1-ea, this.y1, this.x2+ea, this.y1);
    this.createEdge(this.x1, this.y1+ea, this.x1, this.y2-ea);
    this.createEdge(this.x1-ea, this.y2, this.x2+ea, this.y2);
    this.createEdge(this.x2, this.y1+ea, this.x2, this.y2-ea);
    this.createScrewHeads();
    //this.createEdge(this.x1+3*ea, this.y1+45*ea, this.x2-10*ea, this.y1+35*ea);
    //this.createEdge(this.x1+10*ea, this.y1+20*ea, this.x2-3*ea, this.y1+25*ea);

  }

  createBack() {

    // Back of the board
    const width    = this.x2 - this.x1;
    const height   = this.y2 - this.y1;
    const depth    = 1;
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshStandardMaterial({
      map:          Assets.textures.woodTexture.albedo,
      normalMap:    Assets.textures.woodTexture.normal,
      normalScale:  new THREE.Vector2( 1, - 1 ), 
      roughnessMap: Assets.textures.woodTexture.rough,
      metalness:    0,
      roughness:    1,
    });
    const back     = new THREE.Mesh(geometry, material);

    // Position it so that the top left corner is at x1, y1
    back.position.x = this.x1 + width / 2;
    back.position.y = this.y1 + height / 2;
    back.position.z = -depth / 2;

    // Receive shadows if turned on
    back.receiveShadow = this.useShadows;

    // Add it to the scene
    this.group.add(back);
    
  }

  createEdge(x1, y1, x2, y2) {

    // Create a box for the edge that goes from x1, y1 to x2, y2 with a width of edgeWidth
    const depth    = this.app.scale(edgeDepth)
    const width    = this.app.scale(edgeWidth)

    // Find the distance between the two points
    const dx     = x2 - x1;
    const dy     = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);

    // Find the angle between the two points
    const angle = Math.atan2(dy, dx);

    // Create the geometry
    const geometry = new THREE.BoxGeometry(length, width, depth);

    // Create the material
    const material = new THREE.MeshStandardMaterial({
      map:          Assets.textures.woodTexture.albedo,
      normalMap:    Assets.textures.woodTexture.normal,
      normalScale:  new THREE.Vector2( 1, - 1 ),
      roughnessMap: Assets.textures.woodTexture.rough,
      metalness:    0,
      roughness:    1,
    });

    // Create the mesh
    const edge = new THREE.Mesh(geometry, material);

    // Position it so that the top left corner is at x1, y1
    edge.position.x = x1 + dx / 2;
    edge.position.y = y1 + dy / 2;
    edge.position.z = depth / 2;

    // Rotate it to the correct angle
    edge.rotation.z = angle;

    // Cast and Receive shadows if turned on
    edge.receiveShadow = this.useShadows;
    edge.castShadow    = this.useShadows;

    // Add it to the scene
    this.group.add(edge);

    // And add the edge to the physics world
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    console.log("Creating edge at " + cx + ", " + cy + " with length " + length + " and angle " + angle);
    console.log("phys engine is " + this.app.getPhysicsEngine());
    let body = this.app.getPhysicsEngine().createBox(this, cx, -cy, length, width,{isStatic: true, angle: -angle, friction: 0.9, restitution: 0.2});
    edge.userData.physicsBody = body;

  }

  createScrewHeads() {

    this.screwHeads = [];

    // Make four screw heads
    [[0,0], [0,1], [1,1], [1,0]].forEach((cornerCoords) => {

      const x = cornerCoords[0] ? this.x2 : this.x1;
      const y = cornerCoords[1] ? this.y2 : this.y1;

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
      screwHead.castShadow    = false;

      pivot.add(screwHead)
      // If we want this, then we need to keep track of it so when we recreate the barrier, we can give the same angle
      //pivot.rotation.z = -0.5 + Math.random()

      // Selection properties for a screw head
      const uisInfo = {
        moveable:          true,
        rotatable:         false,
        selectable:        false,
        selectedMaterial:  new THREE.MeshPhongMaterial({color: 0xbbbb55, specular: 0x111111, shininess: 200}),
        onDown:            (obj, pos, info) => this.onDownScrewHead(pivot, pos, info, cornerCoords),
        onMove:            (obj, pos, info) => this.onMoveScrewHead(pivot, pos, info, cornerCoords),
      };

      // Register the object with the UI Selection Manager
      this.uis.registerObject(screwHead, uisInfo);

      pivot.position.set(x, y, this.app.scale(edgeDepth))
      //pivot.position.set(x, y, 100)

      this.group.add(pivot)

      this.screwHeads.push(pivot)
    })
  }

  onDownScrewHead(screwHead, pos, info, cornerCoords) {
    console.log("Down on screw head");
  }

  onMoveScrewHead(screwHead, pos, info, cornerCoords) {
    console.log("Move on screw head");
    const xName = cornerCoords[0] ? "x2" : "x1";
    const yName = cornerCoords[1] ? "y2" : "y1";

    // Move the screw head by the delta amount
    this[xName] += info.deltaPos.x;
    this[yName] += info.deltaPos.y;

    this.reDraw();
  }

}