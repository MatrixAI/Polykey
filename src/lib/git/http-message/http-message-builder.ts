import net from 'net'

class HttpMessageBuilder {
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
  private endString: string = '0\r\n\r\n'

  constructor(
    socket: net.Socket
  ) {
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
    headerResponse += `${this.httpVersion} ${this.statusCode} ${this.statusMessages[this.statusCode]}\n`
    for (const [key, value] of this.headers) {
      headerResponse += `${key}: ${value}\n`
    }
    if (totalContentLength || totalContentLength == 0) {
      headerResponse += `Content-Length: ${totalContentLength.toString(16)}\n`
      headerResponse += `\n`
    } else {
      headerResponse += `Transfer-Encoding: chunked\n`
      headerResponse += `\n`
    }

    this.headersSent = true
    return headerResponse
  }

  write(chunk: string) {
    let response: string = ''

    if (!this.headersSent) {
      response += this.getHeaders()
    }

    response += `${chunk.length.toString(16)}\r\n`
    response += `${chunk}\r\n`

    this.socket.write(Buffer.from(response))
  }


  end(reason: string = '') {
    let response: string = ''

    if (!this.headersSent) {
      response += this.getHeaders(reason.length)
    }

    response += reason
    response += this.endString

    this.socket.write(Buffer.from(response))
  }
}

export default HttpMessageBuilder


// async function main() {
//   const message = new HttpMessageBuilder()
//   console.log(message.build().toString());


// }

// main()
