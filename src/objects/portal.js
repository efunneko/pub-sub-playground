// portal.js - Object definition for a portal

import * as THREE             from 'three' 
import {StaticObject}         from './static-object.js'
import {Assets}               from '../assets.js'
import {UIInputTypes}         from '../ui-input-types.js'
import {utils}                from '../utils.js'


const backgroundTextureUrl     = "images/textures/..."
const torusRadius              = 1
const torusTubeRadius          = 0.15
const backTubeLength           = 1
const defaultColor             = 'blue'
const defaultRotation          = 0
const defaultRadius            = 0.5
    
const openColor                = 0x000000
const closedColor              = 0xffffff
    
const onOffButtonOnColor       = 0x60a060
const onOffButtonOffColor      = 0xa06060
const onOffButtonDisabledColor = 0xcccccc

function isBrokerMode(obj, inputs) {
  return inputs.mode.getValue() == "broker";
}

export class Portal extends StaticObject {
  constructor(app, opts) {
    super(app, opts, [
      {name: "name", type: "text", label: "Name", default: "Unnamed Portal"},
      {name: "portalId", type: "text", label: "Portal ID", default: "1"},
      {name: "enabled", type: "boolean", label: "Enabled", default: true},
      {name: "mode", type: "select", label: "Portal Mode", default: "broker", options: [{value: "broker", label: "Connect to Broker"}, {value: "void", label: "Send to Void"}]},
      {name: "broker", type: "hidden"},
      {name: "brokerId", type: "select", label: "Broker", dependsOn: ["mode"], showIf: isBrokerMode, options: () => this.app.getBrokers().map(b => { return {value: b.getId(), label: b.getName()}})},
      {name: "color", type: "color", label: "Color", dependsOn: ["mode"], showIf: isBrokerMode, default: defaultColor},
      {name: "bindToQueue", type: "boolean", label: "Bind to Queue", dependsOn: ["mode"], showIf: isBrokerMode, title: "If enabled, the portal will bind to a queue on the broker.", eventLabels: ["queueConfig"], default: false},
      {name: "queueName", type: "text", dependsOn: ["bindToQueue", "mode"], showIf: (obj, inputs) => inputs.bindToQueue.getValue() && isBrokerMode(obj, inputs), label: "Queue Name", eventLabels: ["queueConfig"], title: "If 'Bind to Queue' is true, this is the name of the queue to bind to. NOTE that binding to a named queue is only supported by Solace brokers.", default: ""},
      {name: "useSubscriptionList", type: "boolean", label: "Use Subscription List", dependsOn: ["mode"], showIf: isBrokerMode, title: "If enabled, the subscriptions below will be added in addition to the normal portal subscriptions", default: false},
      {name: "subscriptionList", type: "list", entryName: "Subscription", dependsOn: ["useSubscriptionList", "mode"], showIf: (obj, inputs) => inputs.useSubscriptionList.getValue() && isBrokerMode(obj, inputs), label: "Subscription List", title: "If 'Use SubScription List' is true, each subscription in this list will be subscribed to on the broker.", default: []},
      {name: "lastConnectError", type: "textarea", width: 40, label: "Last Connect Error", dependsOn: ["mode"], showIf: isBrokerMode, readonly: true, default: ""},
      {name: "x", type: "hidden"},
      {name: "y", type: "hidden"},
      {name: "rotation", type: "hidden", default: defaultRotation},
    ])

    this.type                = "portal"

    this.redrawOnMove        = true;

    this.radius              = opts.radius   || defaultRadius

    // Get the UI Selection Manager
    this.uis = this.app.ui.getUiSelection();

    this.create()

    // Connect to the broker after all of the objects have been created
    setTimeout(() => this.manageConnection(), 1000);

  }

  create() {
    super.create()
    this.createPortal()
  }

  createPortal() {
    const uisInfo = {
      moveable: true,
      selectable: true,
      //selectedMaterial: new THREE.MeshStandardMaterial({color: 0x00ff00}),
      onMove: (obj, pos, info) => this.onMove(obj, pos, info),
      onDown: (obj, pos, info) => this.onDown(obj, pos, info),
      onUp:   (obj, pos, info) => this.onUp(obj, pos, info),
      onSelected: (obj)   => {this.selected = true; this.redraw();},
      onUnselected: (obj) => {this.selected = false; this.redraw()},
      onDelete: (obj) => this.removeFromWorld(),
      object: this,
    }

    this.createTorus(uisInfo);
    this.createMist(uisInfo);
    this.createTube(uisInfo);
    this.createBack(uisInfo);
    this.createScrewHeads();
    this.createOnOffButton();

    if (this.app.quality === "high") {
      this.createPointLight();
    }

    this.setConnectEffects();
    
    this.group.position.set(this.x, this.y, 0);
    this.group.rotation.z = this.rotation;

  }

  destroy() {
    this.destroyed = true;
    this.disconnect();
    this.destroyPortal();
    super.destroy();
  }

  destroyPortal() {
    // Loop through the meshes and remove the physics bodies and the meshes from the group
    const children = [].concat(this.group.children);
    children.forEach(mesh => {
      if (mesh.userData.physicsBodies) {
        mesh.userData.physicsBodies.forEach(body => this.physics.removeBody(body));
        mesh.userData.physicsBodies = [];
      }
      if (mesh.type !== "PointLight") {
        this.group.remove(mesh);
      }
    });
    
  }

  redraw() {
    this.destroyPortal();
    this.createPortal();
  }

  saveConfigForm(form) {
    super.saveConfigForm(form);
    this.manageConnection();
  }

  manageConnection() {
    this.setConnectEffects();
    if (this.mode == "broker" && this.enabled && !this.brokerConnection) {
      console.log("Connecting to broker");
      this.connect();
    }
    else if ((this.mode != "broker" || !this.enabled) && this.brokerConnection) {
      this.disconnect();
    }
    this.setOnOffButtonMaterial();
  }

  // Connect to the configured Broker
  connect() {
    if (this.brokerConnection || (!this.broker && !this.brokerId)) {
      return;
    }

    let broker;
    if (!this.brokerId) {
      broker = this.app.getBrokerByName(this.broker);
    }
    else {
      broker = this.app.getBrokerById(this.brokerId);
    }
    if (!broker) {
      return;
    }

    this.brokerConnection = broker.createConnection({
      onConnect: connection => this.onConnect(connection),
      onConnectError: (connection, error) => this.onConnectError(connection, error),
      onDisconnect: connection => this.onDisconnect(connection),
      onMessage: (topic, message, payload) => this.onMessage(topic, message, payload)
    });

    if (this.bindToQueue && this.queueName) {
      this.brokerConnection.bindToQueue(
        this.queueName,
        {
          onUp: () => this.onQueueBindUp(),
          onDown: () => this.onQueueBindDown(),
          onError: (error) => this.onQueueBindError(error),
        } 
      );
    }
  }

  // Disconnect from the configured Broker
  disconnect() {
    if (!this.brokerConnection) {
      return;
    }

    this.brokerConnection.dispose();
    this.brokerConnection = null;
    this.connected        = false;
    this.setConnectEffects();
  }

  // Dispose of the broker connection
  disposeConnection() {
    if (this.brokerConnection) {
      this.disconnect();
      this.brokerConnection.dispose();
      this.brokerConnection = null;
    }
  }

  // Called when the connection to the broker is established
  onConnect(connection) {
    this.connected        = true;
    this.lastConnectError = "";

    this.setConnectEffects();

    // Subscribe to the portal topics
    this.subscribeToPortalTopics();

    // At this point we want to also check to see if there are any current contacts with the portal
    // since we won't get a collision event for those
    this.checkForCurrentContacts();

  }

  onConnectError(connection, error) {
    this.lastConnectError = error;
    this.brokerConnection = null;

    // Schedule a retry in 1 second
    if (!this.destroyed) {
      setTimeout(() => this.manageConnection(), 1000);
    }
  }

  // Called when the connection to the broker is lost
  onDisconnect(connection) {
    this.connected = false;
    this.setConnectEffects();
  }

  // Called when the queue binding is up
  onQueueBindUp() {
    this.queueBound = true;
    this.setConnectEffects();
  }

  // Called when the queue binding is down
  onQueueBindDown() {
    this.queueBound = false;
    this.disconnect();
    this.setConnectEffects();

    if (!this.destroyed) {
      // Set a timer to try to bind again in 1 second
      setTimeout(() => this.manageConnection(), 1000);
    }
  }

  // Called when there is an error binding to the queue
  onQueueBindError(error) {
    console.log("Error binding to queue: " + error);
    this.lastConnectError = error.toString();
    this.queueBound       = false;
    this.disconnect();
    this.setConnectEffects();

    // Set a timer to try to bind again in 1 second
    if (!this.destroyed) {
      setTimeout(() => this.manageConnection(), 1000);
    }
  }

  // Called when a message is received from the broker
  onMessage(topic, message, payload) {

    if (!this.connected) {
//      return;
    }

    let newObj = payload;

    // Set the position of the new object to be just in front of the portal
    newObj.x = this.x + (Math.cos(this.rotation) * 10);
    newObj.y = this.y + (Math.sin(this.rotation) * 10);

    // Adjust the rotation of the new object to be the same as the portal
    newObj.rotation = newObj.rotation + this.rotation;

    // Rotate the new object's velocity to match the portal's rotation
    const velocity = utils.rotatePoint(0, 0, newObj.velocity.x, newObj.velocity.y, this.rotation + Math.PI);
    newObj.velocity.x = velocity[0];
    newObj.velocity.y = velocity[1];
    
    // Need to create the object that is coming into the world
    let addedObj = this.app.world.addObjectFromMessage(payload, topic);
    if (addedObj) {
      // Remember that this object came from the portal
      addedObj.setFromPortal(this);
    }

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

  onQueueConfigChange() {
    this.disconnect();
    this.connect();
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


  onBrokerConnectionChanged() {
    this.disconnect();
    this.manageConnection();
  }

  // Send an object to the broker
  sendObjectToBroker(body, obj) {

    // First get the full config of the object
    const config = obj.getConfig();

    // Get the objects velocity and angular velocity
    const velocity         = body.getLinearVelocity();
    const angularVelocity  = body.getAngularVelocity();

    // Get the object's rotation in the portal's frame of reference
    const objRotation      = obj.group.rotation.z - this.group.rotation.z;

    // Rotate the velocity into the portal's frame of reference
    const normalizedV      = utils.rotatePoint(0, 0, velocity.x, velocity.y, -this.group.rotation.z);
          
    // Augment the config with its normalized velocity, rotation and angular velocity
    config.velocity        = {x: normalizedV[0], y: normalizedV[1]};
    config.rotation        = objRotation;
    config.angularVelocity = angularVelocity;
    config.guid            = obj.guid;
    //config.type            = obj.constructor.name.toLowerCase();

    // Create the topic
    // If the object has a configured topic, use that, otherwise use the portal's topic
    let topic;
    let opts = {};
    if (obj.forceTopic && obj.topic) {
      topic = utils.resolveExpression(obj.topic, obj);
    }
    else {
      const objType  = obj.type;
      const objColor = obj.color;
      topic = `portal/${this.name}/${this.portalId}/${objType}/${objColor}`;
    }

    // Handle the Partition Key
    if (obj.partitionKey) {
      config.partitionKey = utils.resolveExpression(obj.partitionKey, obj);
      opts.partitionKey   = config.partitionKey;
    }

    // Send the message to the broker
    this.brokerConnection.publish(topic, config, opts);

  }

  // Subscribe to the portal topics
  subscribeToPortalTopics() {
    if (!this.brokerConnection) {
      return;
    }

    // Subscribe to the portal topics
    if (this.useSubscriptionList) {
      const subs = this.subscriptionList.map(sub => {return {subscription: sub, qos: 0}});
      this.brokerConnection.setSubscriptions(subs);
    }
    else {
      const subs = [{subscription: `portal/*/${this.portalId}/#`, qos: 0}];
      this.brokerConnection.setSubscriptions(subs);
    }
  }

  // Pointer events
  /*
  onDown(obj, pos, info) {
  }
  onUp(obj, pos, info) {
  }
  onMove(obj, pos, info) {
    super.onMove(obj, pos, info);
  }
  */

  setConnectEffects() {
    if (this.mode === "void") {
      return;
    }
    this.setOnOffButtonMaterial();
    if (this.brokerConnection && this.connected && (!this.bindToQueue || this.queueBound)) {
      this.mist.material.color.setHex(openColor);
      this.torus.material = this.openMaterial;
      if (this.pointLight) {
        this.pointLight.intensity = 3.3;
      }
    }
    else {
      this.mist.material.color.setHex(closedColor);
      this.torus.material = this.closedMaterial;
      if (this.pointLight) {
        this.pointLight.intensity = 0.1;
      }
    }
  }

  setOnOffButtonMaterial() {
    if (this.mode === "void") {
      return;
    }
    if (this.enabled) {
      if (this.brokerConnection && this.connected) {
        this.onOffButton.material.color.setHex(onOffButtonOnColor);
      }
      else {
        this.onOffButton.material.color.setHex(onOffButtonOffColor);
      }
    }
    else {
      this.onOffButton.material.color.setHex(onOffButtonDisabledColor);
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
    
    // Register with the selection manager
    this.uis.registerMesh(mesh, uisInfo);

    this.torus = mesh;

  }

  createPointLight() {
    if (this.pointLight) {
      return;
    }
    this.pointLight = new THREE.PointLight(this.color, 0.1, this.app.scale(4));
    this.pointLight.position.set(this.app.scale(0.5), 0, this.app.scale(torusRadius/2));
    this.pointLight.decay = 2
    this.group.add(this.pointLight);
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

    // Register with the selection manager
    this.uis.registerMesh(mesh, uisInfo);

  }

  createOnOffButton() {

    if (this.mode == "void") {
      return;
    }

    const tr     = this.app.scale(torusRadius)
    const radius = tr*0.16;
    const height = tr*0.05;
    const x      = -tr;
    const y      = tr/2;
    const z      = tr*2.1;

    // Make a cynlinder for the button that points away from the user
    const geometry = new THREE.CylinderGeometry(radius, radius, height, 32, 1, false);
    const material = new THREE.MeshPhysicalMaterial( {
      color: 0x888888,
    });
    const topMaterial = new THREE.MeshStandardMaterial( {
      map:          Assets.textures.icons.powerButton,
      transparent:  true,
    });
    const mesh = new THREE.Mesh( geometry, [material, topMaterial, topMaterial] );

    mesh.position.set(x, y, z);
    mesh.rotation.x = Math.PI/2;
    mesh.rotation.y = Math.PI/2;
    mesh.castShadow    = this.useShadows;

    // Add another cylinder inside the last so that the color can be changed
    const innerGeo = new THREE.CylinderGeometry(radius, radius, height, 32, 1, false);
    const innerMaterial = new THREE.MeshPhysicalMaterial( {
      color: onOffButtonDisabledColor,
    });
    this.onOffButton = new THREE.Mesh(geometry, innerMaterial);

    this.onOffButton.position.set(x, y, z);
    this.onOffButton.rotation.x = Math.PI/2;
    this.onOffButton.rotation.y = Math.PI/2;
    this.onOffButton.scale.set(0.9, 0.9, 0.9);

    this.group.add( mesh );
    this.group.add( this.onOffButton );

    // Selection properties for a screw head
    const uisInfo = {
      moveable:          false,
      rotatable:         false,
      selectable:        false,
      onDown:            (obj, pos, info) => this.onDownOnOffButton(obj, pos, info),
    };

    this.setOnOffButtonMaterial();

    // Register the object with the UI Selection Manager
    this.uis.registerMesh(mesh, uisInfo);

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

    // Register with the selection manager
    this.uis.registerMesh(mesh, uisInfo);

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

    // Register with the selection manager
    this.uis.registerMesh(mesh, uisInfo);

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

  onDownOnOffButton(mesh, pos, info) {
    // Toggle the enabled state
    this.enabled = !this.enabled;
    this.manageConnection();
  }

}