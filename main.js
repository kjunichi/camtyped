const net = require('net')

const ffi = require('ffi-napi')
const ref = require('ref-napi')
const StructType = require('ref-struct-di')(ref)
const fs = require('fs')

const c_int = ref.types.int
const c_uchar = ref.types.uchar
const c_void = ref.types.void

const ImgBufferVal = StructType({
    ptr: ref.refType(c_uchar),
    size: c_int,
    raw: ref.refType(c_void)
})
const ImgBufferPtr = ref.refType(ImgBufferVal)

const libwebcamrs = ffi.Library('libwebcamrs', {
    'named_window': ['void', ['string']],
    'video_capture': ['pointer', ['int']],
    'destroy_all_windows': ['void', []],
    'read': ['void', ['pointer', 'pointer']],
    'imshow': ['void', ['string', 'pointer']],
    'wait_key': ['int', ['int']],
    'release_video_capture': ['void', ['pointer']],
    'create_mat': ['pointer', []],
    'imwrite': ['int', ['string', 'pointer']],
    'mat_cols': ['int', ['pointer']],
    'mat_data': ['pointer', ['pointer']],
    'imencode': [ImgBufferPtr, ['string', 'pointer', 'pointer']],
    'free_img_buffer': ['void', ['pointer']]
})

const snap = (conn) => {
    const putImage = (conn, data) => {
        //console.dir(data)
        conn.write(data, () => {
            conn.end()
        })
    }

    //libwebcamrs.named_window('camtyped')
    const cap = libwebcamrs.video_capture(0)
    let frame = libwebcamrs.create_mat()
    setTimeout(() => {
        libwebcamrs.read(cap, frame)
        //libwebcamrs.imshow('camtyped', frame)
        // const c = libwebcamrs.wait_key(20)
        // if (c == 0x20) {
        //     libwebcamrs.imwrite('snap.jpg', frame)
        const buf = libwebcamrs.imencode('.ppm', frame, ref.NULL)
        //     //console.dir(buf.deref().size)
        const imgbuf = buf.deref()
        const data = ref.reinterpret(imgbuf.ptr, imgbuf.size)
        //     //console.dir(data)

        putImage(conn, data)
        // }
        // if (c == 0x1b) {
        //     break
        // }
        libwebcamrs.release_video_capture(cap)
        //libwebcamrs.destroy_all_windows()
        //conn.end()
    }, 2000)
}

const server = net.createServer((conn) => {
    console.log('server-> tcp server created')

    conn.on('data', (data) => {
        console.log('server-> ' + data + ' from ' + conn.remoteAddress + ':' + conn.remotePort);
        conn.write('server -> Repeating: ' + data)
    })

    conn.on('close', () => {
        console.log('server-> client closed connection')
    })

    snap(conn)

}).listen(3000)

console.log('listening on port 3000')