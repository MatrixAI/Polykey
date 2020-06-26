// import GitClient from '@polykey/git/GitClient'

// // function iterFromData(data: Buffer) {
// //   let ended = false
// //   return {
// //     next(): Promise<any> {
// //       return new Promise((resolve, reject) => {
// //         if (ended) {
// //           return resolve({ done: true })
// //         } else {
// //           ended = true
// //           resolve({ value: data, done: false })
// //         }
// //       })
// //     },
// //   }
// // }
// class HttpRequest {
//   gitClient: GitClient

//   constructor(
//     gitClient: GitClient
//   ) {
//     this.gitClient = gitClient
//   }

//   async request({
//     url,
//     method,
//     headers,
//     body,
//     onProgress
//   }) {
//     return new Promise<any>(async (resolve, reject) => {
//       const u = new URL(url)

//       // Parse request
//       if (method == 'GET') {
//         // Info request
//         const match = u.pathname.match(/\/(.+)\/info\/refs$/)
//         if (!match || /\.\./.test(match[1])) {
//           reject(new Error('Error'))
//         }

//         const vaultName = match![1]

//         const infoResponse = await this.gitClient.requestInfo(vaultName)

//         resolve({
//           url: url,
//           method: method,
//           statusCode: 200,
//           statusMessage: 'OK',
//           body: this.iterFromData(infoResponse),
//           headers: headers
//         })
//       } else if (method == 'POST') {
//         // Info request
//         const match = u.pathname.match(/\/(.+)\/git-(.+)/)
//         if (!match || /\.\./.test(match[1])) {
//           reject(new Error('Error'))
//         }

//         const vaultName = match![1]

//         const packResponse = await this.gitClient.requestPack(vaultName, body[0])

//         resolve({
//           url: url,
//           method: method,
//           statusCode: 200,
//           statusMessage: 'OK',
//           body: this.iterFromData(packResponse),
//           headers: headers
//         })
//       } else {
//         reject(new Error('Method not supported'))
//       }
//     })
//   }

//   private iterFromData(data: Buffer) {
//     let ended = false
//     return {
//       next(): Promise<any> {
//         return new Promise((resolve, reject) => {
//           if (ended) {
//             return resolve({ done: true })
//           } else {
//             ended = true
//             resolve({ value: data, done: false })
//           }
//         })
//       },
//     }
//   }
// }
// // function httpRequest(connection: GitClient) {
// //   return {
// //     async request({
// //       url,
// //       method,
// //       headers,
// //       body,
// //       onProgress
// //     }) {
// //       return new Promise<any>(async (resolve, reject) => {
// //         const u = new URL(url)

// //         // Parse request
// //         if (method == 'GET') {
// //           // Info request
// //           const match = u.pathname.match(/\/(.+)\/info\/refs$/)
// //           if (!match || /\.\./.test(match[1])) {
// //             reject(new Error('Error'))
// //           }

// //           const vaultName = match![1]

// //           const infoResponse = await connection.requestInfo(vaultName)

// //           resolve({
// //             url: url,
// //             method: method,
// //             statusCode: 200,
// //             statusMessage: 'OK',
// //             body: iterFromData(infoResponse),
// //             headers: headers
// //           })
// //         } else if (method == 'POST') {
// //           // Info request
// //           const match = u.pathname.match(/\/(.+)\/git-(.+)/)
// //           if (!match || /\.\./.test(match[1])) {
// //             reject(new Error('Error'))
// //           }

// //           const vaultName = match![1]

// //           const packResponse = await connection.requestPack(vaultName, body[0])

// //           resolve({
// //             url: url,
// //             method: method,
// //             statusCode: 200,
// //             statusMessage: 'OK',
// //             body: iterFromData(packResponse),
// //             headers: headers
// //           })
// //         } else {
// //           reject(new Error('Method not supported'))
// //         }
// //       })
// //     }
// //   }
// // }

// export default HttpRequest
