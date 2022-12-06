# pubsub-goldberg

A basic physics based Rube Goldberg type machine that runs in a browser and allows connections to pub/sub brokers to 'warp' objects between connected
browser pages. Threejs is used to render the environment

## Get Started
```
git clone https://github.com/efunneko/pubsub-goldberg.git
cd pubsub-goldberg/
npm install
npm run watch
```

## Things to know
1. You need to create a 'broker' object to configure where and how to log in (NOTE that I have only tested the SMF/Solace broker type recently)
1. Once you have a broker object, you can create a 'portal' object and configure it to choose which broker to use. This allows you to only have to configure all the broker related stuff in one place, even though you might have many portals
1. Each portal will have an independent connection to the broker
1. Each portal has an 'id' that is used in its default subscription so that objects going in a portal will come out of all other portals with the same id
1. If a portal successfully connects to a broker, it will light up and it will be black in the middle of the ring. Otherwise it is gray
1. Currently, only balls or blocks can go through a portal. Blocks and balls can be configured to have a specific topic or they can be given a topic by the portal. If they have a 'forced' topic, then they will only come out of portals that have matching subscriptions or are bound to queues that have matching subscriptions
1. There is some protection to avoid very fast 'ping-ponging' of objects through portals, where an object is not eligible to go through the portal it arrived on for the first 200ms. I think this might be a bit buggy right now
1. Anywhere you see a 'screw', you can grab it to resize or rotate it. This could use some polishing
1. When changing barriers, you can grab internal screws and move them around. Grabbing an end screw will add to the chain. You can click on the end screw and then drag it - I find this is a bit hit or miss... If you drag a screw onto a neighboring screw on the same barrier, it will delete the screw
1. When dragging a barrier, if you hold the CTRL key, it will clone it. I intend to make this happen for all objects
1. Balls can be annotated with a 'label'. There is a basic expression language for this, which is similar to RDP expressions. The most important expression is `${seqNum(<sequence-name>, [start], [step])}` which can give you an increasing sequence on the balls. You would configure this on the Emitter so that each ball emitted would get a unique number.
1. When you click the save button the config will be in your URL so you can bookmark it or share it with others
