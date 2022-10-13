// messaging.js

import {Messaging} from './messaging';

var mqtt = require('mqtt')

export class MqttMessaging extends Messaging {
  constructor(opts) {
    super(opts);
    this.protocol               = "mqtt";
    this.topicSeparator         = "/";
    this.topicLevelWildcard     = "+";
    this.topicAllLevelsWildcard = "#";
  }

  connect() {
    let opts = {
      username: this.username,
      password: this.password,
      clientId: this.clientId,
      clean:    false
    }

    console.log("Connecting to:", this.host, opts)
    this.client  = mqtt.connect(this.host, opts)
 
    this.client.on('connect', () => {
      console.log("Connected!!", this.subscriptions)
      if (this.subscriptions.length) {
        this.subscriptions.forEach(sub => {
          console.log("subscribing:", sub)
          this.client.subscribe(sub.sub, {qos: sub.qos});
        });
      }
    })
     
    this.client.on('message', (topic, msg) => this.rxMessage(topic, msg));
  }

  disconnect() {
    super.disconnect();
    this.client.end();
  }

  subscribe(qos, subscription, callback) {
    subscription = this.adjustSubscription(subscription);
    
    const subId = super.subscribe(qos, subscription, callback);

    if (this.client) {      
      this.client.subscribe(subscription, {qos: qos});
    }

    console.log("added sub", subscription)

    return subId;
  }

  unsubscribe(subId) {
    super.unsubscribe(subId);
  }

  _unsubscribe(subscription) {
    if (this.client) {
      this.client.unsubscribe(subscription);
    }
  }

  publish(topic, msg, opts) {
    this.client.publish(topic, JSON.stringify(msg), opts);
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

    let cbs = this.getMessageCallbacks(topic);

    cbs.forEach(cb => cb(topic, msg, data));

  }

  adjustSubscription(subscription) {
    // Convert * to + and > to #    
    return subscription.replace(/\*/g, this.topicLevelWildcard).replace(/>/g, this.topicAllLevelsWildcard);
  }


}

