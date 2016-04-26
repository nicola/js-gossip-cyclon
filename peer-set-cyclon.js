'use strict'

const PeerSet = require('./peer-set')

function max (array) {
  return array.indexOf(Math.max.apply(Math, array))
}

class CyclonPeerSet extends PeerSet {
  constructor (peers, limit, peerToId) {
    super(peers, limit, peerToId)

    // Set age = 0 to each peer by default
    Object.keys(this.peers).forEach((id) => {
      this.peers[id].age = 0
    })
  }
  updateAge () {
    Object.keys(this.peers).forEach((id) => {
      this.peers[id].age++
    })
  }
  oldest () {
    var ids = Object.keys(this.peers)
    let oldest = max(ids.map((key) => this.peers[key].age))
    let id = ids[oldest]
    return this.peers[id]
  }
}

module.exports = CyclonPeerSet
