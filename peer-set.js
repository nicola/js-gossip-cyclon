'use strict'

const sample = require('pick-random')

module.exports = PeerSet

class PeerSet {
  constructor (peers, limit) {
    this.peers = peers || {} // {id1: {id: id1, age: age}, id2:..}
    this.limit = limit || 10
  }
  sample (limit) {
    let array = Object.keys(this.peers)
    let sampled = sample(array, {count: this.limit})
    return sampled.map((key) => this.peers[key])
  }
  get length () {
    return Object.keys(this.peers).length
  }
  remove (peer) {
    if (this.peers[peer]) {
      delete this.peers[peer]
    }
  }
  upsert (peers, repleceable = []) {
    peers.forEach((peer, i) => {
      if (this.peers.length >= this.limit) {
        if (repleceable.length === 0) {
          return
        }
        let repleacing = repleceable.shift(0)
        delete this.peers[repleacing]
      }
      this.peers[peer.id] = peer
    })
  }
}
