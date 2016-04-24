'use strict'

const sample = require('pick-random')
const EventEmitter = require('events').EventEmitter

class PeerSet extends EventEmitter {
  constructor (peers, limit) {
    super()
    this.peers = {}
    if (peers) {
      peers.forEach((peer) => {
        this.peers[peer.id] = peer
      })
    }
    this.limit = limit || 10
  }
  sample (limit) {
    let ids = Object.keys(this.peers)
    let sampled = sample(ids, {count: Math.min(limit, ids.length)})
    return sampled.map((key) => {
      return {
        age: this.peers[key].age,
        id: this.peers[key].id,
        multiaddrs: this.peers[key].multiaddrs
      }
    })
  }
  get length () {
    return Object.keys(this.peers).length
  }
  get (id) {
    return this.peers[id]
  }
  remove (peer) {
    if (this.peers[peer]) {
      this.emit('remove', this.peers[peer])
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
        this.emit('remove', this.peers[repleacing])
        delete this.peers[repleacing]
      }
      this.peers[peer.id] = peer
      this.emit('add', peer)
    })
  }
}

module.exports = PeerSet
