const http = require('http');
const { TextDecoder } = require('util');

// Tạo máy chủ HTTP
const server = http.createServer((req, res) => {
  // Xử lý yêu cầu HTTP nếu cần
  // Ví dụ: Gửi trang HTML đơn giản cho client nếu truy cập trang chủ
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<h1>WebSocket Server</h1>');
});

// Lắng nghe cổng 8080 (hoặc cổng khác nếu bạn muốn)
server.listen(8080, () => {
  console.log('Máy chủ HTTP 8080...');
});

// Mảng lưu trữ tất cả các kết nối WebSocket đã kết nối
const clients = [];
let connectionCounter = 0;
function send_all_clients(data){
  clients.forEach((socket)=>{
    socket.write(encodeFrame(data))
  })
}


// Mở kết nối TCP trực tiếp để lắng nghe các yêu cầu WebSocket
server.on('upgrade', (req, socket) => {
  if (req.headers['upgrade'] !== 'websocket') {
    socket.end('HTTP/1.1 400 Bad Request');
    return;
  }
  // Tiến hành bắt tay (handshake) để thiết lập kết nối WebSocket
  const acceptKey = req.headers['sec-websocket-key'];
  const hash = generateAcceptValue(acceptKey);
  const responseHeaders = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${hash}`
  ];

  
  socket.write(responseHeaders.join('\r\n') + '\r\n\r\n');
  // Tiến hành xử lý kết nối WebSocket
  handleWebSocketConnection(socket);
});


// Xử lý kết nối WebSocket
function handleWebSocketConnection(socket) {
  const connectionId = ++connectionCounter;
  socket.connectionId = connectionId;
  console.log(`ID:${connectionId} kết nối thành công`)
  clients.push(socket);

  socket.on('data', (data) => {
    // Xử lý dữ liệu nhận từ client
    // Gửi dữ liệu đáp trả về client
    const response = socket.connectionId + ' : ' + decode(data);
    send_all_clients(response)
    socket.end()
  });
//(1-fin-end)(000)(0001-utf-8) (1-mark-encode)(0000001-payload-len) 1101100 10010011 11000111 11100100 1101 

  socket.on('close', (a,b) => {
    // Xử lý khi client đóng kết nối
    connectionCounter--
    

    // Loại bỏ socket khỏi mảng lưu trữ clients
    const index = clients.indexOf(socket);
    if (index !== -1) {
      clients.splice(index, 1);
    }
    console.log(a,b)
  });

  socket.on('error', (error) => {
    console.log('Lỗi kết nối: ', error.message);
  });

}

// Hàm hỗ trợ sinh giá trị "Sec-WebSocket-Accept"
function generateAcceptValue(acceptKey) {
  const crypto = require('crypto');
  return crypto
    .createHash('sha1')
    .update(acceptKey + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11', 'binary')
    .digest('base64');
}

// Hàm hỗ trợ mã hóa frame để gửi cho client
function encodeFrame(str) {
  const utf8Encoder = new TextEncoder();
  const utf8Bytes = utf8Encoder.encode(str);
  const length = utf8Bytes.length;

  const lengthByte = length <= 125 ? length : 126;
  const lengthBytes = lengthByte === 126 ? [0, length] : [];
  const buffer = Buffer.alloc(length + 2 + lengthBytes.length);
  buffer.writeUInt8(129, 0);
  buffer.writeUInt8(lengthByte, 1);

  let offset = 2;
  lengthBytes.forEach((byte) => {
    buffer.writeUInt8(byte, offset);
    offset += 1;
  });

  buffer.write(str, offset);
  return buffer;
}

function decode(buffer){
  const startIndex = 2;
  const endIndex = 5;
  const mark = buffer.slice(startIndex, endIndex + 1); // endIndex + 1 vì endIndex là chỉ số cuối cùng được bao gồm
  const encoded = buffer.slice(endIndex+1)
  const DECODED = Uint8Array.from(encoded, (elt, i) => elt ^ mark[i % 4]);
  const utf8String = new TextDecoder().decode(DECODED);
  return utf8String
}
