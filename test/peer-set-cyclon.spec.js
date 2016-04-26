/* eslint-env mocha */
'use strict'

const expect = require('chai').expect
const PeerSetCyclon = require('../peer-set-cyclon')

describe('peer-set-cyclon', function () {
  this.timeout(20000)

  it('create with bootstrap peers', (done) => {
    const Alice = {id: 'Alice'}
    const Bob = {id: 'Bob'}
    const set = new PeerSetCyclon([Alice, Bob])
    expect(set).to.exist
    expect(set.peers[Alice.id].age).to.eql(0)
    expect(set.peers[Bob.id].age).to.exist
    done()
  })

  it('update the age', (done) => {
    const Alice = {id: 'Alice'}
    const set = new PeerSetCyclon([Alice])
    expect(set.peers[Alice.id].age).to.eql(0)
    set.updateAge()
    expect(set.peers[Alice.id].age).to.eql(1)
    set.updateAge()
    expect(set.peers[Alice.id].age).to.eql(2)
    done()
  })

  it('get oldest peer', (done) => {
    const Alice = {id: 'Alice', age: 0}
    const Bob = {id: 'Bob', age: 0}

    // add and increase Alice only
    const set = new PeerSetCyclon([Alice])
    expect(set.get(Alice).age).to.eql(0)
    set.updateAge()
    expect(set.peers[set.peerToId(Alice)].age).to.eql(1)
    set.updateAge()
    expect(set.peers[Alice.id].age).to.eql(2)

    // add Bob and check for the oldest
    set.peers[Bob.id] = Bob
    set.updateAge()
    expect(set.peers[Alice.id].age).to.eql(3)
    expect(set.peers[Bob.id].age).to.eql(1)
    let oldest = set.oldest()
    expect(oldest.id).to.eql(Alice.id)
    done()
  })
})
