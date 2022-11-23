// messaging.js

var mqtt = require('mqtt/dist/mqtt')


export class Messaging {
  constructor(opts) {
    this.url      = opts.url;
    this.vpnName  = opts.vpnName || "default";
    this.username = opts.username;
    this.password = opts.password;
    this.clientId = opts.clientId;

    this.onConnect    = opts.onConnect;
    this.onDisconnect = opts.onDisconnect;
    this.onMessage    = opts.onMessage;

    this.subscriptions   = [];

  }

  connect() {
    // all handled in the sub-class
  }

  disconnect() {
    console.log("Disconnect")
  }

  dispose() {
    console.log("Dispose")
    this.disconnect();
  }

  subscribe(qos, subscription, callback) {
    console.log("added sub", subscription)
  }

  getSubscription(subId) {
    return this.subIdToSubscription[subId];
  }

  unsubscribe(subId) {
    console.log("removed sub", subscription)
    this._unsubscribe(this.subIdToSubscription[subId][1]);
  }

  publish(topic, msg, opts) {
  }

  rxMessage(topic, msg) {
    console.log("rxMessage", topic, msg)
    let data;
    try {
      data = JSON.parse(msg.toString());
    }
    catch(e) {
      console.log("Failed to get JSON payload of message:", topic, msg.toString());
      data = null;
    }

    if (this.onMessage) {
      this.onMessage(topic, msg, data);
    }

  }

  getUserProperties(msg) {
  }

}

