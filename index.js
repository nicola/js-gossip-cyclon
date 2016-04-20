'use strict'

// const intersect = require('intersect')
const PeerInfo = require('peer-info')
const EventEmitter = require('events').EventEmitter
const PeerSet = require('./peer-set-cyclon')

class CyclonPeer extends EventEmitter {
  constructor (options) {
    super()
    // local
    this.me = new PeerInfo()
    this.peers = new PeerSet(options.peers, options.maxPeers)
    this.interval = options.interval || 1000 * 60 * 1
    this.maxPeers = options.maxPeers || 5

    // events
    this.peers.on('add', this.onNewPeer)
    this.peers.on('remove', this.onPeerDown)
    this.on('shuffle-receive', this.shuffleReceive)
  }

  start () {
    this.timer = setInterval(this.shuffle, this.interval)
  }

  stop () {
    if (this.timer) clearInterval(this.timer)
  }

  shuffle () {
    // Step 1 increase the age of each neighboor
    this.peers.updateAge()

    // Step 2 get oldest
    let peer = null

    if (this.lastShufflePeer !== null) {
      this.peers.remove(this.lastShufflePeer.id)
      this.lastShufflePeer = null
    }

    while (this.peers.length > 0) {
      peer = this.peers.oldest()
      if (peer.isConnected()) {
        break
      }
      this.peers.remove(peer.id)
    }

    if (this.peers.length === 0) {
      return
    }

    this.peers.remove(peer.id)

    // .. and sample subset
    let sampled = this.peers.sample(this.maxPeers - 1)

    // Step 3 add yourself to the list
    let sending = sampled.concat({ age: 0, id: this.me.id })

    // Step 4 send subset to peer
    peer.push('shuffle', {data: sending})

    // Step 5 receive subset from peer and update cache
    // TODO
    peer.on('shuffle-receive', (peers) => {
      if (this.lastShufflePeer !== peer) {
        return
      }
      this.updatePeers(peers, sampled)
      this.lastShufflePeer = null
    })
  }

  shuffleReceive (peer, remote) {
    let sampled = this.peers.sampled(this.maxPeers)
    peer.conn.send('shuffle-received', sampled)
    this.updatePeers(remote, sampled)
  }

  updatePeers (peers, replace) {
    let add = peers
      .slice(0, this.maxPeers)
      .filter((peer) => {
        let itself = peer.id === this.me.id
        let exists = this.peers[peer.id]
        return !itself && !exists
      })

    this.peers.upsert(add, replace)
  }
}

module.exports = CyclonPeer
