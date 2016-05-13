# Gossip: Cyclon in Javascript

[![Build Status](https://travis-ci.org/nicola/js-gossip-cyclon.svg?style=flat-square)](https://travis-ci.org/nicola/js-gossip-cyclon)

This implements the Cyclon gossip protocol [1] for membership management.

##### Cyclon in _simple language_

Imagine you have big group of people and you want to tell everybody something. You could _broadcast_ a message by talking to each of them individually, or you could just talk to some (this is called gossip), telling them to tell other people.

Cyclon is a simple gossip protocol that ensures that every peer in the network gets connected with the network of peers, without being connected to every single one. This is done by peers keeping a list of neighbors (small compared to the network) and at every interval, ask the neighbor that has been the longest in a peer list of neighbors (this is called partial view), to exchange some neighbors.


## Cyclon

```js
const CyclonPeer = require('gossip-cyclon')
const parallel = require('run-parallel')

const Alice = new CyclonPeer()
const Bob = new CyclonPeer()

Alice.addPeers([Bob.me])

parallel([
  () => Alice.listen()
  () => Bob.listen()
], (err) => {
  if (!err) {
    Alice.start()
    Bob.start()
    // This will make Alice and Bob exchange each others information every 1 second
  }
})

```

## Run the simulation

```bash
$ git clone https://github.com/nicola/js-gossip-cyclon
$ cd js-gossip-cyclon
$ npm install
$ node viz/index.js
// Now visit http://127.0.0.1:8080
```

<img src="https://raw.githubusercontent.com/nicola/js-gossip-cyclon/master/simulation.png" width="500px">


## Usage

### `var peer = new CyclonPeer(opts)`

`opts` can have:
- `peer`: [PeerInfo](http://npm.im/peer-info) object of this CyclonPeer, default: `new PeerInfo()`.
- `maxShuffle`: how many peers to send during shuffling
- `maxPeers`: how many peers can be stored in the list of neighboors (or `.partialView`)
- `interval`: how often CyclonPeer should shuffle
- `peers`: array of peers to bootstrap CyclonPeer (they will be added to its `.partialView`)

### `peer.listen(cb)`

Listen on its transports (by default TCP)

### `peer.close(cb)`

Close any listener on any transport

### `peer.start()`

Start shuffling every `peer.interval`

### `peer.stop()`

Stops the repeating shuffling

### `peer.shuffle(cb)`

Shuffle and when done calls `cb` (on failure or success)

### `peer.addPeers(peers, replace)`

Add a list of peers, if the peers to be added will make `.partialView` grow beyond `.maxPeers`, the `replace` list will be used, otherwise drop 'em.

### `peer.updateAge()`

Update the age of the peers in the `.partialView`

## References

[1] S. Voulgaris, D. Gavidia, M. van Steen. [CYCLON: Inexpensive Membership Management for Unstructured P2P Overlays](http://gossple2.irisa.fr/~akermarr/cyclon.jnsm.pdf). J. Network Syst. Manage. 13(2): 197-217 (2005)

## License

MIT
