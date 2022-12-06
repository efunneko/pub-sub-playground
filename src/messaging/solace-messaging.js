// messaging.js

import {Messaging} from './messaging';
//import {solace}    from 'solclientjs/lib-browser/solclient.js';
let solace = require('solclientjs/lib-browser/solclient.js');


export class SolaceMessaging extends Messaging {
  constructor(opts) {
    super(opts);
    this.protocol               = "smf";
    this.topicSeparator         = "/";
    this.topicLevelWildcard     = "*";
    this.topicAllLevelsWildcard = ">";
  }

  connect() {
    let opts = {
      url:      this.url,
      userName: this.username,
      password: this.password,
      vpnName:  this.vpnName || "default",
      noLocal:  true,
    }

    const factoryProps   = new solace.SolclientFactoryProperties();
    factoryProps.profile = solace.SolclientFactoryProfiles.version10;
    solace.SolclientFactory.init(factoryProps);

    // Connect to Solace messaging
    console.log("Connecting to Solace messaging", opts);
    this.session = solace.SolclientFactory.createSession(opts);
    try {
      this.session.connect();
    } catch (error) {
      console.log(error.toString());
    }

    // Define all of our event listeners
    this.session.on(solace.SessionEventCode.UP_NOTICE, (sessionEvent) => {
      console.log('=== Successfully connected and authorized ===');
      console.log('Session event: ' + sessionEvent.infoStr + ' raised.');
      if (this.onConnect) {
        this.onConnect();
      }
      if (this.subscriptions.length) {
        this.subscriptions.forEach(sub => {
          console.log("subscribing:", sub)
          this._subscribe(sub.subscription);
        });
      }

    });

    this.session.on(solace.SessionEventCode.CONNECT_FAILED_ERROR, (sessionEvent) => {
      console.log('Connection failed to the message router: ' + sessionEvent.infoStr + '; error code: ' + sessionEvent.errorCode);
      console.log('Details: ' + sessionEvent.details);
      console.log('Description: ' + sessionEvent.description);
    });

    this.session.on(solace.SessionEventCode.DISCONNECTED, (sessionEvent) => {
      console.log('Disconnected.');
    });

    this.session.on(solace.SessionEventCode.SUBSCRIPTION_ERROR, (sessionEvent) => {
      console.log('Cannot subscribe to topic: ' + sessionEvent.correlationKey + '; error code: ' + sessionEvent.errorCode);
      console.log('Details: ' + sessionEvent.details);
      console.log('Description: ' + sessionEvent.description);
    });

    this.session.on(solace.SessionEventCode.SUBSCRIPTION_OK, (sessionEvent) => {
      console.log('Subscribed to topic: ' + sessionEvent.correlationKey);
    });

    this.session.on(solace.SessionEventCode.MESSAGE, (message) => {
      console.log('Received message: "' + message.getBinaryAttachment() + '"');
      this.rxMessage(message.getDestination().getName(), message);
    });


  }

  disconnect() {
    super.disconnect();

    // Disconnect from Solace messaging
    if (this.session) {
      this.session.disconnect();
    }    

  }

  subscribe(qos, subscription) {

    subscription = this.adjustSubscription(subscription);

    super.subscribe(qos, subscription);

    if (this.session) {  

      if (qos > 0) {
        console.warn("QoS 1+ not currently supported by this demo");
        throw new Error("QoS 1+ not currently supported by this demo");
      }

      // Subscribe on the session for Solace messaging
      this._subscribe(subscription);
    }
    else {
      console.log("Not connected to Solace messaging");
    }

    console.log("added sub", subscription, this.session)

  }

  // Bind to a Solace named queue
  // TODO - need to plumb in events for success/failure of binds
  bindToQueue(queueName) {
    this.messageConsumer = this.session.createMessageConsumer({
      queueDescriptor: { name: queueName, type: solace.QueueType.QUEUE },
      acknowledgeMode: solace.MessageConsumerAcknowledgeMode.CLIENT,
    });
    this.messageConsumer.on(solace.MessageConsumerEventName.UP, () => {
      console.log("MessageConsumer is now up and running");
    });
    this.messageConsumer.on(solace.MessageConsumerEventName.CONNECT_FAILED_ERROR, (e) => {
      console.log("MessageConsumer failed to connect", e);
    });
    this.messageConsumer.on(solace.MessageConsumerEventName.MESSAGE, (message) => {
      // Need to explicitly ack otherwise it will not be deleted from the message router
      this.rxMessage(message.getDestination().getName(), message);
      message.acknowledge();
    });
    try {
        this.messageConsumer.connect();
    } catch (error) {
        console.log(error.toString());
    }    
  }


  _subscribe(subscription) {
    // Subscribe on the session for Solace messaging
    try {
      console.log("Subscribing to topic: " + subscription);
      this.session.subscribe(
        solace.SolclientFactory.createTopic(subscription),
        true,
        subscription,
        10000
      );
      console.log("EDE Subscribed to topic: " + subscription);
    } catch (error) {
      console.log(`Failed to subscribe to ${subscription}:`, error.toString());
    }
  }

  unsubscribe(subId) {
    super.unsubscribe(subId);
  }

  _unsubscribe(subscription) {
    if (this.session) {
      // Unsubscribe on the session for Solace messaging
      try {
        this.session.unsubscribe(solace.SolclientFactory.createTopic(subscription));
      } catch (error) {
        console.log(error.toString());
      }
    }
  }

  publish(topic, msg, opts = {}) {

    if (this.session) {
      // Publish on the session for Solace messaging
      try {
        let data = JSON.stringify(msg);
        let solMessage = solace.SolclientFactory.createMessage();
        solMessage.setDestination(solace.SolclientFactory.createTopic(topic));
        solMessage.setBinaryAttachment(data);
        solMessage.setDeliveryMode(solace.MessageDeliveryModeType.PERSISTENT);

        // Create an SDT for the user properties
        let sdt = new solace.SDTMapContainer();

        // Generate a 32 character random string of hex digits unless we already have a traceId
        const traceId = opts.traceId || [...Array(32)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');

        // And a 16 character parentId of hex digits
        // const parentId = [...Array(16)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
        // NOTE - hardcoded parentId to all zeros for now - this will allow the visualizer to know which span is the first one
        const parentId = opts.parentId || "0000000000000000";

        sdt.addField("traceparent", solace.SDTFieldType.STRING, `00-${traceId}-${parentId}-01`);

        if (opts.color) {
          sdt.addField("color", solace.SDTFieldType.STRING, opts.color);
        }

        // Add the SDT to the message
        solMessage.setUserPropertyMap(sdt);

        console.log("SDT:", solMessage.getUserPropertyMap());

        this.session.send(
          solMessage
        );
      } catch (error) {
        console.log(error.toString());
      }
    }
  }

  rxMessage(topic, msg) {
    console.log("rxMessage", topic, msg)
    let data;
    try {
      data = JSON.parse(msg.getBinaryAttachment());
    }
    catch(e) {
      console.log("Failed to get JSON payload of message:", topic, msg.toString());
      data = null;
    }

    if (this.onMessage) {
      this.onMessage(topic, msg, data);
    }

  }

  adjustSubscription(subscription) {
    // Convert + to * and # to >
    return subscription.replace(/\+/g, this.topicLevelWildcard).replace(/\#/g, this.topicAllLevelsWildcard);
  }

  getUserProperties(msg) {
    let props = msg.getUserPropertyMap();
    if (props) {
      let keys = props.getKeys();
      let userProps = {};
      keys.forEach(key => {
        let field = props.getField(key);
        userProps[key] = field.getValue();
      });
      return userProps;
    }
    return undefined;
  }


}

