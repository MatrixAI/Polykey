import net from 'net'
import http from 'http'
import { Address } from '@polykey/peers/PeerInfo'

function fromNodeStream(stream) {
  let ended = false
  const queue: Buffer[] = []
  let defer: any = {}
  stream.on('data', (chunk: Buffer) => {
    queue.push(chunk)
    if (defer.resolve) {
      defer.resolve({ value: queue.shift(), done: false })
      defer = {}
    }
  })
  stream.on('error', err => {
    if (defer.reject) {
      defer.reject(err)
      defer = {}
    }
  })
  stream.on('end', () => {
    ended = true
    if (defer.resolve) {
      defer.resolve({ done: true })
      defer = {}
    }
  })
  return {
    next(): Promise<any> {
      return new Promise((resolve, reject) => {
        if (queue.length === 0 && ended) {
          return resolve({ done: true })
        } else if (queue.length > 0) {
          return resolve({ value: queue.shift(), done: false })
        } else if (queue.length === 0 && !ended) {
          defer = { resolve, reject }
        }
      })
    },
  }
}
function httpRequest(getSocket: (address: Address) => net.Socket, address: Address) {
  return {
    async request ({
      url,
      method,
      headers,
      body,
      onProgress
    }) {
      return new Promise<any>((resolve, reject) => {
        const { pathname, search } = new URL(url)
        const options: http.RequestOptions = {
          path: pathname+search,
          headers: headers,
          method: method,
          createConnection: () => {
            const socket = getSocket(address)
            socket.on('data', data => {
              console.log('heyyy');
              console.log(data.toString());
              console.log('heyyy');

            })
            return socket
          }
        };
        const req = http.request(options, (res) => {
          const iter = fromNodeStream(res)
          resolve({
            url: res.url,
            method: res.method,
            statusCode: res.statusCode,
            statusMessage: res.statusMessage,
            body: iter,
            headers: res.headers
          })
        })
        if (body) {
          for (const buffer of body) {
            req.write(buffer)
          }
        }
        req.end()
      })
    }
  }
}

export default httpRequest
