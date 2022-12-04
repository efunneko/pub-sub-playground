// emitter.js - An object that will act like a ball gun

import * as THREE     from 'three'
import {StaticObject} from './static-object.js'
import {Assets}       from '../assets.js'
import {utils}        from '../utils.js'
import {Ball}         from './ball.js'
import {Block}        from './block.js'

const tubeLength      = 50;
const tubeRadius      = 35;
const defaultRotation = 0;
const baseXVelocity   = 10;

export class Emitter extends StaticObject {
  constructor(app, opts) {
    super(app, opts);

    this.redrawOnMove = true;
    this.rotation     = opts.rotation || defaultRotation
    this.strength     = opts.strength || 1;
    this.shotType     = opts.shotType || "ball";
    this.rate         = opts.rate || 1;
    this.uis          = app.ui.getUiSelection();

    // Create a Ball and Block to use as the default config for the emitter
    this.ballForConfig  = this.getObjForConfig(Ball);
    this.blockForConfig = this.getObjForConfig(Block);

    this.configParams = this.initConfigParams([
      {name: "x", type: "hidden"},
      {name: "y", type: "hidden"},
      {name: "rotation", type: "hidden"},
      {name: "rate", type: "numberRange", min: 0.2, max: 8, step: 0.2, label: "Firing Rate (shots/sec)"},
      {name: "strength", type: "numberRange", min: 1, max: 5, step: 1, label: "Shot Strength"},
      {name: "shotType", type: "select", label: "Shot Type", options: [{value: "ball", label: "Ball"}, {value: "block", label: "Block"}]},
      {name: "text", type: "text", label: "TEST", dependsOn: ["shotType"], showIf: (obj, inputs) => inputs.shotType.getValue() == "ball"},
      {name: "ballForConfig", type: "subObject", label: "Ball Config", dependsOn: ["shotType"], showIf: (obj, inputs) => inputs.shotType.getValue() == "ball"},
      {name: "blockForConfig", type: "subObject", label: "Block Config", showIf: (obj, inputs) => inputs.shotType.getValue() == "block"},
    ])

    this.create();
  }

  getObjForConfig(objClass) {
    const obj = new objClass(this.app, {scene: this.scene});

    // Just keep the object for config, don't add it to the world
    obj.destroy();

    return obj;
  }

  create() {
    super.create();

    const uisInfo = {
      moveable: true,
      selectable: true,
      onMove: (obj, pos, info) => this.onMove(obj, pos, info),
      onDown: (obj, pos, info) => this.onDown(obj, pos, info),
      onUp:   (obj, pos, info) => this.onUp(obj, pos, info),
      onSelected: (obj)   => {this.selected = true; this.reDraw();},
      onUnselected: (obj) => {this.selected = false; this.reDraw()},
      onDelete: (obj) => this.removeFromWorld(),
      configForm: {
        save: (form) => this.saveConfigForm(form),
        obj: this,
        fields: this.configParams
      }
    }

    this.createFiringTube(uisInfo);
    this.createBack(uisInfo);
    this.createButtons(uisInfo);
    this.createScrewHeads();

    this.group.position.set(this.x, this.y, 50);
    this.group.rotation.z = this.rotation;

  }

  createFiringTube(uisInfo) {

    // Create the geometry for the main tube
    const geometry = new THREE.CylinderGeometry(tubeRadius, tubeRadius, tubeLength, 32, 32);

    // Create the material
    const material = new THREE.MeshPhysicalMaterial({
      //map:               Assets.textures.brass.albedo,
      map:    Assets.textures.woodTexture.albedo,
      //color:             0xaaaaaa,
      metalnessMap:      Assets.textures.greasyMetal.metallic,
      roughnessMap:      Assets.textures.greasyMetal.roughness,
      normalMap:         Assets.textures.greasyMetal.normal,
      normalScale:       new THREE.Vector2(5, 5),
      metalness:         0.4,
      roughness:         0.5,
    });

    // Create the mesh
    const mainTube = new THREE.Mesh(geometry, material);

    mainTube.rotation.z = Math.PI / 2;

    // If useShadows is true, then cast and receive shadows
    mainTube.castShadow    = this.useShadows;
    mainTube.receiveShadow = this.useShadows;
    mainTube.position.x    = tubeLength / 2;

    // Create array to hold the physics bodies
    mainTube.userData.physicsBodies = [];

    // Get coords for the phys bodies that are rotations around this.x, -this.y
    let [x1, y1] = utils.rotatePoint(this.x, -this.y, this.x + tubeLength / 2, -this.y - tubeRadius + tubeRadius/8, utils.adjustRotationForPhysics(this.rotation));
    mainTube.userData.physicsBodies.push(this.physics.createBox(this, x1, y1, tubeLength, tubeRadius/8, {isStatic: true, friction: 0.9, restitution: 0.2, angle: utils.adjustRotationForPhysics(this.rotation)}));
    [x1, y1] = utils.rotatePoint(this.x, -this.y, this.x + tubeLength / 2, -this.y + tubeRadius - tubeRadius/8, utils.adjustRotationForPhysics(this.rotation));
    mainTube.userData.physicsBodies.push(this.physics.createBox(this, x1, y1, tubeLength, tubeRadius/8, {isStatic: true, friction: 0.9, restitution: 0.2, angle: utils.adjustRotationForPhysics(this.rotation)}));


    // The ribs
    const numRibs = 4;
    const ribSpacing = tubeLength / numRibs;
    const ribRadius = 3;

    this.ribs = [];
    for (let i = 1; i <= numRibs; i++) {

      const ribGeometry = new THREE.TorusGeometry(tubeRadius, ribRadius, 32, 32);

      const ribMaterial = new THREE.MeshStandardMaterial( { 
        map:          Assets.textures.woodTexture.albedo,
        emissive:     0x00C895,
        emissiveIntensity: 0,
        //color:        0x00C895,
        //normalMap:    Assets.textures.greasyMetal.normal,
        //roughnessMap: Assets.textures.greasyMetal.rough,
        //displacementMap: Assets.textures.ridges.displacement,
        //roughness:    0.5,
        //metalness:    0,
        //side: THREE.DoubleSide 
      });

      const rib = new THREE.Mesh(ribGeometry, ribMaterial);
      rib.position.x = i * ribSpacing;
      rib.rotation.y = Math.PI / 2;
      rib.castShadow    = this.useShadows;
      rib.receiveShadow = this.useShadows;

      [x1, y1] = utils.rotatePoint(this.x, -this.y, this.x + i * ribSpacing, -this.y + tubeRadius - ribRadius/2, utils.adjustRotationForPhysics(this.rotation));
      mainTube.userData.physicsBodies.push(this.physics.createCircle(this, x1, y1, ribRadius, {isStatic: true, friction: 0.9, restitution: 0.2, angle: utils.adjustRotationForPhysics(this.rotation)}));
      [x1, y1] = utils.rotatePoint(this.x, -this.y, this.x + i * ribSpacing, -this.y - tubeRadius + ribRadius/2, utils.adjustRotationForPhysics(this.rotation));
      mainTube.userData.physicsBodies.push(this.physics.createCircle(this, x1, y1, ribRadius, {isStatic: true, friction: 0.9, restitution: 0.2, angle: utils.adjustRotationForPhysics(this.rotation)}));
  
      this.group.add(rib);
      this.uis.registerObject(rib, uisInfo);
      this.ribs.push(rib);
    }


    this.group.position.z = 50;

    // Add the mesh to the group
    this.group.add(mainTube);
    this.uis.registerObject(mainTube, uisInfo);

  }

  createBack(uisInfo) {

    const backLength = tubeRadius * 2.5;
    const backX      = -tubeLength / 4;

    //const geometry = new THREE.BoxGeometry(size/6, size, size);
    const geometry = utils.createRoundedBoxGeometry(tubeLength/2, backLength, backLength, 3, 8);

    const material = new THREE.MeshStandardMaterial( { 
      map:          Assets.textures.woodTexture.albedo,
      normalMap:    Assets.textures.woodTexture.normal,
      roughnessMap: Assets.textures.woodTexture.rough,
      roughness: 0.5,
      metalness: 0,
      emissive: 0x00C895,
      emissiveIntensity: 0.1,
    });

    if (this.selected) {
      material.emissive = new THREE.Color(0x333308);
    }

    const mesh = new THREE.Mesh( geometry, material );

    mesh.position.set(backX, 0, 0);
    mesh.castShadow    = this.useShadows;
    mesh.receiveShadow = this.useShadows;

    this.group.add( mesh ); 
    this.uis.registerObject(mesh, uisInfo);


    // Get coords for the phys bodies that are rotations around this.x, -this.y
    const [x1, y1] = utils.rotatePoint(this.x, -this.y, this.x + backX, -this.y, utils.adjustRotationForPhysics(this.rotation));
    // Add the physics body
    mesh.userData.physicsBodies = [];
    mesh.userData.physicsBodies.push(this.physics.createBox(this, x1, y1, tubeLength/2, backLength, {isStatic: true, friction: 0.9, restitution: 0.2, angle: utils.adjustRotationForPhysics(this.rotation)}));

  }
    

  createButtons() {

    // We have the following buttons:
    //   * Fire one ball
    //   * Start/Stop continuous firing

    this.createButton({
      x: -tubeLength/4,
      y: -tubeLength/4.2,
      z: 43,
      texture: Assets.textures.icons.step,
      onDown: (obj, pos, info) => this.singleShot(obj, pos, info),
    });

    this.startStopButton = this.createButton({
      x: -tubeLength/4,
      y: tubeLength/4.2,
      z: 43,
      texture: this.shotInterval ? Assets.textures.icons.pause : Assets.textures.icons.play,
      onDown: (obj, pos, info) => this.startStopShot(obj, pos, info),
      //selectedTexture: Assets.getTexture('pause'),
    });

  }

  createButton(opts) {

    // UI selection info
    const uisInfo = {
      selectable:        false,
      onDown:            (obj, pos, info) => opts.onDown(obj, pos, info),
    };

    const buttonSize   = tubeLength/4;
    const buttonHeight = tubeLength/16;
    const buttonOffset = tubeLength/2 + buttonSize/2;

    // Add the icon on top
    const icon = new THREE.Mesh(new THREE.BoxGeometry(buttonSize, buttonSize, buttonHeight), new THREE.MeshStandardMaterial({
      map: opts.texture,
      metalness: 0.1,
      roughness: 1,
    }));
    icon.position.set(opts.x, opts.y, opts.z);
    icon.castShadow    = this.useShadows;
    icon.receiveShadow = this.useShadows;
    this.uis.registerObject(icon, uisInfo);

    // Add the mesh to the group
    this.group.add(icon);

    return icon;

  }


  createScrewHeads() {

    // Some dimensions that we need to place the screw heads
    const backLength = tubeRadius * 2.5;
    const screwOffset = backLength/2 - backLength/8;; 

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
        onDown:            (obj, pos, info) => this.onDownScrewHead(pivot, pos, info),
        onMove:            (obj, pos, info) => this.onMoveScrewHead(pivot, pos, info),
      };

      // Register the object with the UI Selection Manager
      this.uis.registerObject(screwHead, uisInfo);

      pivot.position.set(-tubeLength/4, sign*screwOffset, 45)

      this.group.add(pivot)

      this.screwHeads.push(pivot)
    })


  }

  onDownScrewHead(screwHead, pos, info) {

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

    // Figure out the angle between the position of the mouse and the center of the other screw head
    const angle = Math.atan2(this.rotationPoint.y - pos.y, this.rotationPoint.x - pos.x) + Math.PI/2 + this.rotationAdjustment

    // Adjust the group position to account for rotation around the other screw head
    let [x, y] = utils.rotatePoint(this.rotationPoint.x, this.rotationPoint.y, this.group.position.x, this.group.position.y, angle - this.rotation);

    // Set the position of the group
    this.x = x
    this.y = y

    // Set the rotation of the portal to the angle mod 2PI
    this.rotation = angle % (Math.PI*2)

    // Redraw the portal
    this.reDraw()

    //console.log("onMoveScrewHead", screwHead, pos, info)
  }

  singleShot(obj, pos, info) {
    this.lightNextRib(0);
  }

  startStopShot(obj, pos, info) {
    if (this.shotInterval) {
      clearInterval(this.shotInterval);
      this.shotInterval = null;
      console.log("Stopping shots");
      this.startStopButton.material.map = Assets.textures.icons.play;
    } else {
      this.shotInterval = setInterval(() => this.lightNextRib(0), 1000/this.rate);
      console.log("Starting shots");
      this.startStopButton.material.map = Assets.textures.icons.pause;
    }
    //this.reDraw();
  }

  // Fire a shot from the emitter
  fireShot() {
    // Create a ball
    let [x1, y1] = utils.rotatePoint(this.x, this.y, this.x + tubeLength, this.y, this.rotation);
    let [vx, vy] = utils.rotatePoint(0, 0, baseXVelocity*this.strength, 0, this.rotation);
    new Ball(this.app, {scene: this.scene, x: x1, y: y1, radius: 21, useShadows: this.useShadows, velocity: {x: vx, y: vy}});

  }

  lightNextRib(index) {
    if (index) {
      this.ribs[index-1].material.emissiveIntensity = 0;
    }
    if (index < this.ribs.length) {
      this.ribs[index].material.emissiveIntensity = 0.7;
      setTimeout(() => this.lightNextRib(index+1), 64/this.strength);
    }
    else {
      this.fireShot();
    }
  }
}
