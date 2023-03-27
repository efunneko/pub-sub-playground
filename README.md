# pub-sub-playground

A browser tool that lets you experiment with Publish Subscribe messaging in a 2d-physics/3d-rendered environment. It currently supports Solace (SMF) messaging (MQTT coming soon)

## Get Started from Source
```
git clone https://github.com/efunneko/pub-sub-playground.git
cd pub-sub-playground/
npm install
npm run watch
```
Then look at the console output for the URL to connect to - probably http://localhost:8080


## Use the hosted version

[Pub-Sub Playground](http://pub-sub-playground.s3-website.us-east-2.amazonaws.com/)

## Things to know
1. You need to create a 'broker' object to configure where and how to log in to the pub-sub broker
1. Once you have a broker object, you can create a 'portal' object and configure it to choose which broker to use. This allows you to only have to configure all the broker related stuff in one place, even though you might have many portals
1. Each portal will have an independent connection to the broker
1. Each portal has an 'id' that is used in its default subscription so that objects going in a portal will come out of all other portals with the same id
1. If a portal successfully connects to a broker, it will light up and it will be black in the middle of the ring. Otherwise it is gray. You can click on it to see the last error that it experienced.
1. Currently, only balls or blocks can go through a portal. Blocks and balls can be configured to have a specific topic or they can be given a topic by the portal. If they have a 'forced' topic, then they will only come out of portals that have matching subscriptions or are bound to queues that have matching subscriptions
1. There is some protection to avoid very fast 'ping-ponging' of objects through portals, where an object is not eligible to go through the portal it arrived on for the first 200ms. 
1. Anywhere you see a 'screwhead', you can grab it to resize or rotate the object it is attached to. This could use some polishing
1. When changing barriers, you can grab internal screws and move them around. To extend a barrier, hold the CTRL key down when moving the a screw at the end of the barrier and it will add a screw. If you drag a screw on top of a neighboring screw, it will merge them into a single screw.
1. When dragging an object, if you hold the CTRL key, it will clone it. 
1. Balls can be annotated with a 'label'. There is a basic expression language for this. The most important expression is `${seqNum(<sequence-name>, [start], [step])}` which can give you an increasing sequence on the balls. You would configure this on the Emitter so that each ball emitted would get a unique number.
1. Topics given to objects can use this same expression language to uniquify topics. For example, you can have a topic like: `demo/ball/${attr(color)` and it will put the ball's color as the last level of its published topic.
1. When you click the save button the config will be in your URL so you can bookmark it or share it with others
1. You can pause the simulation by hitting the Pause button in the top left corner. Then you can use the 'hamburger' menu to create new sessions, open old ones, delete the current one and import/export the sessions. You can add new objects using the + (plus) button.
1. You can delete selected objects by clicking on the red trashcan button in the bottom right corner
1. You can undo with CTRL-Z


## ToDo List (incomplete)

1. Enable MQTT messaging
1. Fix Blocks - currently balls are the only moving objects that work properly
1. Fix the object Add menu to look much better
1. Add a 'function' object that can do things when hit by a ball. For example, delete the ball that hit it and create a new one of a different color and topic - this simulates a micro-service issuing a reply
1. Add the abiltity to zoom the view with CTRL-scrollwheel
1. Add mobile dynamic gravity

