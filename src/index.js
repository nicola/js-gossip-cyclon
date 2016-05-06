'use strict'

const PeerInfo = require('peer-info')
const EventEmitter = require('events').EventEmitter
const PeerSet = require('peer-set-cyclon')
const Swarm = require('libp2p-swarm')
const TCP = require('libp2p-tcp')
const spdy = require('libp2p-spdy')
const multiaddr = require('multiaddr')
const debug = require('debug')('cyclon')
const PeerId = require('peer-id')
const ndjson = require('ndjson')

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
    this.swarm.transport.add('tcp', new TCP())
    this.swarm.connection.addStreamMuxer(spdy)
    this.swarm.connection.reuse()
    this.swarm.handle('/cyclon/0.1.0', (conn) => {
      conn
        .pipe(ndjson.parse())
        .on('data', (data) => {
          console.log(data.toString())
          conn.write(data)
        })

      conn.on('error', (err) => {
        debug(`${peerToId(this.me, true)} disconnected with error`, err)
      })

      conn.on('end', () => {
        conn.end()
      })

      this.conn = conn
    })

    this.connect = (peer) => {
      this.swarm.dial(peer, '/cyclon/0.1.0', (err, conn) => {
        if (err) {
          debug(`err connecting to ${peerToId(peer, true)}`, err)
          return
        }

        conn.on('error', (err) => {
          this.emit('peer-disconnect', err, peer)
        })

        conn.on('end', () => {
          conn.end()
        })

        peer.conn = conn
        this.emit('peer-connect', peer)
      })

      return peer
    }

    // getting options
    if (options.peer) {
      options.peers.forEach(this.connect)
    }
    this.peers = new PeerSet(
      options.peers,
      options.maxPeers,
      options.peerToId || peerToId)

    this.interval = options.interval || 1000 * 60 * 1
    this.maxPeers = options.maxPeers || 20

    // internal vars
    this.lastShufflePeer = null

    // events
    this.peers.on('add', (peer) => {
      debug(`${peerToId(this.me)} adds peer ${peerToId(peer)}`)
    })
    this.peers.on('remove', (peer) => {
      debug(`${peerToId(this.me)} remove peer ${peer}`)
    })
    this.on('shuffle-receive', this.shuffleReceive)

    this.on('peer-connect', (peer) => {
      debug('* peer is connected', peerToId(peer, true))
    })

    this.on('peer-disconnect', (err, peer) => {
      debug('* peer is disconnected', peerToId(peer, true), 'with error', err)
    })

    debug(`create peer ${peerToId(this.me)}`)
  }

  listen (callback) {
    this.swarm.transport.listen('tcp', {}, null, callback)
  }

  close (callback) {
    debug('close', peerToId(this.me, true))
    this.stop()
    this.swarm.close(callback)
  }

  start (callback) {
    this.shuffle()
    this.timer = setInterval(this.shuffle, this.interval)
  }

  stop () {
    if (this.timer) clearInterval(this.timer)
  }

  oldest () {
    let oldest = null
    while (this.peers.length > 0) {
      oldest = this.peers.oldest()
      if (oldest.conn) {
        break
      }
      this.peers.remove(oldest)
    }
    return oldest
  }

  sample (limit) {
    return this.peers.sample(limit).map((peer) => {
      return {
        id: this.peers.peerToId(peer),
        multiaddrs: peer.multiaddrs
      }
    })
  }

  shuffle () {
    // Step 1 increase the age of each neighboor
    this.peers.updateAge()

    // Step 2 get oldest
    if (this.lastShufflePeer !== null) {
      this.peers.remove(this.lastShufflePeer)
      this.lastShufflePeer = null
    }

    const oldest = this.oldest()

    if (this.peers.length === 0) {
      debug(`${peerToId(this.me)} has 0 peers, can't proceed`)
      return
    }

    debug(`${peerToId(this.me)} starting shuffling with peer ${peerToId(oldest)}`)

    this.lastShufflePeer = oldest
    this.peers.remove(oldest)

    // .. and sample subset
    let sample = this.sample(this.maxPeers - 1)

    // Step 3 add yourself to the list
    let sending = sample.concat({
      id: this.peers.peerToId(this.me),
      multiaddrs: this.me.multiaddrs
    })

    // Step 4 send subset to peer
    oldest('shuffle', {data: sending})

    // Step 5 receive subset from peer and update cache
    // TODO
    oldest.on('shuffle-receive', (peers) => {
      if (this.lastShufflePeer !== oldest) {
        return
      }
      this.addPeers(peers.map(fromRawPeer), sample)
      this.lastShufflePeer = null
    })
  }

  shuffleReceive (peer, remote) {
    let sample = this.peers
      .sample(this.maxPeers)
      .map((peer) => {
        return {
          id: this.peers.peerToId(peer),
          multiaddrs: peer.multiaddrs
        }
      })

    peer.emit('shuffle-received', sample)
    this.addPeers(remote.map(fromRawPeer), sample)
  }

  addPeers (peers, replace) {
    let add = peers
      .slice(0, this.maxPeers)
      .filter((peer) => {
        let itself = this.peers.peerToId(peer) === this.peers.peerToId(this.me)
        let exists = this.peers.get(peer)
        return !itself && !exists
      })

    add.forEach(this.connect)

    this.peers.add(
      add.map((peer) => {
        peer.age = 0
        return peer
      }),
      replace)
  }
}

function fromRawPeer (peer) {
  const pi = new PeerInfo(PeerId.createFromB58String(peer.id))
  pi.age = peer.age
  pi.multiaddrs = peer.multiaddrs
  return pi
}

module.exports = CyclonPeer
