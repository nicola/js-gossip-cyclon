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
      return this.peers[key]
    })
  }
  get length () {
    return Object.keys(this.peers).length
  }
  get (id) {
    return this.peers[id]
  }
  remove (id) {
    const peer = this.peers[id]
    if (peer) {
      delete this.peers[id]
    }
    this.emit('remove', peer)
  }
  upsert (peers, repleceable = []) {
    peers.forEach((peer, i) => {
      if (this.peers.length >= this.limit) {
        if (repleceable.length === 0) {
          return
        }
        let repleacing = repleceable.shift(0)
        this.emit('remove', this.peers[repleacing.id])
        delete this.peers[repleacing.id]
      }
      this.peers[peer.id] = peer
      this.emit('add', peer)
    })
  }
}

module.exports = PeerSet
