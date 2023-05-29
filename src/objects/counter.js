// counter.js - Object definition for a counter object

import * as THREE             from 'three' 
import {StaticObject}         from './static-object.js'
import {Assets}               from '../assets.js'
import {utils}                from '../utils.js'


const torusRadius              = 1
const torusTubeRadius          = 0.15
const backTubeLength           = 1
const defaultColor             = 'blue'
const defaultRotation          = 0
const defaultRadius            = 0.5
    
const openColor                = 0x000000
const closedColor              = 0xffffff
    

export class Counter extends StaticObject {
  constructor(app, opts) {
    super(app, opts, [
      {name: "fontSize", type: "number", label: "Font Size", default: 24},
      {name: "x", type: "hidden"},
      {name: "y", type: "hidden"},
      {name: "screenOffsetX", type: "number", label: "Screen Offset X", default: 0},
      {name: "screenOffsetY", type: "number", label: "Screen Offset Y", default: 0},
      {name: "rotation", type: "hidden", default: defaultRotation},
    ],
    // UI Selection Manager Options
    {
      moveable: true,
      selectable: true,
      onMove: (obj, pos, info) => this.onMove(obj, pos, info),
      onDown: (obj, pos, info) => this.onDown(obj, pos, info),
      onUp:   (obj, pos, info) => this.onUp(obj, pos, info),
      onDelete: (obj)     => this.removeFromWorld(),
    })

    this.type                = "counter"

    this.redrawOnMove        = true;

    this.radius              = opts.radius   || defaultRadius

    // Get the UI Selection Manager
    this.uis = this.app.ui.getUiSelection();

    this.create()

  }

  create() {
    super.create()
    this.createPortal()
    this.createScreen()
  }

  createPortal() {
    let uisInfo;

    this.createTorus(uisInfo);
    this.createMist(uisInfo);
    this.createTube(uisInfo);
    this.createBack(uisInfo);
    this.createScrewHeads();

    this.group.position.set(this.x, this.y, 0);
    this.group.rotation.z = this.rotation;

  }

  destroy(opts = {}) {
    this.destroyed = true;
    this.destroyPortal(opts);
    this.destroyScreen();
    super.destroy();
  }

  destroyPortal(opts = {}) {
    // Loop through the meshes and remove the physics bodies and the meshes from the group
    const children = [].concat(this.group.children);
    children.forEach(mesh => {
      if (mesh.userData.physicsBodies) {
        mesh.userData.physicsBodies.forEach(body => this.physics.removeBody(body));
        mesh.userData.physicsBodies = [];
      }
      this.group.remove(mesh);
    });

    if (!opts.keepBoundingBox) {
      this.removeBoundingBox();
    }
    
  }

  createScreen() {


  }

  destroyScreen() {


  }

  redraw() {
    this.destroyPortal({keepBoundingBox: true});
    this.destroyScreen({keepBoundingBox: true});
    this.createPortal();
    this.createScreen();
    this.adjustBoundingBox();
  }


  // Called when an object collides with the portal
  onCollision(body, obj) {
    // If we are a void portal, just destroy the object and remove it from the world
    if (this.mode === "void") {
      obj.destroy();
      if (obj.guid) {
        this.app.world.removeObjectByGuid(obj.guid);
      }
      return;
    }

    // If we aren't connected to the broker, don't do anything
    if (!this.connected) {
      console.log("Not connected to broker");
      return;
    }

    // If the object is still in cooldown, don't do anything
    if (obj.isCoolingDown() && obj.getFromPortal() === this) {
      console.log("Object is still cooling down");
      return;
    }

    // If the object is not static, then we need to send it to the broker
    if (!obj.isStatic()) {
      this.sendObjectToBroker(body, obj);
      obj.destroy();
      if (obj.guid) {
        this.app.world.removeObjectByGuid(obj.guid);
      }
    }
    else {
      console.log("Object is static");
    }

  }

  // Check for any current contacts with the portal and 
  // call onCollision() for each one
  checkForCurrentContacts() {

    // Get the list of objects that are currently colliding with the portal
    const contacts = this.physics.getContactList();

    for (let contact = contacts; contact; contact = contact.getNext()) {
      const bodyA = contact.getFixtureA().getBody();
      const bodyB = contact.getFixtureB().getBody();

      // If the portal is bodyA, then we need to check bodyB
      if (bodyA === this.collisionBody || bodyB === this.collisionBody) {
        this.physics.collision(contact);
      }
    }
  }



  createTorus(uisInfo) {

    const tr = this.app.scale(torusRadius)
    const ttr = this.app.scale(torusTubeRadius)

    // Create the geometry
    const geometry = new THREE.TorusGeometry(this.app.scale(torusRadius), this.app.scale(torusTubeRadius), 8, 32);

    // Create the material
    if (this.mode == "void") {
      this.openMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x666666,
        clearcoat: 1,
        clearcoatRoughness: 0,
        metalness: 0.5,
        roughness: 0.5,
        emissive: 0,
        emissiveIntensity: 0.1,
        reflectivity: 0.5,
        transmission: 0.5,
        transparent: true,
        opacity: 0.9,
        attenuationColor: 0xffffff,
        attenuationDistance: 0.5,
      });
    }
    else {
      this.openMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 1,
        clearcoatRoughness: 0,
        metalness: 0.5,
        roughness: 0.5,
        emissive: this.color,
        emissiveIntensity: 0.5,
        reflectivity: 0.5,
        transmission: 0.5,
        transparent: true,
        opacity: 0.8,
        attenuationColor: 0xffffff,
        attenuationDistance: 0.5,
      });
    }

    this.closedMaterial = new THREE.MeshPhysicalMaterial({
      clearcoat: 0.5,
      clearcoatRoughness: 0.5,
      metalness: 0,
      roughness: 1,
      color: 0x888888,
      emissive: this.mode == "void" ? 0x000000 : this.color,
      emissiveIntensity: 0,
      reflectivity: 0,
      transmission: 0,
      transparent: false,
      opacity: 0.8,
      attenuationColor: 0xffffff,
      attenuationDistance: 0.5,
    });


    // Create the mesh
    const mesh = new THREE.Mesh(geometry, this.openMaterial);

    // If useShadows is true, then cast and receive shadows
    mesh.castShadow    = this.useShadows;
    mesh.receiveShadow = this.useShadows;

    // Position the mesh
    mesh.position.x = 0;
    mesh.position.y = 0;
    mesh.position.z = tr;

    mesh.rotation.x = Math.PI/2;
    mesh.rotation.y = Math.PI/2;

    // Add the mesh to the scene
    this.group.add(mesh);

    // Get coords for the phys bodies that are rotations around this.x, -this.y
    const [x1, y1] = utils.rotatePoint(this.x, -this.y, this.x, tr-this.y, utils.adjustRotationForPhysics(this.rotation));
    const [x2, y2] = utils.rotatePoint(this.x, -this.y, this.x, -tr-this.y, utils.adjustRotationForPhysics(this.rotation));

    // Add the physics bodies
    mesh.userData.physicsBodies = [];
    mesh.userData.physicsBodies.push(this.physics.createCircle(this, x1, y1, ttr, {isStatic: true, friction: 0.9, restitution: 0.2, angle: utils.adjustRotationForPhysics(this.rotation)}));
    mesh.userData.physicsBodies.push(this.physics.createCircle(this, x2, y2, ttr, {isStatic: true, friction: 0.9, restitution: 0.2, angle: utils.adjustRotationForPhysics(this.rotation)}));
    
    this.torus = mesh;

  }

  createMist(uisInfo) {

    const tr = this.app.scale(torusRadius*0.95)
    const geometry = new THREE.CylinderGeometry(tr, tr, tr, 8, 1, false);
    const material = new THREE.MeshPhysicalMaterial( { 
      color: this.mode == "void" ? 0x000000 : closedColor,
      attenuationColor: 0xffffff,
      attenuationDistance: 0.1,
      transparent: true,
      transmission: 0.5,
      opacity: 0.8,
      side: THREE.DoubleSide } );
    const mesh = new THREE.Mesh( geometry, material );

    mesh.position.set(-tr/2, 0, tr);
    mesh.rotation.x = Math.PI/2;
    mesh.rotation.z = Math.PI/2;
    mesh.castShadow    = this.useShadows;

    this.group.add( mesh ); 

    this.mist = mesh;

  }

  createTube(uisInfo) {

    const tr = this.app.scale(torusRadius) * 0.99
    const btl = this.app.scale(backTubeLength)
    const ttr = this.app.scale(torusTubeRadius)

    // Create a path for the tube
    const path = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(btl-6, 0, 0),
    ]);

    const geometry = new THREE.TubeGeometry(path, 3, tr+this.app.scale(0.1), 32, false);

    let material;

    if (this.mode == "voidd") {
      material = new THREE.MeshPhongMaterial( { 
        color: 0x000000,
      });
    } else {
      material = new THREE.MeshStandardMaterial( { 
        color:        this.mode == "void" ? 0x444444 : 0xffffff,
        map:          Assets.textures.woodTexture.albedo,
        normalMap:    Assets.textures.woodTexture.normal,
        roughnessMap: Assets.textures.woodTexture.rough,
        roughness:    0.5,
        metalness:    0,
        //side: THREE.DoubleSide 
      });
    }

    if (this.selected) {
      material.emissive = new THREE.Color(0x333308);
    }

    const mesh = new THREE.Mesh( geometry, material );

    mesh.position.set(-btl, 0, tr);
    mesh.castShadow    = this.useShadows;
    mesh.receiveShadow = this.useShadows;

    this.group.add( mesh ); 

    // Get coords for the phys bodies that are rotations around this.x, -this.y
    const [x1, y1] = utils.rotatePoint(this.x, -this.y, this.x-btl/2, tr-this.y, utils.adjustRotationForPhysics(this.rotation));
    const [x2, y2] = utils.rotatePoint(this.x, -this.y, this.x-btl/2, -tr-this.y, utils.adjustRotationForPhysics(this.rotation));
    
    // Add the physics body
    mesh.userData.physicsBodies = [];
    mesh.userData.physicsBodies.push(this.physics.createBox(this, x1, y1, btl, ttr, {isStatic: true, friction: 0.9, restitution: 0.2, angle: utils.adjustRotationForPhysics(this.rotation)}));
    mesh.userData.physicsBodies.push(this.physics.createBox(this, x2, y2, btl, ttr, {isStatic: true, friction: 0.9, restitution: 0.2, angle: utils.adjustRotationForPhysics(this.rotation)}));

  }

  createBack(uisInfo) {

    const tr = this.app.scale(torusRadius)
    const size = this.app.scale(torusRadius*2+0.2)
    const btl = this.app.scale(backTubeLength)

    //const geometry = new THREE.BoxGeometry(size/6, size, size);
    const geometry = utils.createRoundedBoxGeometry(size/6, size, size, 3, 8);


    const material = new THREE.MeshStandardMaterial( { 
      color:        this.mode == "void" ? 0x555555 : 0xffffff,
      map:          Assets.textures.woodTexture.albedo,
      normalMap:    Assets.textures.woodTexture.normal,
      roughnessMap: Assets.textures.woodTexture.rough,
      roughness: 0.5,
      metalness: 0,
      //side: THREE.DoubleSide 
    });

    if (this.selected) {
      material.emissive = new THREE.Color(0x333308);
    }

    const mesh = new THREE.Mesh( geometry, material );

    mesh.position.set(-btl-0.25, 0, tr);
    mesh.castShadow    = this.useShadows;
    mesh.receiveShadow = this.useShadows;

    this.group.add( mesh ); 

    // Get coords for the phys bodies that are rotations around this.x, -this.y
    const [x1, y1] = utils.rotatePoint(this.x, -this.y, this.x-btl-0.25, -this.y, utils.adjustRotationForPhysics(this.rotation));

    // Add the physics body
    mesh.userData.physicsBodies = [];
    mesh.userData.physicsBodies.push(this.physics.createBox(this, x1, y1, size/8, size, {isStatic: true, friction: 0.9, restitution: 0.2, angle: utils.adjustRotationForPhysics(this.rotation)}));

    // Add the body inside the tube that will be the one that objects collide with
    const [x2, y2] = utils.rotatePoint(this.x, -this.y, this.x-btl+10, -this.y, utils.adjustRotationForPhysics(this.rotation));
    this.collisionBody = this.physics.createBox(this, x2, y2, size/8, size*0.95, {onCollision: (body, obj) => this.onCollision(body, obj), isStatic: true, friction: 0.9, restitution: 0.2, angle: utils.adjustRotationForPhysics(this.rotation)});
    mesh.userData.physicsBodies.push(this.collisionBody);

  }

  createScrewHeads() {

    // Some dimensions that we need to place the screw heads
    const tr = this.app.scale(torusRadius)
    const size = this.app.scale(torusRadius*2+0.2)
    const btl = this.app.scale(backTubeLength)

    this.screwHeads = [];

    // Make two screw heads
    [-1, 1].forEach((sign) => {

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
        selectable:        false,
        selectedMaterial:  new THREE.MeshPhongMaterial({color: 0xbbbb55, specular: 0x111111, shininess: 200}),
        onDown:            (obj, pos, info) => this.onDownScrewHead(pivot, pos, info),
        onMove:            (obj, pos, info) => this.onMoveScrewHead(pivot, pos, info),
        onUp:              (obj, pos, info) => this.onUpScrewHead(pivot, pos, info),
      };

      // Register the object with the UI Selection Manager
      this.uis.registerMesh(screwHead, uisInfo, btl, size, tr);

      pivot.position.set(-btl-0.25, sign*tr - sign*tr/8, size - size/25)

      this.group.add(pivot)

      this.screwHeads.push(pivot)
    })


  }

  onDownScrewHead(screwHead, pos, info) {

    console.log("onDownScrewHead", screwHead, pos, info)

    // First, figure out which screw head is the other one
    const otherScrewHead = this.screwHeads.find((sh) => sh !== screwHead)
    const oshPos = otherScrewHead.getWorldPosition(new THREE.Vector3());
    
    // Remember the pivot point for rotation 
    this.rotationPoint = oshPos;

    // Figure out the angle between the position of the mouse and the center of the other screw head
    const angle = Math.atan2(this.rotationPoint.y - pos.y, this.rotationPoint.x - pos.x) + Math.PI/2;

    // If the angle is more than 90 degrees, then we need to flip the angle
    this.rotationAdjustment = Math.abs((this.rotation-angle) % (Math.PI*2)) > Math.PI/2 ? Math.PI : 0;

  }

  onMoveScrewHead(screwHead, pos, info) {

    this.didRotate = true;

    // Figure out the angle between the position of the mouse and the center of the other screw head
    const angle = Math.atan2(this.rotationPoint.y - pos.y, this.rotationPoint.x - pos.x) + Math.PI/2 + this.rotationAdjustment

    // Adjust the group position to account for rotation around the other screw head
    let [x, y] = utils.rotatePoint(this.rotationPoint.x, this.rotationPoint.y, this.group.position.x, this.group.position.y, angle - this.rotation);

    // Set the position of the group
    this.x = x
    this.y = y

    // Set the rotation of the portal to the angle mod 2PI
    this.rotation = angle % (Math.PI*2)

    // redraw the portal
    this.redraw()

    //console.log("onMoveScrewHead", screwHead, pos, info)
  }

  onUpScrewHead(screwHead, pos, info) {
    if (this.didRotate) {
      this.didRotate = false;
      this.saveableConfigChanged();
    }
  }

 
}