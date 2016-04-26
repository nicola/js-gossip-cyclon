'use strict'

// const intersect = require('intersect')
const PeerInfo = require('peer-info')
const EventEmitter = require('events').EventEmitter
const PeerSet = require('./peer-set-cyclon')
const Swarm = require('libp2p-swarm')
// const TCP = require('libp2p-tcp')
// const spdy = require('libp2p-spdy')
const multiaddr = require('multiaddr')
const debug = require('debug')('cyclon')
const PeerId = require('peer-id')

function peerToId (peerInfo, short) {
  if (short === true) {
    return peerInfo.id.toB58String().substring(2, 10)
  } else {
    return peerInfo.id.toB58String()
  }
}

class CyclonPeer extends EventEmitter {
  constructor (options = {}) {
    super()
    // myself
    this.me = options.me || new PeerInfo()
    this.me.multiaddr.add(multiaddr('/ip4/0.0.0.0/tcp/0'))

    // handling connections
    this.swarm = new Swarm(this.me)
    this.swarm.handle('/cyclon/0.1.0', (conn) => {
      // conn.on('data', (data) => {
      //   console.log(data.toString())
      //   conn.write(data)
      // })

      // conn.on('end', () => {
      //   conn.end()
      // })
    })

    // getting options
    this.peers = new PeerSet(options.peers, options.maxPeers, options.peerToId || peerToId)
    this.interval = options.interval || 1000 * 60 * 1
    this.maxPeers = options.maxPeers || 20

    // internal vars
    this.lastShufflePeer = null

    // events
    this.peers.on('add', this.onNewPeer.bind(this))
    this.peers.on('remove', this.onPeerDown.bind(this))
    this.on('shuffle-receive', this.shuffleReceive)

    debug(`create peer ${peerToId(this.me)}`)
  }

  onNewPeer (peer) {
    debug(`${peerToId(this.me)} adds peer ${peerToId(peer)}`)
    // this.swarm.dial(new PeerInfo(peer.id), '/cyclon/0.1.0', (err, conn) => {
    //   if (err) {
    //     this.peers.remove(peer.id)
    //   }
    // })
  }

  onPeerDown (peer) {
    debug(`${peerToId(this.me)} remove peer ${peer}`)
  }

  start (callback) {
    // this.swarm.transport.listen('tcp', {}, null, callback)
    this.shuffle()
    this.timer = setInterval(this.shuffle, this.interval)
  }

  stop () {
    if (this.timer) clearInterval(this.timer)
  }

  shuffle () {
    // Step 1 increase the age of each neighboor
    this.peers.updateAge()

    // Step 2 get oldest
    let oldest = null

    if (this.lastShufflePeer !== null) {
      this.peers.remove(this.lastShufflePeer)
      this.lastShufflePeer = null
    }

    while (this.peers.length > 0) {
      oldest = this.peers.oldest()
      if (true) { // (oldest.isConnected()) {
        break
      }
      this.peers.remove(oldest)
    }

    if (this.peers.length === 0) {
      debug(`${peerToId(this.me)} has 0 peers, can't proceed`)
      return
    }

    debug(`${peerToId(this.me)} starting shuffling with peer ${peerToId(oldest)}`)

    this.lastShufflePeer = oldest
    this.peers.remove(oldest)

    // .. and sample subset
    let sampled = this.peers
      .sample(this.maxPeers - 1)
      .map((peer) => {
        return {
          id: this.peers.peerToId(peer),
          multiaddrs: peer.multiaddrs
        }
      })

    // Step 3 add yourself to the list
    let sending = sampled.concat({
      id: this.peers.peerToId(this.me),
      multiaddrs: this.me.multiaddrs
    })

    // Step 4 send subset to peer
    oldest.emit('shuffle', {data: sending})

    // Step 5 receive subset from peer and update cache
    // TODO
    oldest.on('shuffle-receive', (peers) => {
      if (this.lastShufflePeer !== oldest) {
        return
      }
      this.addPeers(peers.map(fromRawPeer), sampled)
      this.lastShufflePeer = null
    })
  }

  shuffleReceive (peer, remote) {
    let sampled = this.peers
      .sample(this.maxPeers)
      .map((peer) => {
        return {
          id: this.peers.peerToId(peer),
          multiaddrs: peer.multiaddrs
        }
      })

    peer.conn.send('shuffle-received', sampled)
    this.addPeers(remote.map(fromRawPeer), sampled)
  }

  addPeers (peers, replace) {
    let add = peers
      .slice(0, this.maxPeers)
      .filter((peer) => {
        let itself = this.peers.peerToId(peer) === this.peers.peerToId(this.me)
        let exists = this.peers.get(peer)
        return !itself && !exists
      })

    this.peers.upsert(add, replace)
  }
}

function fromRawPeer (peer) {
  const pi = new PeerInfo(PeerId.createFromB58String(peer.id))
  pi.age = peer.age
  pi.multiaddrs = peer.multiaddrs
  return pi
}

module.exports = CyclonPeer
