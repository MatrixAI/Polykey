class HttpMessageParser {
  // First line
  method: string
  url: string
  httpVersion: string

  // Headers
  headers: Map<string, string> = new Map()

  // Body
  body?: Buffer

  constructor(raw: Buffer) {
    const rawString = raw.toString()
    const lines = rawString.split('\n')

    // Handle first line
    const firstLineComponents = lines.shift()?.split(' ') ?? []
    const method = firstLineComponents.shift() ?? null
    if (method) {
      this.method = method
    }
    const url = firstLineComponents.shift() ?? null
    if (url) {
      this.url = url
    }
    const httpVersion = firstLineComponents.shift() ?? null
    if (httpVersion) {
      this.httpVersion = httpVersion
    }

    // Handle headers
    let header: string | undefined = lines.shift()
    while (header && header !== '') {
      // Deal with header
      const [key, value] = header.split(': ')
      this.headers.set(key, value)
      // Go to next header
      header = lines.shift()
    }

    // Handle body
    // Handle messages with content-length header
    if (this.headers.has('Content-Length')) {
      let bodyString = ''
      let bodyLine: string | undefined = lines.shift()
      while (bodyLine && bodyLine !== '') {
        console.log(bodyLine);

        bodyString += `${bodyLine}\n`
        // Go to next header
        bodyLine = lines.shift()
      }
      this.body = Buffer.from(bodyString)
    }
    //  else if (this.headers.has('Transfer-Encoding')) {
    //   // Handle chunked transfer coding
    //   let bodyString = ''
    //   let bodyLine: string | undefined = lines.shift()
    //   while (bodyLine && bodyLine !== '') {
    //     console.log(bodyLine);

    //     bodyString += `${bodyLine}\n`
    //     // Go to next header
    //     bodyLine = lines.shift()
    //   }
    //   this.body = Buffer.from(bodyString)
    // }
  }
}

export default HttpMessageParser

// async function main() {
//   const raw = 'GET /Vault-nonzp/info/refs?service=git-upload-pack HTTP/1.1\n'+
//   'Host: localhost:80\r\n'+
//   'Connection: close\n'+
//   'Content-Length: 10\n'+
//   '\n'+
//   '005fwant 5274348048b9fb1aa85c778d382fd14fe1d26401 side-band-64k agent=git/isomorphic-git@1.5.0\n'+
//   '00000032have 5274348048b9fb1aa85c778d382fd14fe1d26401\n'+
//   '0009done\n'

//   const message = new HttpMessageParser(Buffer.from(raw))
//   console.log(message.body?.toString());


// }

// main()
