const Swarm = require('libp2p-swarm')
const ndjson = require('ndjson')
const Peer = require('peer-info')
const PeerId = require('peer-id')
const multiaddr = require('multiaddr')
const spdy = require('libp2p-spdy')
const TCP = require('libp2p-tcp')
const PeerSet = require('peer-set-cyclon')
const debug = require('debug')('gossip:cyclon')

// Send a set of peers to a peer
// And receive a set of peers from her
function shuffle (swarm, to, peers, callback) {
  swarm.dial(to, '/cyclon/0.1.0', (err, conn) => {
    if (err) {
      return callback(err)
    }

    // Write into connection
    var serialize = ndjson.serialize()
    serialize.write(peers)
    serialize.end()
    serialize.pipe(conn)

    // reading from connection
    var stream = ndjson.parse()
    stream.on('data', function (peers) {
      callback(null, peers)
    })

    conn.pipe(stream)
  })
}

function handle (swarm, cb) {
  swarm.handle('/cyclon/0.1.0', (conn) => {
    var stream = ndjson.parse()
    stream.on('data', function (peers) {
      cb(peers, (err, reply) => {
        if (err) {
          console.log('do not know how to handle error yet')
          return
        }
        var serialize = ndjson.serialize()
        serialize.write(reply)
        serialize.end()
        serialize.pipe(conn)
      })
    })
    conn.pipe(stream)
  })
}

class CyclonPeer {
  constructor (opts = {}) {
    this.peer = opts.peer || new Peer()
    this.peer.multiaddr.add(multiaddr('/ip4/0.0.0.0/tcp/0'))
    this.swarm = new Swarm(this.peer)
    this.swarm.transport.add('tcp', new TCP())
    this.swarm.connection.addStreamMuxer(spdy)
    this.swarm.connection.reuse()
    this.maxShuffle = opts.maxShuffle || 10
    this.maxPeers = opts.maxPeers || 20
    this.interval = opts.interval || 1000
    this.partialView = new PeerSet(opts.peers, {limit: this.maxPeers})

    handle(this.swarm, (rawPeers, done) => {
      debug(this.peer.id.toB58String().substr(2, 6),
        'handle - peers:',
        rawPeers.map(peer => {
          return peer.id.substr(2, 6)
        }),
        'now',
        this.partialView.getAll().map(peer => peer.id.toB58String().substr(2, 6)))

      const peers = rawPeers.map(fromRawPeer)
      const sample = this.partialView.sample(this.maxShuffle, [peers[0]])
      this.addPeers(rawPeers.map(fromRawPeer), sample)

      done(null, sample.map(toRawPeer))
    })
  }

  start (cb) {
    const report = (err) => {
      if (err) {
        debug(`${this.peer.id.toB58String().substr(2, 6)} dial error`, err.message)
      }
    }
    if (!this.intervalId) {
      this.intervalId = setInterval(() => this.shuffle(report), 1000)
    }
  }

  stop (cb) {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      delete this.intervalId
    }
  }

  listen (cb) {
    this.swarm.transport.listen('tcp', {}, null, cb)
  }

  close (cb) {
    this.swarm.close(cb)
  }

  addPeers (peers, replace) {
    const peerToId = this.partialView.peerToId
    // filter out myself
    let add = peers.filter(peer => peerToId(peer) !== peerToId(this.peer))
    this.partialView.add(add, replace)
  }

  updateAge () {
    this.partialView.updateAge()
  }

  shuffle (cb) {
    // if previous shuffle currently running,
    // remove that peer since it has been too slow
    if (this.lastShuffled) {
      debug(`${this.peer.id.toB58String().substr(2, 6)} removing lastShuffled ${this.lastShuffled.id.toB58String().substr(2, 6)}`)
      this.partialView.remove(this.lastShuffled)
      this.lastShuffled = null
    }

    // if we have no partialView, we are done
    if (this.partialView.length === 0) {
      debug(`${this.peer.id.toB58String().substr(2, 6)} - shuffle: partialView is empty`)
      if (cb) cb()
      return
    }

    // 1 - increase age
    this.updateAge()

    // 2 - get oldest
    const oldest = this.partialView.oldest()
    this.lastShuffled = oldest
    this.partialView.remove(oldest)
    // .. and a sampled subset
    let sample = this.partialView.sample(this.maxShuffle - 1, [oldest])

    // 3 - add yourself to the list
    let sending = sample
      .concat(this.peer)
      .map(toRawPeer)

    // 4 - send subset to peer
    shuffle(this.swarm, oldest, sending, (err, peers) => {
      if (err) {
        debug(`${this.peer.id.toB58String().substr(2, 6)} - shuffle: error shuffling`, err.message)
        if (cb) cb(err)
        return
      }

      if (this.lastShuffled !== oldest) {
        debug('this response has arrived too late')
        if (cb) cb(new Error('response arrived too late'))
        return
      }

      debug(this.peer.id.toB58String().substr(2, 6),
        'received from',
        oldest.id.toB58String().substr(2, 6),
        ' - peers:',
        peers.map(peer => peer.id.substr(2, 6)),
        'now',
        this.partialView.getAll().map(peer => peer.id.toB58String().substr(2, 6)))

      this.addPeers(peers.map(fromRawPeer), sample)
      this.lastShuffled = null
      if (cb) cb()
    })
  }
}

function toRawPeer (peer) {
  const raw = {
    id: peer.id.toB58String(),
    multiaddrs: peer.multiaddrs.map(m => m.toString())
  }
  return raw
}

function fromRawPeer (peer) {
  const pi = new Peer(PeerId.createFromB58String(peer.id))
  pi.age = peer.age
  peer.multiaddrs.forEach(m => pi.multiaddr.add(multiaddr(m)))
  return pi
}

module.exports = CyclonPeer
