/* eslint-env mocha */
'use strict'

const expect = require('chai').expect
const PeerSet = require('../peer-set')

describe('peer-set', function () {
  this.timeout(20000)

  it('create with bootstrap peers', (done) => {
    const Alice = {id: 'Alice'}
    const Bob = {id: 'Bob'}
    const set = new PeerSet([Alice, Bob])
    expect(set).to.exist
    expect(set.peers[set.peerToId(Alice)]).to.eql(Alice)
    expect(set.peers[set.peerToId(Bob)]).to.eql(Bob)
    done()
  })

  it('get single peer', (done) => {
    const Alice = {id: 'Alice'}
    const Bob = {id: 'Bob'}
    const set = new PeerSet([Alice, Bob])
    expect(set).to.exist
    expect(set.get(Alice)).to.eql(Alice)
    expect(set.get(Bob)).to.eql(Bob)
    done()
  })

  it('sample a subset of peers', (done) => {
    const peers = Array.from(new Array(50), (x, i) => {
      return {id: 'id_' + i}
    })
    const set = new PeerSet(peers)
    const subset = set.sample(10)
    expect(subset).to.have.lengthOf(10)
    done()
  })
})
