// broker.js - this represents an event broker

import * as THREE        from 'three'
import {StaticObject}    from './static-object.js';
import {Assets}          from '../assets.js';
import {utils}           from '../utils.js';
import {SolaceMessaging} from '../messaging/solace-messaging';
import {MqttMessaging}   from '../messaging/mqtt-messaging';

const brokerHeight       = 0.4

export class Broker extends StaticObject {
  constructor(app, opts) {
    super(app, opts);

    this.uis    = app.ui.getUiSelection();

    this.height = this.app.scale(brokerHeight)
    this.name   = opts.name       || '<unnamed>';
    this.url    = opts.url        || 'ws://<host>:<port>';
    this.protocol = opts.protocol || 'smf';
    this.vpnName  = opts.vpnName  || 'default';
    this.username = opts.username || 'default';
    this.password = opts.password || 'default';

    this.configParams = this.initConfigParams([
      {name: "x", type: "hidden", eventLabels: ["position"]},
      {name: "y", type: "hidden", eventLabels: ["position"]},
      {name: "name",     type: "text",     eventLabels: ["name"], label: "Name"},
      {name: "protocol", type: "select",   eventLabels: ["connConfig"], label: "Protocol", options: [{value: "smf", label: "SMF"}, {value: "mqtt", label: "MQTT"}]},
      {name: "url",      type: "text",     eventLabels: ["connConfig"], label: "Broker URL"},
      {name: "vpnName",  type: "text",     eventLabels: ["connConfig"], label: "Message VPN"},
      {name: "username", type: "text",     eventLabels: ["connConfig"], label: "Username"},
      {name: "password", type: "password", eventLabels: ["connConfig"], label: "Password"},
    ])

    this.create();

  }

  create() {
    super.create();

    const uisInfo = {
      moveable: true,
      selectable: true,
      //selectedMaterial: new THREE.MeshStandardMaterial({color: 0x00ff00}),
      onMove: (obj, pos, info) => this.onMove(obj, pos, info),
      onDown: (obj, pos, info) => this.onDown(obj, pos, info),
      onUp:   (obj, pos, info) => this.onUp(obj, pos, info),
      onSelected: (obj)   => {this.selected = true; this.destroy(); this.create();},
      onUnselected: (obj) => {this.selected = false; this.destroy(); this.create();},
      onDelete: (obj) => this.removeFromWorld(),
      configForm: {
        save: (form) => this.saveConfigForm(form),
        obj: this,
        fields: this.configParams,
      }
    }

    this.createBroker(uisInfo);

    this.z = 110;
    this.group.position.set(this.x, this.y, this.z);

  }

  createBroker(uisInfo) {

    // Name plate
    const {texture, height, width} = utils.textToTexture({
      text: `Broker: ${this.name}`, 
      height: this.height,
      fontSize: 12,
      padding: 3,
      align: 'center',
      color: 'white',
      backgroundColor: 'black',
    });

    const geometry = new THREE.BoxGeometry(width, this.height, 2);
    const material = new THREE.MeshStandardMaterial({map: texture});
    const plate = new THREE.Mesh(geometry, material);
    this.group.add(plate);
    this.uis.registerObject(plate, uisInfo);

    // The base
    const base = new THREE.Mesh(
      utils.createRoundedBoxGeometry(width + 10, this.height + 10, 10, 5, 8),
      new THREE.MeshPhysicalMaterial({
        map:               Assets.textures.brass.albedo,
        roughnessMap:      Assets.textures.brass.rough,
        metalnessMap:      Assets.textures.brass.metallic,      
        normalMap:         Assets.textures.brass.normal,
        envMap:            Assets.textures.envMap,
        clearcoat:         0,
        envMapIntensity:   0.25,
        })
    );
    base.position.set(0, 0, -5);
    base.castShadow    = this.useShadows;
    base.receiveShadow = this.useShadows;
    this.group.add(base);
    this.uis.registerObject(base, uisInfo);

  }

  createConnection(opts) {
    opts.url      = opts.url      || this.url;
    opts.name     = opts.name     || this.name;
    opts.protocol = opts.protocol || this.protocol;
    opts.username = opts.username || this.username;
    opts.password = opts.password || this.password;
    opts.vpnName  = opts.vpnName  || this.vpnName;
    opts.clientId = opts.clientId || this.clientId;
    if (this.protocol == "mqtt") {
      return new MqttMessaging(opts);
    } else if (this.protocol == "smf" || this.protocol == "solace") {
      const conn = new SolaceMessaging(opts);
      conn.connect();
      return conn;
    } else {
      throw new Error("Unknown protocol: " + opts.protocol);
    }
  }

  /*
  saveConfigForm(form) {
    console.log("Saving config form", form);
    Object.keys(form).forEach((key) => {
      this[key] = form[key];
    });
    this.destroy();
    this.create();
    this.app.saveConfig();
  }
  */

  onConnConfigChange(form) {
    // The connection configuration has changed - tell the world so that it
    // can update all portals that use this broker.
    const portals = this.app.getPortalsUsingBroker(this);
    console.log("EDE Broker.onConnConfigChange", this.name, "portals", portals);
    portals.forEach((portal) => {
      portal.onBrokerConnectionChanged(this);
    });
  }

  getName() {
    return this.name;
  }

}
