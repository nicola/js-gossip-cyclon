'use strict'

const sample = require('pick-random')
const EventEmitter = require('events').EventEmitter

function defaultPeerToId (peer) {
  return peer.id
}

class PeerSet extends EventEmitter {
  constructor (peers, limit, peerToId) {
    super()
    this.peers = {}
    this.peerToId = peerToId || defaultPeerToId
    if (peers) {
      peers.forEach((peer) => {
        const id = this.peerToId(peer)
        this.peers[id] = peer
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
  get (peer) {
    const id = this.peerToId(peer)
    return this.peers[id]
  }
  remove (peer) {
    const id = this.peerToId(peer)
    peer = this.peers[id]
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
        const id = this.peerToId(repleacing)
        this.emit('remove', this.peers[id])
        delete this.peers[id]
      }
      const id = this.peerToId(peer)
      this.peers[id] = peer
      this.emit('add', peer)
    })
  }
}

module.exports = PeerSet
