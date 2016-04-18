'use strict'

const max = require('max-component')
const PeerSet = require('./peer-set')

module.exports = CyclonPeerSet

class CyclonPeerSet extends PeerSet {
  constructor (peers, limit) {
    super(peers, limit)
    // Set age = 0 to each peer by default
    this.peers.forEach((peer) => {
      if (!peer.age) {
        peer.age = 0
      }
    })
  }
  updateAge () {
    for (let i in this.peers) {
      this.peers[i].age++
    }
  }
  oldest () {
    let array = Object.keys(this.peers).map((key) => this.peers[key])
    return max(array, 'age')
  }
}
