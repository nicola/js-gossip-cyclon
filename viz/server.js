const app = require('express')()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const CyclonPeer = require('../src')
const path = require('path')

server.listen(8080)

app.get('/', (req, res) => {
  const location = path.resolve(__dirname, 'index.html')
  res.sendfile(location)
})
app.get('/app.css', (req, res) => {
  res.header('Content-Type', 'text/css')
  res.sendfile(path.resolve(__dirname, 'app.css'))
})

app.get('/app.js', (req, res) => {
  res.header('Content-Type', 'application/javascript')
  res.sendfile(path.resolve(__dirname, 'app.js'))
})

const bootstrapPeer = new CyclonPeer({interval: 1000, maxPeers: 3, maxShuffle: 2})
const network = {}
network[toId(bootstrapPeer.peer)] = bootstrapPeer

bootstrapPeer.listen(() => {
  bootstrapPeer.start()
  io.on('connection', function (socket) {
    sendNetwork(socket)
    socket.on('new-shuffle', function (shuffle) {
      network[shuffle].shuffle()
    })
    socket.on('new-peer', function () {
      console.log('new-peer!')
      const peer = new CyclonPeer({peers: [bootstrapPeer.peer], interval: 1000, maxPeers: 3, maxShuffle: 2})
      const peerId = toId(peer.peer)
      peer.listen(() => {
        socket.emit('peer', {id: toId(peer.peer)})
        peer.partialView.on('add', (added) => socket.emit('add', peerId, toId(added)))
        peer.partialView.on('remove', (removed) => socket.emit('remove', peerId, removed))
        peer.partialView.on('update', (added) => socket.emit('update', peerId, toId(added)))
        peer.start()
      })
      network[toId(peer.peer)] = peer
    })
  })
})

function sendNetwork (socket) {
  return Object.keys(network).forEach(peer => {
    const partialView = network[peer].partialView
      .getAll()
      .map(peer => {
        return {
          age: peer.age,
          id: toId(peer)
        }
      })

    socket.emit('peer', {
      partialView: partialView,
      id: peer
    })
    network[peer].partialView.on('add', (added) => socket.emit('add', peer, toId(added)))
    network[peer].partialView.on('remove', (removed) => socket.emit('remove', peer, removed))
    network[peer].partialView.on('update', (added) => socket.emit('update', peer, toId(added)))
  })
}

function toId (peer) {
  return peer.id.toB58String().substr(2, 10)
}
