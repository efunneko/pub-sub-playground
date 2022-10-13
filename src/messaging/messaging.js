// messaging.js

var mqtt = require('mqtt/dist/mqtt')

export class Messaging {
  constructor(opts) {
    this.host     = opts.host;
    this.vpn      = opts.vpn || "default";
    this.username = opts.username;
    this.password = opts.password;
    this.clientId = opts.clientId;

    this.subscriptions   = [];
    this.subPrefixes     = [];
    this.subExactMatches = [];
    this.subWildcards    = [];

    this.subRefCounts        = {};
    this.subIdToSubscription = {};
    this.subSeq              = 1;
    console.log("Messaging", opts)
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
    let subId = this.subSeq++;
    this.subscriptions.push({sub: subscription, qos: qos, callback: callback, id: subId})
    if (callback) {
      this.learnSubscription(subscription, callback, subId);
    }

    this.subRefCounts[subId]        = this.subRefCounts[subId] ? this.subRefCounts[subId]++ : 1;
    this.subIdToSubscription[subId] = [qos, subscription];

    console.log("added sub", subscription)

    return subId;
  }

  getSubscription(subId) {
    return this.subIdToSubscription[subId];
  }

  unsubscribe(subId) {
    this.unlearnSubScription(subId);
    this.subRefCounts[subId]--;
    if (!this.subRefCounts[subId]) {
      delete(this.subRefCounts[subId]);
      if (this.subIdToSubscription[subId]) {
        this._unsubscribe(this.subIdToSubscription[subId][1]);
        delete(this.subIdToSubscription[subId]);
      }
      else {
        console.log("Tried to unsubscribe from subId:", subId)
      }
    }
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

    let cbs = this.getMessageCallbacks(topic);

    cbs.forEach(cb => cb(topic, msg, data));

  }

  getUserProperties(msg) {
  }

  getMessageCallbacks(topic) {
    let cbs = [];
    this.subPrefixes.forEach(item => {
      if (topic.startsWith(item.prefix)) {
        cbs.push(item.callback);
      }
    })
    this.subExactMatches.forEach(item => {
      if (topic == item.sub) {
        cbs.push(item.callback);
      }
    })
    if (this.subWildcards.length) {
      let topicParts = topic.split(this.topicSeparator);
      this.subWildcards.forEach(item => {
        let subParts = item.subParts;
        let match = true;
        for (let i = 0; i < subParts.length; i++) {
          if (subParts[i] === this.topicAllLevelsWildcard) {
            break;
          }
          if (topicParts[i] !== subParts[i]) {
            if (subParts[i] !== this.topicLevelWildcard) {
              // if subParts[i] ends with a wildcard, then find if all the characters before the wildcard match
              // if not, then we don't match
              if (subParts[i].endsWith(this.topicLevelWildcard)) {
                let subPart = subParts[i].substring(0, subParts[i].length - 1);
                if (topicParts[i].startsWith(subPart)) {
                  continue;
                }
              }
              match = false;
              break;
            }
          }
        }
        if (match) {
          cbs.push(item.callback);
        }
      })
    }
    return cbs;
  }

  learnSubscription(subscription, callback, subId) {
    console.log("check", this.topicAllLevelsWildcard, this.topicLevelWildcard, this.topicSeparator);
    //if (subscription.match(/\+/)) {
    if (subscription.match(new RegExp("\\" + this.topicLevelWildcard))) {
      this.subWildcards.push({
        //subParts: subscription.split("/"),
        subParts: subscription.split(this.topicSeparator),
        callback: callback,
        id: subId
      })
    }
    //else if (subscription.endsWith("/#")) {
    else if (subscription.endsWith("/" + this.topicAllLevelsWildcard)) {
      this.subPrefixes.push({
        //prefix: subscription.replace(/\/#$/, ""),
        prefix: subscription.replace(new RegExp("/" + this.topicAllLevelsWildcard + "$"), ""),
        callback: callback,
        id: subId
      })
    }
    else {
      this.subExactMatches.push({
        sub: subscription,
        callback: callback,
        id: subId
      })
    }
  }

  unlearnSubScription(subId) {
    this.subWildcards     = this.subWildcards.filter(s => s.id != subId);
    this.subPrefixes      = this.subPrefixes.filter(s => s.id != subId);
    this.subExactMatches  = this.subPrefixes.filter(s => s.id != subId);
  }

}

