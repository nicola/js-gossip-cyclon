const Swarm = require('libp2p-swarm')
const ndjson = require('ndjson')
const Peer = require('peer-info')
const PeerId = require('peer-id')
const multiaddr = require('multiaddr')
const spdy = require('libp2p-spdy')
const TCP = require('libp2p-tcp')
const PeerSet = require('peer-set-cyclon')

// Send a set of peers to a peer
// And receive a set of peers from her
function shuffle (swarm, to, peers, callback) {
  console.log('pre dial')
  swarm.dial(to, '/cyclon/0.1.0', (err, conn) => {
    console.log('post dial')
    if (err) {
      console.log(err)
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
  return this
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
    this.partialView = new PeerSet(opts.peers, {limit: this.maxPeers})

    handle(this.swarm, (peers, done) => {
      console.log(this.peer.id.toB58String().substr(2, 6), 'handle - peers:', peers.map(peer => {
        return peer.id.substr(2, 6)
      }))

      const sample = this.partialView.sample(this.maxShuffle)
      this.addPeers(peers.map(fromRawPeer), sample)

      done(null, sample.map(toRawPeer))
    })
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
      this.partialView.remove(this.lastShuffled)
    }

    // if we have no partialView, we are done
    if (this.partialView.length === 0) {
      return cb()
    }

    // 1 - increase age
    this.updateAge()

    // 2 - get oldest
    const oldest = this.partialView.oldest()
    this.lastShuffled = oldest
    this.partialView.remove(oldest)
    // .. and a sampled subset
    let sample = this.partialView.sample(this.maxShuffle - 1)

    // 3 - add yourself to the list
    let sending = sample
      .map(toRawPeer)
      .concat({
        id: this.partialView.peerToId(this.peer),
        multiaddrs: this.peer.multiaddrs
      })

    // 4 - send subset to peer
    shuffle(this.swarm, oldest, sending, (err, peers) => {
      if (err) {
        return cb(err)
      }
      if (this.lastShuffled !== oldest) {
        console.log('this response has arrived too late')
        cb(new Error('response arrived too late'))
        return
      }
      console.log(this.peer.id.toB58String().substr(2, 6), 'received - peers:', peers.map(peer => {
        return peer.id.substr(2, 6)
      }))

      this.addPeers(peers.map(fromRawPeer), sample)
      this.lastShuffled = null
      cb()
    })
  }
}

function toRawPeer (peer) {
  return {
    id: peer.id.toB58String(),
    multiaddrs: peer.multiaddrs
  }
}

function fromRawPeer (peer) {
  const pi = new Peer(PeerId.createFromB58String(peer.id))
  pi.age = peer.age
  pi.multiaddrs = peer.multiaddrs
  return pi
}

module.exports = CyclonPeer
