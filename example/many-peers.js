'use strict'

const CyclonPeer = require('../src')
const debug = require('debug')('gossip:cyclon:example')
const parallel = require('run-parallel')

const peersNum = 3
let peers = []

// create 100 peers
for (let i = 0; i < peersNum; i++) {
  peers.push(new CyclonPeer())
}
debug('create peers')

// let the first 5 be bootstrap peers
var bootstrap = peers.slice(0, 1).map((peer) => {
  return peer.peer
})
var ids = bootstrap.map((info) => info.id.toB58String().substring(2, 10))
debug(`create bootstrap peers ${ids}`)

// set up the peers and start
peers.forEach((peer) => {
  peer.addPeers(bootstrap)
  const peers = peer.partialView.getAll().map((peer) => {
    return peer.id.toB58String().substr(2, 6)
  })
  console.log('added', peers)
})

parallel(peers.map((peer) => {
  return (done) => {
    peer.listen(() => {
      peer.start()
      done()
    })
  }
}))

debug('started peers')
