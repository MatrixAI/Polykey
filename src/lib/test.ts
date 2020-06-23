import jsonfile from 'jsonfile'
import fs from 'fs'

async function main() {
  const data = new Map<string, Buffer>()
  data.set('1', Buffer.from('1 ahahah'))
  data.set('2', Buffer.from('2 ahahah'))


  const metadata = JSON.stringify([...data])
  console.log(data);


  fs.writeFileSync("metadata", metadata)


  const readMD = fs.readFileSync('metadata')
  const readMap = new Map<string, Buffer>()
  for (const [key, value] of new Map<string, any>(JSON.parse(readMD.toString()))) {
    readMap[key] = Buffer.from(value)
  }
  console.log(readMap['1']);


}

main()
