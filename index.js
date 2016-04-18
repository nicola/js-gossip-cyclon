'use strict'

// const intersect = require('intersect')
const PeerInfo = require('peer-info')
const EventEmitter = require('events').EventEmitter
const PeerSet = require('./peer-set-cyclon')

class CyclonPeer extends EventEmitter {
  constructor (options) {
    super()
    this.peer = new PeerInfo()
    this.neighbors = new PeerSet(options.neighbors, options.neighborsLimit)
    this.timeout = options.timeout || 1000 * 60 * 1
    this.limit = options.limit || 5
  }

  start () {
    this.timer = setInterval(this.shuffle, this.timeout)

    // TODO
    this.on('shuffle-receive', function (socket, message) {
      // TODO updateNeighbors
      let sending = this.neighbors.sample(this.limit)
      socket.send({type: 'shuffle', data: sending})
    })
  }

  stop () {
    if (this.timer) {
      clearInterval(this.timer)
    }
  }

  shuffle () {
    // Step 1 increase the age of each neighboor
    this.neighbors.updateAge()

    // Step 2 get oldest and sample subset
    let peer = null

    while (this.neighbors.length > 0) {
      peer = this.neighbors.oldest()
      if (peer.socket && peer.socket.connected) {
        break
      }
      this.onPeerDown(peer)
    }

    if (this.neighbors.length === 0) {
      return
    }

    this.neighbors.remove(peer.id)
    let sampled = this.neighbors.sample(this.limit - 1)

    // Step 3 add yourself to the list
    let sending = sampled.concat({ age: 0, id: this.peer.id })

    // Step 4 send subset to peer

    // TODO
    peer.socket.send({type: 'shuffle', data: sending})

    // Step 5 receive subset from peer and update cache
    // TODO
    peer.socket.on('shuffle-receive', (peers) => {
      // TODO make sure we are in the same term
      this.updateNeighbors(peers, sampled)
    })
  }

  updateNeighbors (peers, replace) {
    let add = peers
      .slice(0, this.limit)
      .filter((peer) => {
        let itself = peer.id === this.peer.id
        let exists = this.neighbors[peer.id]
        return !itself && !exists
      })

    this.neighbors.upsert(add, replace)
  }
}

module.exports = CyclonPeer
