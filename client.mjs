import { createConnection } from 'net'
import Canvas from 'canvas'
import ac from 'ansi-canvas'
import fs from 'fs'

const Image = Canvas.Image

const putImage = (cs) => {
    const canvas = ac();
    const context = canvas.getContext('2d');

    const img = new Image
    img.src = cs.toBuffer()

    //console.log(`w,h = ${cs.width}, ${cs.height}`)

    context.drawImage(img,0,0,canvas.width,canvas.height)
    canvas.render()
}

const genImage = (imbuf, w, h) => {
    const canvas = new Canvas(w, h)
    const ctx = canvas.getContext('2d')
    const imagedata = ctx.getImageData(0, 0, w, h)
    console.log(`imagedata w,h = ${imagedata.width}, ${imagedata.height}`)
    let pidx = 0
    for (let y = 0; y < imagedata.height; y++) {
        for (let x = 0; x < imagedata.width; x++) {
            const index = (y * imagedata.width + x) * 4
            imagedata.data[index] = imbuf[pidx++] // R
            imagedata.data[index + 1] = imbuf[pidx++] // G
            imagedata.data[index + 2] = imbuf[pidx++] // B
            imagedata.data[index + 3] = 255 // alpha
            //console.log(`${imbuf[pidx]}`)

        }
    }
    ctx.putImageData(imagedata, 0, 0)
    //console.log(`pidx = ${pidx}`)
    //console.log(`imagedata w,h = ${imagedata.width}, ${imagedata.height}`)
    const out = fs.createWriteStream('./cam1.png')
    const stream = canvas.pngStream()

    stream.on('data', (chunk) => {
        out.write(chunk)
    })

    stream.on('end', () => {
        console.log('saved png')
    })

    return canvas
}

const parsePpm = (data) => {
    const readLine = (buf2, len) => {
        let pos = 0
        const strbuf = []

        while (pos < len) {
            if (buf2[pos] === 0x0a) {
                //console.log(`pos = ${pos}`)
                return strbuf.join('')
            }
            strbuf.push(String.fromCharCode(buf2[pos]))
            pos++
        }
        return data.toString()
    }

    let len = data.length
    const line1 = readLine(data, len)
    console.log(`line1 = ${line1},${line1.length}`)
    let data2 = data.slice(line1.length + 1)
    len = len - line1.length - 1
    const line2 = readLine(data2, len)
    console.log(`line2 = ${line2}`)
    data2 = data2.slice(line2.length + 1)
    len = len - line2.length - 1
    const line3 = readLine(data2, len)
    console.log(`line3 = ${line3}`)
    const [w, h] = line3.split(' ')

    len = len - line3.length - 1
    data2 = data2.slice(line3.length + 1)
    const line4 = readLine(data2, len)
    console.log(`line4 = ${line4}`)
    len = len - line4.length - 1
    data2 = data2.slice(line4.length + 1)
    console.log(`imgbuf len = ${data2.length}`)
    const cs = genImage(data2, w | 0, h | 0)
    putImage(cs)
}

const client = createConnection({ port: 3000 }, () => {
    // 'connect' listener
    console.error('connected to server!')
})

const buf = []
let buf_len = 0

client.on('data', (data) => {
    buf.push(data)
    buf_len += data.length
    //console.log(data.toString());
})

client.on('end', () => {
    console.log(`buf_len = ${buf_len}`)
    const imgBuf = Buffer.alloc(buf_len)
    let idx = 0
    for (let i = 0; i < buf.length; i++) {
        const tb = buf[i]
        for (let j = 0; j < tb.length; j++) {
            imgBuf.writeUInt8(tb[j], idx++)
        }
    }
    fs.writeFileSync('te.ppm', imgBuf)
    parsePpm(imgBuf)
    console.error('disconnected from server')
})
