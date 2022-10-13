// portal.js - Object definition for a portal

import * as THREE             from 'three' 
import {StaticObject}         from './static-object.js'
import {Assets}               from '../assets.js'
import {UIInputTypes}         from '../ui-input-types.js'


const backgroundTextureUrl = "images/textures/..."
const torusRadius          = 1
const torusTubeRadius      = 0.15
const backTubeLength       = 1
const defaultColor         = 0x0000ff
const defaultRotation      = 0


export class Portal extends StaticObject {
  constructor(app, opts) {
    super(app, opts)

    this.radius   = opts.radius   || defaultRadius
    this.color    = opts.color    || defaultColor
    this.rotation = opts.rotation || defaultRotation

    // Get the UI Selection Manager
    this.uis = this.app.ui.getUiSelection();

    this.create()

  }

  create() {

    const uisInfo = {
      moveable: true,
      selectable: true,
      //selectedMaterial: new THREE.MeshStandardMaterial({color: 0x00ff00}),
      onMove: (obj, pos, info) => this.onMove(obj, pos, info),
      onDown: (obj, pos, info) => this.onDown(obj, pos, info),
      onUp:   (obj, pos, info) => this.onUp(obj, pos, info),
      onSelected: (obj)   => {this.selected = true; this.destroy(); this.create();},
      onUnselected: (obj) => {this.selected = false; this.destroy(); this.create();},
      onDelete: (obj) => this.destroy(),
      configForm: {
        save: (form) => this.saveConfigForm(form),
        fields: [
          {name: "name", type: "text", label: "Name", value: this.name},
          {name: "portalId", type: "text", label: "Portal ID", value: this.portalId},
        ]
      }

    }


    this.createTorus(uisInfo);
    this.createPointLight();
    this.createMist(uisInfo);
    this.createTube(uisInfo);
    this.createBack(uisInfo);
    this.createScrewHeads();
    
    this.group.position.set(this.x, this.y, 0);
    this.group.rotation.z = this.rotation;

  }

  destroy() {
    // Loop through the meshes and remove the physics bodies and the meshes from the group
    const children = [].concat(this.group.children);
    children.forEach(mesh => {
      if (mesh.userData.physicsBodies) {
        mesh.userData.physicsBodies.forEach(body => this.app.getPhysicsEngine().removeBody(body));
        mesh.userData.physicsBodies = [];
      }
      if (mesh.type !== "PointLight") {
        this.group.remove(mesh);
      }
    });
    
  }

  onDown(obj, pos, info) {
  }

  onUp(obj, pos, info) {

  }

  onMove(obj, pos, info) {
    this.x += info.deltaPos.x;
    this.y += info.deltaPos.y;

    //this.group.position.set(pos.x, pos.y, 0);
    this.destroy();
    this.create();
  }

  createTorus(uisInfo) {

    const tr = this.app.scale(torusRadius)
    const ttr = this.app.scale(torusTubeRadius)

    // Create the geometry
    const geometry = new THREE.TorusGeometry(this.app.scale(torusRadius), this.app.scale(torusTubeRadius), 8, 32);

    // Create the material
    const material = new THREE.MeshPhysicalMaterial({
      clearcoat: 1,
      clearcoatRoughness: 0,
      metalness: 0.5,
      roughness: 0.5,
      emissive: this.color,
      emissiveIntensity: 1.5,
      reflectivity: 0.5,
      transmission: 0.5,
      transparent: true,
      opacity: 0.8,
      attenuationColor: 0xffffff,
      attenuationDistance: 0.5,

    });

    // Create the mesh
    const mesh = new THREE.Mesh(geometry, material);

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
    const [x1, y1] = this.app.rotatePoint(this.x, -this.y, this.x, tr-this.y, this.adjustRotationForPhysics(this.rotation));
    const [x2, y2] = this.app.rotatePoint(this.x, -this.y, this.x, -tr-this.y, this.adjustRotationForPhysics(this.rotation));

    // Add the physics bodies
    mesh.userData.physicsBodies = [];
    mesh.userData.physicsBodies.push(this.app.getPhysicsEngine().createCircle(this, x1, y1, ttr, {isStatic: true, friction: 0.9, restitution: 0.2, angle: this.adjustRotationForPhysics(this.rotation)}));
    mesh.userData.physicsBodies.push(this.app.getPhysicsEngine().createCircle(this, x2, y2, ttr, {isStatic: true, friction: 0.9, restitution: 0.2, angle: this.adjustRotationForPhysics(this.rotation)}));
    
    // Register with the selection manager
    this.uis.registerObject(mesh, uisInfo);

  }

  createPointLight() {
    if (this.pointLight) {
      return;
    }
    this.pointLight = new THREE.PointLight(this.color, 3.3, this.app.scale(4));
    this.pointLight.position.set(this.app.scale(0.5), 0, this.app.scale(torusRadius/2));
    this.pointLight.decay = 2
    this.group.add(this.pointLight);
  }

  createMist(uisInfo) {

    const tr = this.app.scale(torusRadius)
    const geometry = new THREE.CylinderGeometry(tr, tr, tr, 8, 1, false);
    const material = new THREE.MeshPhysicalMaterial( { 
      color: 0x000000, 
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

    // Register with the selection manager
    this.uis.registerObject(mesh, uisInfo);

  }

  createTube(uisInfo) {

    const tr = this.app.scale(torusRadius)
    const btl = this.app.scale(backTubeLength)
    const ttr = this.app.scale(torusTubeRadius)

    // Create a path for the tube
    const path = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(btl, 0, 0),
    ]);

    const geometry = new THREE.TubeGeometry(path, 3, tr+this.app.scale(0.1), 32, false);

    const material = new THREE.MeshStandardMaterial( { 
      map:          Assets.textures.woodTexture.albedo,
      normalMap:    Assets.textures.woodTexture.normal,
      roughnessMap: Assets.textures.woodTexture.rough,
      roughness:    0.5,
      metalness:    0,
      //side: THREE.DoubleSide 
    });

    if (this.selected) {
      material.emissive = new THREE.Color(0x333308);
    }

    const mesh = new THREE.Mesh( geometry, material );

    mesh.position.set(-btl, 0, tr);
    mesh.castShadow    = this.useShadows;
    mesh.receiveShadow = this.useShadows;

    this.group.add( mesh ); 

    // Get coords for the phys bodies that are rotations around this.x, -this.y
    const [x1, y1] = this.app.rotatePoint(this.x, -this.y, this.x-btl/2, tr-this.y, this.adjustRotationForPhysics(this.rotation));
    const [x2, y2] = this.app.rotatePoint(this.x, -this.y, this.x-btl/2, -tr-this.y, this.adjustRotationForPhysics(this.rotation));
    
    // Add the physics body
    mesh.userData.physicsBodies = [];
    mesh.userData.physicsBodies.push(this.app.getPhysicsEngine().createBox(this, x1, y1, btl, ttr, {isStatic: true, friction: 0.9, restitution: 0.2, angle: this.adjustRotationForPhysics(this.rotation)}));
    mesh.userData.physicsBodies.push(this.app.getPhysicsEngine().createBox(this, x2, y2, btl, ttr, {isStatic: true, friction: 0.9, restitution: 0.2, angle: this.adjustRotationForPhysics(this.rotation)}));

    // Register with the selection manager
    this.uis.registerObject(mesh, uisInfo);

  }

  createBack(uisInfo) {

    const tr = this.app.scale(torusRadius)
    const size = this.app.scale(torusRadius*2+0.2)
    const btl = this.app.scale(backTubeLength)

    const geometry = new THREE.BoxGeometry(size/6, size, size);

    const material = new THREE.MeshStandardMaterial( { 
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
    const [x1, y1] = this.app.rotatePoint(this.x, -this.y, this.x-btl-0.25, -this.y, this.adjustRotationForPhysics(this.rotation));

    // Add the physics body
    mesh.userData.physicsBodies = [];
    mesh.userData.physicsBodies.push(this.app.getPhysicsEngine().createBox(this, x1, y1, size/8, size, {isStatic: true, friction: 0.9, restitution: 0.2, angle: this.adjustRotationForPhysics(this.rotation)}));
    
    // Register with the selection manager
    this.uis.registerObject(mesh, uisInfo);

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
      };

      // Register the object with the UI Selection Manager
      this.uis.registerObject(screwHead, uisInfo, btl, size, tr);

      pivot.position.set(-btl-0.25, sign*tr - sign*tr/8, size - size/25)

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
    let [x, y] = this.app.rotatePoint(this.rotationPoint.x, this.rotationPoint.y, this.group.position.x, this.group.position.y, angle - this.rotation);

    // Set the position of the group
    this.x = x
    this.y = y

    // Set the rotation of the portal to the angle mod 2PI
    this.rotation = angle % (Math.PI*2)

    // Recreate the portal
    this.destroy()
    this.create()

    //console.log("onMoveScrewHead", screwHead, pos, info)
  }

  renderConfigForm() {
    return [
      new UIInputTypes.Text({label: "Name", value: this.name}),
      new UIInputTypes.Text({label: "Portal ID", value: this.portalId}),
    ]
  }

  adjustRotationForPhysics(angle) {
    return -angle
  }


}