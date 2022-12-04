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

  subscribe(qos, subscription) {
    console.log("added sub", subscription)
  }

  // Declare the set of subscriptions
  // This function will determine the changes and subscribe/unsubscribe as needed
  // Each entry in the array is an object with the following properties:
  //   subscription: the subscription string
  //   qos: the QoS level
  setSubscriptions(subscriptions) {

    // First, unsubscribe from any subscriptions that are no longer needed
    this.subscriptions.forEach(sub => {
      if (!subscriptions.find(s => s.subscription === sub.subscription && s.qos === sub.qos)) {
        this.unsubscribe(sub.id); 
      }
    });

    // Now, subscribe to any new subscriptions
    subscriptions.forEach(sub => {
      if (!this.subscriptions.find(s => s.subscription === sub.subscription && s.qos === sub.qos)) {
        this.subscribe(sub.qos, sub.subscription);
      }
    });

    console.log("setSubscriptions", subscriptions)
    this.subscriptions = subscriptions;

  }

  getSubscription(subscription) {
    return this.subscriptions.find(s => s.subscription === subscription);
  }

  unsubscribe(subscription) {
    console.log("removed sub", subscription)
    this._unsubscribe(subscription);
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

