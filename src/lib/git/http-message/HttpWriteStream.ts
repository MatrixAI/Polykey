import net from 'net'
import { Writable } from 'stream'

class HttpWriteStream extends Writable {
  private httpVersion: string = 'HTTP/1.1'
  statusCode: number = 200

  // Headers
  private headersSent: boolean = false
  private headers: Map<string, string> = new Map()

  // Internal stuff
  private socket: net.Socket
  private statusMessages = {
    200: 'OK',
    400: 'Bad Request',
    404: 'Not Found',
    405: 'Method Not Allowed',
  }
  private endString: string = `${(0).toString(16)}\r\n\r\n`

  constructor(
    socket: net.Socket
  ) {
    super()
    this.socket = socket
  }

  setHeader(name: string, value: string) {
    this.headers.set(name, value)
  }

  private getHeaders(totalContentLength?: number): string {
    if (this.headersSent) {
      throw new Error("Headers have already been sent to client")
    }

    let headerResponse = ''
    headerResponse += `${this.httpVersion} ${this.statusCode} ${this.statusMessages[this.statusCode]}\r\n`
    for (const [key, value] of this.headers) {
      headerResponse += `${key}: ${value}\r\n`
    }
    // Add date
    headerResponse += `Date: ${'Thu, 25 Jun 2020 04:50:37 GMT'}\r\n`

    if (totalContentLength || totalContentLength == 0) {
      headerResponse += `Content-Length: ${totalContentLength.toString(16)}\r\n`
      headerResponse += `\r\n`
    } else {
      headerResponse += `Transfer-Encoding: chunked\r\n`
      headerResponse += `\r\n`
    }

    this.headersSent = true
    return headerResponse
  }

  _write(chunk: any, encoding?: string, callback?: any) {
    let response: Buffer[] = []

    if (!this.headersSent) {
      response.push(Buffer.from(this.getHeaders()))
    }

    response.push(Buffer.from(`${chunk.length.toString(16)}\r\n`))
    if (typeof chunk == 'string') {
      response.push(Buffer.from(`${chunk}\r\n`))
    } else {
      response.push(chunk)
      response.push(Buffer.from('\r\n'))
    }

    this.socket.write(Buffer.concat(response))
  }

  write(chunk: any, callback?: any): boolean {
    this._write(chunk)
    return true
  }


  _end(chunk?: any) {
    let response: string = ''

    if (!this.headersSent) {
      response += this.getHeaders(chunk.length)
    }

    if (chunk) {
      if (typeof chunk == 'string') {
        response += `${chunk}\r\n`
      } else {
        response += `${chunk.toString()}\r\n`
      }
    }
    response += this.endString

    this.socket.write(Buffer.from(response))
  }

  end(chunk?: any, callback?: any) {
    this._end(chunk)
  }
}

export default HttpWriteStream
