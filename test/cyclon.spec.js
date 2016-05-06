/* eslint-env mocha */
'use strict'

const expect = require('chai').expect
const CyclonPeer = require('../src')
const PeerId = require('peer-id')
const PeerInfo = require('peer-info')
const parallel = require('run-parallel')

const alice = {
  id: '1220151ab1658d8294ab34b71d5582cfe20d06414212f440a69366f1bc31deb5c72d',
  privKey: 'CAASpgkwggSiAgEAAoIBAQC2SKo/HMFZeBml1AF3XijzrxrfQXdJzjePBZAbdxqKR1Mc6juRHXij6HXYPjlAk01BhF1S3Ll4Lwi0cAHhggf457sMg55UWyeGKeUv0ucgvCpBwlR5cQ020i0MgzjPWOLWq1rtvSbNcAi2ZEVn6+Q2EcHo3wUvWRtLeKz+DZSZfw2PEDC+DGPJPl7f8g7zl56YymmmzH9liZLNrzg/qidokUv5u1pdGrcpLuPNeTODk0cqKB+OUbuKj9GShYECCEjaybJDl9276oalL9ghBtSeEv20kugatTvYy590wFlJkkvyl+nPxIH0EEYMKK9XRWlu9XYnoSfboiwcv8M3SlsjAgMBAAECggEAZtju/bcKvKFPz0mkHiaJcpycy9STKphorpCT83srBVQi59CdFU6Mj+aL/xt0kCPMVigJw8P3/YCEJ9J+rS8BsoWE+xWUEsJvtXoT7vzPHaAtM3ci1HZd302Mz1+GgS8Epdx+7F5p80XAFLDUnELzOzKftvWGZmWfSeDnslwVONkL/1VAzwKy7Ce6hk4SxRE7l2NE2OklSHOzCGU1f78ZzVYKSnS5Ag9YrGjOAmTOXDbKNKN/qIorAQ1bovzGoCwx3iGIatQKFOxyVCyO1PsJYT7JO+kZbhBWRRE+L7l+ppPER9bdLFxs1t5CrKc078h+wuUr05S1P1JjXk68pk3+kQKBgQDeK8AR11373Mzib6uzpjGzgNRMzdYNuExWjxyxAzz53NAR7zrPHvXvfIqjDScLJ4NcRO2TddhXAfZoOPVH5k4PJHKLBPKuXZpWlookCAyENY7+Pd55S8r+a+MusrMagYNljb5WbVTgN8cgdpim9lbbIFlpN6SZaVjLQL3J8TWH6wKBgQDSChzItkqWX11CNstJ9zJyUE20I7LrpyBJNgG1gtvz3ZMUQCn3PxxHtQzN9n1P0mSSYs+jBKPuoSyYLt1wwe10/lpgL4rkKWU3/m1Myt0tveJ9WcqHh6tzcAbb/fXpUFT/o4SWDimWkPkuCb+8j//2yiXk0a/T2f36zKMuZvujqQKBgC6B7BAQDG2H2B/ijofp12ejJU36nL98gAZyqOfpLJ+FeMz4TlBDQ+phIMhnHXA5UkdDapQ+zA3SrFk+6yGk9Vw4Hf46B+82SvOrSbmnMa+PYqKYIvUzR4gg34rL/7AhwnbEyD5hXq4dHwMNsIDq+l2elPjwm/U9V0gdAl2+r50HAoGALtsKqMvhv8HucAMBPrLikhXP/8um8mMKFMrzfqZ+otxfHzlhI0L08Bo3jQrb0Z7ByNY6M8epOmbCKADsbWcVre/AAY0ZkuSZK/CaOXNX/AhMKmKJh8qAOPRY02LIJRBCpfS4czEdnfUhYV/TYiFNnKRj57PPYZdTzUsxa/yVTmECgYBr7slQEjb5Onn5mZnGDh+72BxLNdgwBkhO0OCdpdISqk0F0Pxby22DFOKXZEpiyI9XYP1C8wPiJsShGm2yEwBPWXnrrZNWczaVuCbXHrZkWQogBDG3HGXNdU4MAWCyiYlyinIBpPpoAJZSzpGLmWbMWh28+RJS6AQX6KHrK1o2uw==',
  pubKey: 'CAASpgIwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQC2SKo/HMFZeBml1AF3XijzrxrfQXdJzjePBZAbdxqKR1Mc6juRHXij6HXYPjlAk01BhF1S3Ll4Lwi0cAHhggf457sMg55UWyeGKeUv0ucgvCpBwlR5cQ020i0MgzjPWOLWq1rtvSbNcAi2ZEVn6+Q2EcHo3wUvWRtLeKz+DZSZfw2PEDC+DGPJPl7f8g7zl56YymmmzH9liZLNrzg/qidokUv5u1pdGrcpLuPNeTODk0cqKB+OUbuKj9GShYECCEjaybJDl9276oalL9ghBtSeEv20kugatTvYy590wFlJkkvyl+nPxIH0EEYMKK9XRWlu9XYnoSfboiwcv8M3SlsjAgMBAAE='
}

describe('cyclon-peer', function () {
  this.timeout(20000)
  const AliceId = PeerId.createFromPrivKey(alice.privKey)
  const Bob = new CyclonPeer({peers: [new PeerInfo(PeerId.createFromB58String(AliceId.toB58String()))]})

  it('create with bootstrap peers', (done) => {
    const Alice = new CyclonPeer({me: new PeerInfo(AliceId)})
    expect(Alice).to.exist
    expect(Bob).to.exist
    expect(Bob.peers).to.have.lengthOf(1)
    expect(Object.keys(Bob.peers.peers)[0]).to.eql(Bob.peers.peerToId(Alice.me))
    expect(Bob.peers.get(Alice.me)).to.exist
    done()
  })

  it('add peers to peer set', (done) => {
    const Alice = new CyclonPeer({me: new PeerInfo(AliceId)})
    Alice.addPeers([Bob.me])
    expect(Alice.peers).to.have.lengthOf(1)
    expect(Alice.peers.get(Bob.me)).to.exist
    expect(Alice.peers.peers[Alice.peers.peerToId(Bob.me)]).to.exist
    done()
  })

  it('adding a peer emits an event', (done) => {
    const Alice = new CyclonPeer({me: new PeerInfo(AliceId)})
    Alice.peers.on('add', (peer) => {
      expect(peer).to.exist
      expect(Alice.peers.peerToId(peer)).to.eql(Alice.peers.peerToId(Bob.me))
      done()
    })
    Alice.addPeers([Bob.me])
  })

  it('adding a peer emits a connect event', (done) => {
    const Alice = new CyclonPeer({me: new PeerInfo(AliceId)})
    parallel([
      Bob.listen.bind(Bob),
      Alice.listen.bind(Alice)
    ], (err) => {
      if (err) return done(err)

      Alice.addPeers([Bob.me])
      Alice.on('peer-connect', (peer) => {
        expect(peer).to.exist
        expect(Alice.peers.peerToId(peer)).to.eql(Alice.peers.peerToId(Bob.me))

        // close standing connection
        peer.conn.end()
        parallel([
          Bob.close.bind(Bob),
          Alice.close.bind(Alice)
        ], done)
      })
    })
  })

  it('removing a peer emits an event', (done) => {
    const Alice = new CyclonPeer({me: new PeerInfo(AliceId)})
    Alice.addPeers([Bob.me])
    Alice.peers.on('remove', (peer) => {
      expect(peer).to.exist
      expect(Alice.peers.peerToId(peer)).to.eql(Alice.peers.peerToId(Bob.me))
      expect(Alice.peers).to.have.lengthOf(0)
      done()
    })
    Alice.peers.remove(Bob.me)
  })

  describe('listen', () => {
    const Alice = new CyclonPeer({me: new PeerInfo(AliceId)})

    it('starts listening on a tcp port', (done) => {
      Alice.listen((err) => {
        expect(err).to.not.exist
        Alice.close(() => {
          done()
        })
      })
    })

    it('starts listening on the /cyclon/x.y.z protocol', (done) => {
      const Alice = new CyclonPeer({me: new PeerInfo(AliceId)})
      parallel([
        Alice.listen.bind(Alice),
        Bob.listen.bind(Bob)
      ], (err) => {
        expect(err).to.not.exist
        Alice.swarm.dial(Bob.me, '/cyclon/0.1.0', (err, conn) => {
          expect(err).to.not.exist
          expect(conn).to.exist
          conn.end()
          parallel([
            Bob.close.bind(Bob),
            Alice.close.bind(Alice)
          ], () => {
            done()
          })
        })
      })
    })
  })
})
